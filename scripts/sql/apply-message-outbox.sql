-- Supabase SQL Editor에서 실행
-- https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti/sql/new

-- message_outbox: 메시지 발송 큐
CREATE TABLE IF NOT EXISTS message_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL UNIQUE,
  app_id TEXT NOT NULL DEFAULT 'onlyssam',
  tenant_id TEXT NOT NULL,
  event_id UUID,
  decision_id UUID,
  rule_id UUID,
  channel TEXT DEFAULT 'KAKAO',
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('PARENT', 'TEACHER', 'DIRECTOR')),
  recipient_id TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_email TEXT,
  template_id TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  rendered_content TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('SAFETY', 'URGENT', 'NORMAL', 'LOW')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  scheduled_send_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rate_limit_bucket TEXT,
  external_message_id TEXT,
  delivery_status TEXT,
  delivery_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_outbox_status ON message_outbox(status);
CREATE INDEX IF NOT EXISTS idx_message_outbox_tenant ON message_outbox(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_outbox_next_retry ON message_outbox(next_retry_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_message_outbox_created ON message_outbox(created_at DESC);

CREATE TABLE IF NOT EXISTS message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_message_log_message_id ON message_log(message_id);

ALTER TABLE message_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_outbox service write" ON message_outbox;
CREATE POLICY "message_outbox service write" ON message_outbox FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "message_log service write" ON message_log;
CREATE POLICY "message_log service write" ON message_log FOR ALL USING (true) WITH CHECK (true);
