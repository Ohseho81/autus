# 메시징 모듈 설정 가이드

## 1. Supabase 마이그레이션 실행

`message_outbox` / `message_log` 테이블이 없으면 `/api/messaging/send`가 실패합니다.

```bash
# Supabase CLI로 마이그레이션
cd ~/Desktop/autus
supabase db push

# 또는 Supabase Dashboard → SQL Editor에서 직접 실행
# 파일: supabase/migrations/011_message_outbox.sql
```

## 2. 테이블 확인

```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_outbox');
```

## 3. API 테스트

```bash
curl -X POST https://vercel-api-two-rust.vercel.app/api/messaging/send \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "0219d7f2-5875-4bab-b921-f8593df126b8",
    "recipient_type": "PARENT",
    "recipient_id": "parent_001",
    "phone": "01012345678",
    "template_code": "ATTEND",
    "payload": {"학생명": "홍길동"}
  }'
```

예상: `{"success": true, "message_id": "..."}` (테이블 생성 후)

## 4. 에러 메시지 개선

- 이전: `"[object Object]"` (객체를 String으로 변환)
- 수정 후: 실제 에러 메시지 반환 (PostgrestError.message 등)
