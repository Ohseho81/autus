-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎬 Video Storage Setup
-- Spec v3.0+ - 버튼 3개 + 영상
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 실행 방법:
-- 1. Supabase Dashboard > SQL Editor에서 실행
-- 2. 또는 supabase db push
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 1: Storage Bucket
-- ═══════════════════════════════════════════════════════════════════════════════

-- 영상 저장용 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-videos',
  'lesson-videos',
  true,  -- public: 학부모에게 링크 공유를 위해 public
  52428800,  -- 50MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage 정책: 인증된 사용자만 업로드 가능
CREATE POLICY "Coach can upload videos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lesson-videos');

-- Storage 정책: 모든 사용자 읽기 가능 (학부모 공유용)
CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'lesson-videos');

-- Storage 정책: 인증된 사용자만 삭제 가능
CREATE POLICY "Coach can delete videos" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'lesson-videos');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 2: Video Records Table
-- ═══════════════════════════════════════════════════════════════════════════════

-- 영상 메타데이터 테이블
CREATE TABLE IF NOT EXISTS atb_video_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 연결 관계
  session_id UUID REFERENCES atb_lesson_sessions(id) ON DELETE SET NULL,
  student_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES entities(id) ON DELETE SET NULL,

  -- 영상 정보
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,

  -- 상태
  status VARCHAR(20) DEFAULT 'UPLOADED' CHECK (status IN ('RECORDING', 'LOCAL', 'UPLOADING', 'UPLOADED', 'FAILED', 'DELETED')),

  -- 메타데이터 (title, description, tags 등)
  metadata JSONB DEFAULT '{}',

  -- 알림톡 발송 여부
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,

  -- 조회 통계
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_video_records_session ON atb_video_records(session_id);
CREATE INDEX IF NOT EXISTS idx_video_records_student ON atb_video_records(student_id);
CREATE INDEX IF NOT EXISTS idx_video_records_coach ON atb_video_records(coach_id);
CREATE INDEX IF NOT EXISTS idx_video_records_status ON atb_video_records(status);
CREATE INDEX IF NOT EXISTS idx_video_records_created ON atb_video_records(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 3: RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE atb_video_records ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 모든 영상 조회 가능
CREATE POLICY "Authenticated users can view videos"
  ON atb_video_records FOR SELECT
  TO authenticated
  USING (true);

-- 인증된 사용자는 영상 추가 가능
CREATE POLICY "Authenticated users can insert videos"
  ON atb_video_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 인증된 사용자는 영상 업데이트 가능
CREATE POLICY "Authenticated users can update videos"
  ON atb_video_records FOR UPDATE
  TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 4: Trigger - 영상 업로드 완료 시 학부모 알림톡 트리거
-- ═══════════════════════════════════════════════════════════════════════════════

-- 영상 업로드 완료 시 알림 생성 함수
CREATE OR REPLACE FUNCTION fn_video_upload_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_student RECORD;
  v_parent_id UUID;
  v_video_title TEXT;
BEGIN
  -- UPLOADED 상태로 변경되었을 때만 실행
  IF NEW.status = 'UPLOADED' AND (OLD.status IS NULL OR OLD.status != 'UPLOADED') THEN
    -- 학생 정보 조회
    IF NEW.student_id IS NOT NULL THEN
      SELECT * INTO v_student FROM entities WHERE id = NEW.student_id;

      -- 학부모 ID 조회 (relationships 테이블에서)
      SELECT from_entity_id INTO v_parent_id
      FROM relationships
      WHERE to_entity_id = NEW.student_id
        AND type = 'parent_of'
      LIMIT 1;

      -- 영상 제목 추출
      v_video_title := COALESCE(
        NEW.metadata->>'title',
        v_student.name || ' 수업 영상'
      );

      -- 알림 이벤트 생성 (Cron Job이 처리)
      IF v_parent_id IS NOT NULL THEN
        INSERT INTO events (
          organization_id,
          event_type,
          source,
          source_id,
          metadata
        ) VALUES (
          v_student.organization_id,
          'video_ready',
          'system',
          NEW.id::TEXT,
          jsonb_build_object(
            'video_id', NEW.id,
            'video_url', NEW.video_url,
            'video_title', v_video_title,
            'student_id', NEW.student_id,
            'student_name', v_student.name,
            'parent_id', v_parent_id,
            'duration_seconds', NEW.duration_seconds
          )
        );

        -- 알림 발송 플래그 업데이트
        NEW.notification_sent := FALSE;  -- Cron Job에서 발송 후 TRUE로 변경
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trg_video_upload_notification ON atb_video_records;
CREATE TRIGGER trg_video_upload_notification
  BEFORE INSERT OR UPDATE ON atb_video_records
  FOR EACH ROW
  EXECUTE FUNCTION fn_video_upload_notification();

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 5: View - 학생별 영상 목록 (학부모 알림톡 링크용)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_student_videos AS
SELECT
  vr.id AS video_id,
  vr.student_id,
  e.name AS student_name,
  vr.session_id,
  ls.name AS session_name,
  vr.video_url,
  vr.duration_seconds,
  vr.metadata->>'title' AS title,
  vr.created_at,
  vr.view_count
FROM atb_video_records vr
LEFT JOIN entities e ON e.id = vr.student_id
LEFT JOIN atb_lesson_sessions ls ON ls.id = vr.session_id
WHERE vr.status = 'UPLOADED'
  AND vr.deleted_at IS NULL
ORDER BY vr.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 6: 샘플 데이터 (테스트용)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 테스트용 영상 레코드 (실제 영상 URL은 업로드 후 생성됨)
-- INSERT INTO atb_video_records (session_id, student_id, video_url, duration_seconds, status, metadata)
-- SELECT
--   ls.id,
--   NULL,  -- 전체 수업 영상
--   'https://example.com/video.mp4',
--   30,
--   'UPLOADED',
--   '{"title": "테스트 영상"}'::jsonb
-- FROM atb_lesson_sessions ls
-- LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 완료!
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE atb_video_records IS '코치 영상 촬영 기록 - Spec v3.0+ (버튼 3개 + 영상)';
