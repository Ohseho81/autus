/**
 * /onlyssam/director — 원장 대시보드
 * kraton 제거 후 vercel-api 메인 페이지로 리다이렉트
 */
import { redirect } from 'next/navigation';

export default function OnlyssamDirectorPage() {
  redirect('/');
}
