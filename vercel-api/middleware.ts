import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24시간 캐시
};

export function middleware(request: NextRequest) {
  // Preflight OPTIONS 요청 처리
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // 일반 요청에 CORS 헤더 추가
  const response = NextResponse.next();
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// API 라우트에만 미들웨어 적용
export const config = {
  matcher: '/api/:path*',
};
