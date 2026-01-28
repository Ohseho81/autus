// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 - 💓 심전도 API (Heartbeat)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import {
  successResponse,
  optionsResponse,
  serverErrorResponse,
} from '@/lib/api-utils';
import {
  generateHeartbeatTimeline,
  generateKeywordStats,
  generateVoiceBrief,
  generateResonance,
  generateCustomerBriefs,
  randomInt,
  randomChoice,
  formatDate,
} from '@/lib/mock-data';
import type { HeartbeatData, HeartbeatRhythm, VoiceBrief } from '@/lib/types-views';

// ─────────────────────────────────────────────────────────────────────
// GET /api/v1/heartbeat
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'external';
    
    switch (endpoint) {
      case 'external':
        return getExternalHeartbeat(searchParams);
      case 'voice':
        return getVoiceHeartbeat(searchParams);
      case 'resonance':
        return getResonance();
      case 'keywords':
        return getKeywords(searchParams);
      default:
        return getExternalHeartbeat(searchParams);
    }
  } catch (error) {
    return serverErrorResponse(error, 'Heartbeat API');
  }
}

export async function OPTIONS() {
  return optionsResponse();
}

// ─────────────────────────────────────────────────────────────────────
// External Heartbeat (외부 여론)
// ─────────────────────────────────────────────────────────────────────

function getExternalHeartbeat(params: URLSearchParams) {
  const period = params.get('period') || '7d';
  const hours = period === '30d' ? 720 : period === '1d' ? 24 : 168;
  
  const timeline = generateHeartbeatTimeline(hours);
  const maxIntensity = Math.max(...timeline.map(t => t.intensity));
  
  let rhythm: HeartbeatRhythm = 'normal';
  let rhythmLabel = '정상';
  
  if (maxIntensity > 90) {
    rhythm = 'critical';
    rhythmLabel = '위기';
  } else if (maxIntensity > 75) {
    rhythm = 'spike';
    rhythmLabel = '급등';
  } else if (maxIntensity > 60) {
    rhythm = 'elevated';
    rhythmLabel = '상승';
  }
  
  const keywords = Array.from({ length: 8 }, generateKeywordStats);
  
  const sources = [
    { source: '네이버 뉴스', count: randomInt(20, 50), topArticle: '"사교육비 부담" 학부모 절반 "줄이겠다"' },
    { source: '맘카페', count: randomInt(10, 30), topArticle: '요즘 학원비가 너무 올랐어요' },
    { source: 'SNS', count: randomInt(15, 40), topArticle: '#학원비 #부담 인기 해시태그' },
  ];
  
  const heartbeatData: HeartbeatData = {
    rhythm,
    rhythmLabel,
    timeline: timeline.slice(-48), // 최근 48시간만
    keywords: keywords.sort((a, b) => b.count - a.count),
  };
  
  return successResponse({
    ...heartbeatData,
    sources,
  }, '외부 여론 분석 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Voice Heartbeat (내부 Voice)
// ─────────────────────────────────────────────────────────────────────

function getVoiceHeartbeat(params: URLSearchParams) {
  const period = params.get('period') || '7d';
  const hours = period === '30d' ? 720 : period === '1d' ? 24 : 168;
  
  const timeline = generateHeartbeatTimeline(hours);
  const maxIntensity = Math.max(...timeline.map(t => t.intensity));
  
  let rhythm: HeartbeatRhythm = 'normal';
  if (maxIntensity > 80) rhythm = 'critical';
  else if (maxIntensity > 65) rhythm = 'spike';
  else if (maxIntensity > 50) rhythm = 'elevated';
  
  const keywords = Array.from({ length: 6 }, generateKeywordStats);
  
  // Voice 단계별 집계
  const byStage = {
    request: randomInt(5, 15),
    wish: randomInt(3, 10),
    complaint: randomInt(2, 8),
    churn_signal: randomInt(0, 3),
  };
  
  // 미해결 Voice
  const unresolvedVoices: VoiceBrief[] = Array.from(
    { length: randomInt(2, 6) },
    generateVoiceBrief
  ).filter(v => v.daysUnresolved > 0);
  
  return successResponse({
    rhythm,
    rhythmLabel: rhythm === 'critical' ? '위기' : rhythm === 'spike' ? '급등' : rhythm === 'elevated' ? '상승' : '정상',
    timeline: timeline.slice(-48),
    keywords: keywords.sort((a, b) => b.count - a.count),
    byStage,
    unresolvedCount: unresolvedVoices.length,
    unresolvedVoices,
  }, '내부 Voice 분석 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Resonance (공명 분석)
// ─────────────────────────────────────────────────────────────────────

function getResonance() {
  const resonances = Array.from({ length: randomInt(1, 4) }, generateResonance)
    .sort((a, b) => b.correlation - a.correlation);
  
  const hasResonance = resonances.some(r => r.correlation > 0.7);
  const topResonance = resonances[0];
  
  return successResponse({
    resonances,
    hasResonance,
    resonanceAlert: hasResonance 
      ? `외부 '${topResonance.externalKeyword}' 여론과 내부 '${topResonance.internalKeyword}' Voice가 공명 중!`
      : null,
  }, '공명 분석 완료');
}

// ─────────────────────────────────────────────────────────────────────
// Keywords (키워드 상세)
// ─────────────────────────────────────────────────────────────────────

function getKeywords(params: URLSearchParams) {
  const keyword = params.get('keyword') || '비용';
  const source = params.get('source') || 'both';
  
  const days = 14;
  const timeline = Array.from({ length: days }, (_, i) => ({
    date: formatDate(-days + i + 1),
    externalCount: randomInt(5, 25),
    internalCount: randomInt(1, 10),
  }));
  
  const response: Record<string, unknown> = { keyword };
  
  if (source === 'both' || source === 'external') {
    response.external = {
      count: randomInt(50, 150),
      trend: randomChoice(['rising', 'stable', 'falling']),
      sources: [
        { name: '네이버 뉴스', count: randomInt(20, 50) },
        { name: '맘카페', count: randomInt(10, 30) },
        { name: 'SNS', count: randomInt(15, 40) },
      ],
    };
  }
  
  if (source === 'both' || source === 'internal') {
    response.internal = {
      count: randomInt(10, 40),
      trend: randomChoice(['rising', 'stable', 'falling']),
      customers: generateCustomerBriefs(randomInt(5, 15)),
    };
  }
  
  response.timeline = timeline;
  
  return successResponse(response, '키워드 상세 분석 완료');
}
