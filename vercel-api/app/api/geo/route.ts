// app/api/geo/route.ts - 지리 정보 API (네이버 연동)
import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '../../../lib/monitoring';

export const runtime = 'edge';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

interface NaverLocalItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// GET: 특정 위치 주변 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'competitors'; // competitors, apartments, news
    const query = searchParams.get('query') || '대치동 학원';
    const display = parseInt(searchParams.get('display') || '10');

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Naver API credentials not configured',
        demo_mode: true,
        data: getDemoData(type)
      }, { status: 200, headers: corsHeaders });
    }

    let result;
    
    if (type === 'news') {
      result = await searchNews(query, display);
    } else {
      result = await searchLocal(query, display);
    }

    return NextResponse.json({
      success: true,
      type,
      query,
      data: result
    }, { status: 200, headers: corsHeaders });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'geo.GET' });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: 전략 분석 요청
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { center_lat, center_lng, radius_km = 2, academy_name } = body;

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return NextResponse.json({
        success: true,
        demo_mode: true,
        data: getStrategicAnalysis(academy_name || '우리학원')
      }, { status: 200, headers: corsHeaders });
    }

    // 1. 경쟁사 검색
    const competitors = await searchLocal(`${academy_name || '대치동'} 학원`, 20);
    
    // 2. 아파트 단지 검색
    const apartments = await searchLocal(`${academy_name || '대치동'} 아파트`, 20);
    
    // 3. 교육 뉴스 검색
    const news = await searchNews('교육 정책 입시', 10);

    // 4. 전략 분석
    const analysis = analyzeStrategicData(competitors, apartments, news);

    return NextResponse.json({
      success: true,
      data: {
        center: { lat: center_lat, lng: center_lng },
        radius_km,
        competitors: competitors.slice(0, 10),
        customer_zones: apartments.slice(0, 10),
        news: news.slice(0, 5),
        analysis
      }
    }, { status: 200, headers: corsHeaders });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureError(error, { context: 'geo.POST' });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 네이버 지역 검색
async function searchLocal(query: string, display: number): Promise<any[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodedQuery}&display=${display}`;
  
  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET!,
    },
  });

  const data = await response.json();
  
  if (data.errorCode) {
    throw new Error(data.errorMessage);
  }

  return (data.items || []).map((item: NaverLocalItem) => ({
    name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
    category: item.category,
    address: item.roadAddress || item.address,
    lat: parseFloat(item.mapy) / 10000000,
    lng: parseFloat(item.mapx) / 10000000,
    link: item.link,
    telephone: item.telephone,
    type: categorizePlace(item.category)
  }));
}

// 네이버 뉴스 검색
async function searchNews(query: string, display: number): Promise<any[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodedQuery}&display=${display}&sort=date`;
  
  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID!,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET!,
    },
  });

  const data = await response.json();
  
  if (data.errorCode) {
    throw new Error(data.errorMessage);
  }

  return (data.items || []).map((item: NaverNewsItem) => ({
    title: item.title.replace(/<[^>]*>/g, ''),
    description: item.description.replace(/<[^>]*>/g, ''),
    link: item.originallink || item.link,
    pubDate: item.pubDate,
    category: categorizeNews(item.title + item.description)
  }));
}

// 장소 유형 분류
function categorizePlace(category: string): string {
  if (category.includes('학원') || category.includes('교육')) return 'competitor';
  if (category.includes('아파트') || category.includes('주거')) return 'customer_zone';
  if (category.includes('학교')) return 'school';
  return 'other';
}

// 뉴스 카테고리 분류
function categorizeNews(text: string): string {
  if (text.includes('입시') || text.includes('수능') || text.includes('대학')) return 'entrance_exam';
  if (text.includes('정책') || text.includes('교육부') || text.includes('교육청')) return 'policy';
  if (text.includes('학원') || text.includes('사교육')) return 'private_education';
  return 'general';
}

// 전략 분석
function analyzeStrategicData(competitors: Array<Record<string, unknown>>, apartments: Array<Record<string, unknown>>, news: Array<Record<string, unknown>>) {
  const competitorCount = competitors.length;
  const avgCompetitorDensity = competitorCount / 4; // 2km 반경 기준
  
  const threatLevel = competitorCount > 15 ? 'high' : competitorCount > 8 ? 'medium' : 'low';
  const opportunityScore = apartments.length * 0.1;
  
  const policyNews = news.filter(n => n.category === 'policy');
  const entranceNews = news.filter(n => n.category === 'entrance_exam');

  return {
    threat_level: threatLevel,
    competitor_count: competitorCount,
    opportunity_score: Math.min(1, opportunityScore).toFixed(2),
    customer_zone_count: apartments.length,
    recent_policy_changes: policyNews.length,
    entrance_exam_updates: entranceNews.length,
    recommendations: generateRecommendations(threatLevel, apartments.length, policyNews.length)
  };
}

// AI 추천 생성
function generateRecommendations(threatLevel: string, customerZones: number, policyChanges: number): string[] {
  const recommendations: string[] = [];
  
  if (threatLevel === 'high') {
    recommendations.push('⚠️ 경쟁 밀집 지역 - 차별화 전략 필요');
    recommendations.push('💡 틈새 과목(코딩, 논술) 특화 고려');
  }
  
  if (customerZones > 5) {
    recommendations.push('🏠 주변 대형 아파트 단지 다수 - 셔틀버스 노선 확장 권장');
  }
  
  if (policyChanges > 0) {
    recommendations.push('📋 최근 교육 정책 변화 감지 - 학부모 설명회 개최 권장');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ 현재 전략적 위치 양호');
  }
  
  return recommendations;
}

// 데모 데이터
function getDemoData(type: string) {
  if (type === 'news') {
    return [
      { title: '2026학년도 수능 변경사항 발표', category: 'entrance_exam', pubDate: new Date().toISOString() },
      { title: '교육부, 사교육비 경감 대책 발표', category: 'policy', pubDate: new Date().toISOString() },
    ];
  }
  
  return [
    { name: '더킹고등수학전문학원', category: '수학교육', address: '강남구 역삼로 415', type: 'competitor', lat: 37.501, lng: 127.052 },
    { name: '짱솔학원', category: '수학교육', address: '강남구 남부순환로 2935', type: 'competitor', lat: 37.494, lng: 127.061 },
    { name: '대치아이파크', category: '아파트', address: '강남구 대치동', type: 'customer_zone', lat: 37.499, lng: 127.057 },
  ];
}

function getStrategicAnalysis(academyName: string) {
  return {
    center: { lat: 37.4994, lng: 127.0569 },
    radius_km: 2,
    competitors: [
      { name: '더킹고등수학전문학원', type: 'competitor', lat: 37.501, lng: 127.052, threat_score: 0.7 },
      { name: '짱솔학원', type: 'competitor', lat: 37.494, lng: 127.061, threat_score: 0.5 },
    ],
    customer_zones: [
      { name: '대치아이파크', type: 'customer_zone', lat: 37.499, lng: 127.057, potential_v: 0.8 },
      { name: '래미안대치팰리스', type: 'customer_zone', lat: 37.497, lng: 127.055, potential_v: 0.75 },
    ],
    news: [
      { title: '2026학년도 수능 변경사항', category: 'entrance_exam' },
    ],
    analysis: {
      threat_level: 'medium',
      competitor_count: 12,
      opportunity_score: '0.65',
      recommendations: [
        '💡 수학 특화 경쟁 심화 - 영어/국어 차별화 고려',
        '🏠 대치아이파크 셔틀 노선 추가 권장',
      ]
    }
  };
}
