-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1: Storage RLS — 영상/사진 버킷 보안 정책
-- ═══════════════════════════════════════════════════════════════════════════════

-- 버킷 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Videos 버킷 RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- 인증된 사용자: 자신의 폴더에 업로드 가능
CREATE POLICY storage_videos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- 인증된 사용자: 자신의 파일 조회 가능
CREATE POLICY storage_videos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- 인증된 사용자: 자신의 파일 삭제 가능
CREATE POLICY storage_videos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'videos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Service Role: 전체 접근 (Worker, Admin)
CREATE POLICY storage_videos_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'videos');

-- ─────────────────────────────────────────────────────────────────────────────
-- Photos 버킷 RLS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY storage_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY storage_photos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY storage_photos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY storage_photos_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'photos');

-- ─────────────────────────────────────────────────────────────────────────────
-- Documents 버킷 RLS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY storage_documents_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY storage_documents_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY storage_documents_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'documents');
