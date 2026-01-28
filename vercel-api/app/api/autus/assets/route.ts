/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Assets Portfolio API
 * 
 * 자산 포트폴리오 관리 (Equity, IP, Data, Standard, Partnership)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

type AssetType = 'equity' | 'ip' | 'data' | 'standard' | 'partnership';

const ASSET_TYPE_SIGMA_DEFAULTS: Record<AssetType, number> = {
  equity: 0.25,
  ip: 0.20,
  data: 0.15,
  standard: 0.10,
  partnership: 0.30,
};

const ASSET_TYPE_INFO: Record<AssetType, { label: string; icon: string; description: string }> = {
  equity: { label: '지분', icon: '📈', description: '고객사/파트너 지분 수취' },
  ip: { label: 'IP', icon: '💡', description: 'IP 공동 소유/라이선스' },
  data: { label: '데이터', icon: '📊', description: '데이터 권한/접근권' },
  standard: { label: '표준', icon: '📋', description: '표준/프로토콜 기여' },
  partnership: { label: '파트너십', icon: '🤝', description: '전략적 파트너 관계' },
};

// Mock assets
const MOCK_ASSETS = [
  { id: 'asset-1', asset_type: 'equity' as AssetType, source_name: 'ABC 학원', t_value: 500, sigma_value: 0.28, a_value: 2150, status: 'active', acquired_at: '2024-06-15' },
  { id: 'asset-2', asset_type: 'partnership' as AssetType, source_name: 'XYZ 에듀테크', t_value: 800, sigma_value: 0.32, a_value: 4200, status: 'active', acquired_at: '2024-09-01' },
  { id: 'asset-3', asset_type: 'data' as AssetType, source_name: '클라우드 제휴', t_value: 200, sigma_value: 0.18, a_value: 520, status: 'active', acquired_at: '2024-11-20' },
  { id: 'asset-4', asset_type: 'ip' as AssetType, source_name: '공동 개발 특허', t_value: 350, sigma_value: 0.22, a_value: 1180, status: 'pending', acquired_at: '2025-01-10' },
];

// A = T^σ 계산 (power function)
function calculateAssetValue(t: number, sigma: number): number {
  if (t <= 0) return 0;
  return Math.round(Math.pow(t, 1 + sigma) * 100) / 100;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id') || 'demo';
  const omega = parseInt(searchParams.get('omega') || '30000');
  
  try {
    // 자산 목록 with KRW 환산
    const assets = MOCK_ASSETS.map(a => ({
      ...a,
      a_krw: Math.round(a.a_value * omega),
      type_info: ASSET_TYPE_INFO[a.asset_type],
    }));
    
    // 총 가치
    const totalAValue = assets.reduce((sum, a) => sum + a.a_value, 0);
    const totalAKrw = assets.reduce((sum, a) => sum + a.a_krw, 0);
    
    // 유형별 분포
    const distribution: Record<AssetType, { count: number; value: number; percentage: number }> = {
      equity: { count: 0, value: 0, percentage: 0 },
      ip: { count: 0, value: 0, percentage: 0 },
      data: { count: 0, value: 0, percentage: 0 },
      standard: { count: 0, value: 0, percentage: 0 },
      partnership: { count: 0, value: 0, percentage: 0 },
    };
    
    assets.forEach(a => {
      distribution[a.asset_type].count += 1;
      distribution[a.asset_type].value += a.a_value;
    });
    
    Object.keys(distribution).forEach(key => {
      const k = key as AssetType;
      distribution[k].percentage = totalAValue > 0 
        ? Math.round((distribution[k].value / totalAValue) * 100)
        : 0;
    });
    
    return NextResponse.json({
      success: true,
      data: {
        org_id: orgId,
        total_a_value: Math.round(totalAValue * 100) / 100,
        total_a_krw: totalAKrw,
        asset_count: assets.length,
        distribution,
        assets,
        asset_types: ASSET_TYPE_INFO,
        default_sigmas: ASSET_TYPE_SIGMA_DEFAULTS,
        formula: 'A = T^(1+σ)',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, org_id } = body;
    
    switch (action) {
      case 'calculate': {
        const { asset_type, t_value, sigma_value } = body;
        
        const sigma = sigma_value ?? ASSET_TYPE_SIGMA_DEFAULTS[asset_type as AssetType] ?? 0.15;
        const a_value = calculateAssetValue(t_value || 0, sigma);
        
        return NextResponse.json({
          success: true,
          data: {
            asset_type,
            t_value,
            sigma_value: sigma,
            a_value,
            formula: `A = ${t_value}^(1+${sigma}) = ${a_value}`,
            type_info: ASSET_TYPE_INFO[asset_type as AssetType],
          },
        });
      }
      
      case 'add': {
        const { asset_type, source_name, t_value, sigma_value, description } = body;
        
        const sigma = sigma_value ?? ASSET_TYPE_SIGMA_DEFAULTS[asset_type as AssetType] ?? 0.15;
        const a_value = calculateAssetValue(t_value || 0, sigma);
        
        const newAsset = {
          id: `asset-${Date.now()}`,
          asset_type,
          source_name,
          description,
          t_value,
          sigma_value: sigma,
          a_value,
          status: 'pending',
          acquired_at: new Date().toISOString(),
        };
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Asset created (demo mode)',
            asset: newAsset,
          },
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
