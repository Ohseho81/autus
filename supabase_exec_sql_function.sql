/**
 * Supabase RPC 함수: exec_sql
 *
 * Edge Function에서 SQL을 실행하기 위한 헬퍼 함수
 *
 * ⚠️ 보안 경고:
 * 이 함수는 매우 강력하므로 절대로 클라이언트에서 직접 호출하지 마세요!
 * Edge Function에서만 사용하도록 제한됩니다.
 *
 * 설치:
 * Supabase Dashboard > SQL Editor에서 실행
 */

-- exec_sql 함수 생성
CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- SQL 실행
  EXECUTE sql;
END;
$$;

-- 함수 권한 설정 (service_role만 실행 가능)
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM anon;
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM authenticated;

-- service_role에만 실행 권한 부여
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- 함수 설명 추가
COMMENT ON FUNCTION exec_sql(TEXT) IS
  'Execute arbitrary SQL. SECURITY CRITICAL: Only callable by Edge Functions with service_role key.';

-- 완료 메시지
SELECT '✅ exec_sql function created successfully!' as status;
