/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS σ History API
 * 
 * σ 이력 조회 및 추이 분석
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  optionsResponse,
} from '../../../../lib/api-utils';

// Mock data store
const sigmaHistoryStore: Record<string, Array<{
  date: string;
  sigma: number;
  grade: string;
  behaviors: string[];
}>> = {};

// 등급 판정
function getSigmaGrade(sigma: number): string {
  if (sigma < 0.7) return 'critical';
  if (sigma < 1.0) return 'at_risk';
  if (sigma < 1.3) return 'neutral';
  if (sigma < 1.6) return 'good';
  if (sigma < 2.0) return 'loyal';
  return 'advocate';
}

// Mock 데이터 생성
function generateMockHistory(nodeId: string, days: number = 90): Array<{
  date: string;
  sigma: number;
  grade: string;
  behaviors: string[];
}> {
  const history = [];
  let sigma = 1.0 + (Math.random() - 0.5) * 0.5;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // 랜덤 변동
    sigma += (Math.random() - 0.45) * 0.05;
    sigma = Math.max(0.5, Math.min(3.0, sigma));
    
    const behaviors = [];
    if (Math.random() > 0.8) behaviors.push('ATTENDANCE');
    if (Math.random() > 0.9) behaviors.push('COMMUNICATION');
    if (Math.random() > 0.95) behaviors.push('POSITIVE_FEEDBACK');
    
    history.push({
      date: date.toISOString().split('T')[0],
      sigma: Math.round(sigma * 100) / 100,
      grade: getSigmaGrade(sigma),
      behaviors,
    });
  }
  
  return history;
}

// OPTIONS
export async function OPTIONS() {
  return optionsResponse();
}

// GET - σ 이력 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const relationshipId = searchParams.get('relationshipId');
    const days = parseInt(searchParams.get('days') || '90');
    
    const id = nodeId || relationshipId;
    if (!id) {
      return errorResponse('nodeId or relationshipId is required', 400);
    }
    
    // 캐시된 데이터 또는 새로 생성
    if (!sigmaHistoryStore[id]) {
      sigmaHistoryStore[id] = generateMockHistory(id, days);
    }
    
    const history = sigmaHistoryStore[id].slice(-days);
    
    // 분석
    const currentSigma = history[history.length - 1]?.sigma || 1.0;
    const previousSigma = history[0]?.sigma || 1.0;
    const change = currentSigma - previousSigma;
    const changePerDay = change / days;
    
    // 추세 판정
    let trend: 'rising' | 'stable' | 'falling';
    if (changePerDay > 0.005) trend = 'rising';
    else if (changePerDay < -0.005) trend = 'falling';
    else trend = 'stable';
    
    // 등급 변화
    const gradeChanges = [];
    for (let i = 1; i < history.length; i++) {
      if (history[i].grade !== history[i - 1].grade) {
        gradeChanges.push({
          date: history[i].date,
          from: history[i - 1].grade,
          to: history[i].grade,
        });
      }
    }
    
    return successResponse({
      id,
      history,
      analysis: {
        current: currentSigma,
        previous: previousSigma,
        change,
        changePerDay,
        trend,
        gradeChanges,
        daysAnalyzed: days,
      },
    });
    
  } catch (error) {
    return serverErrorResponse(error, 'Sigma History GET');
  }
}
