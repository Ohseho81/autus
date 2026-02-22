/**
 * 알림톡 응답 처리 API
 * GET /api/attendance/respond?token=xxx&response=ATTEND|ABSENT
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, response } = req.query;

  if (!token || typeof token !== 'string') {
    return res.redirect('/error?message=유효하지 않은 요청입니다');
  }

  try {
    // 토큰 검증
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
    
    if (payload.exp < Date.now()) {
      return res.redirect('/error?message=링크가 만료되었습니다');
    }

    // 토큰 상태 확인
    const { data: tokenData, error: tokenError } = await supabase
      .from('attendance_response_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.redirect('/error?message=유효하지 않은 요청입니다');
    }

    if (tokenData.status !== 'PENDING') {
      return res.redirect('/already-responded');
    }

    // 응답 타입에 따라 처리
    if (response === 'ATTEND') {
      // 출석 예정 처리
      await supabase
        .from('attendance_response_tokens')
        .update({
          status: 'ATTEND',
          responded_at: new Date().toISOString(),
        })
        .eq('token', token);

      await supabase.from('attendance_responses').insert({
        lesson_id: tokenData.lesson_id,
        student_id: tokenData.student_id,
        response_type: 'ATTEND',
      });

      return res.redirect('/attendance/confirmed');
    } else {
      // 결석 → 보충수업 선택 페이지로 이동
      return res.redirect(`/makeup/select?token=${token}`);
    }
  } catch (error) {
    console.error('응답 처리 오류:', error);
    return res.redirect('/error?message=처리 중 오류가 발생했습니다');
  }
}
