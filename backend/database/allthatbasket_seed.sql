-- ═══════════════════════════════════════════════════════════════════════════════
-- 🏀 올댓바스켓 (All That Basket) 초기 데이터
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- 역할 구조:
-- 1. 원장 (심재혁) - DECIDER/owner
-- 2. 관리자 (오승원) - OPERATOR/manager  
-- 3. 강사 - EXECUTOR/teacher
-- 4. 학부모 - CONSUMER/parent
-- 5. 학생 - student
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 조직 (Organization) 생성
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO organizations (
    id,
    name,
    slug,
    industry,
    settings,
    branding,
    created_at
) VALUES (
    'org_allthatbasket_001',
    '올댓바스켓',
    'allthatbasket',
    'basketball_academy',
    jsonb_build_object(
        'timezone', 'Asia/Seoul',
        'language', 'ko',
        'currency', 'KRW',
        'v_index_weights', jsonb_build_object(
            'T', 0.25,  -- Trust
            'S', 0.30,  -- Satisfaction
            'E', 0.25,  -- Engagement
            'L', 0.20   -- Loyalty
        ),
        'notifications', jsonb_build_object(
            'telegram_enabled', true,
            'kakao_enabled', true,
            'email_enabled', true
        ),
        'features', jsonb_build_object(
            'gamification', true,
            'ai_predictions', true,
            'auto_reports', true,
            'passive_god_mode', true
        )
    ),
    jsonb_build_object(
        'name', '올댓바스켓',
        'name_en', 'All That Basket',
        'tagline', '농구의 모든 것',
        'logo_url', '/assets/allthatbasket/logo.png',
        'primary_color', '#FF6B35',    -- 농구 오렌지
        'secondary_color', '#1A1A2E',  -- 다크 네이비
        'accent_color', '#F7931E',     -- 골든 오렌지
        'theme', 'basketball',
        'icon_set', 'sports'
    ),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    settings = EXCLUDED.settings,
    branding = EXCLUDED.branding;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 사용자 생성
-- ─────────────────────────────────────────────────────────────────────────────

-- 2.1 원장 - 심재혁
INSERT INTO users (
    id,
    email,
    name,
    role,
    phone,
    metadata,
    created_at
) VALUES (
    'user_atb_owner_001',
    'owner@allthatbasket.kr',
    '심재혁',
    'owner',
    '010-0000-0001',
    jsonb_build_object(
        'position', '원장',
        'k_level', 7,
        'max_direct_child', 12,
        'max_influence_count', 144,
        'current_direct_count', 0,
        'current_influence_count', 0
    ),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2.2 관리자 - 오승원
INSERT INTO users (
    id,
    email,
    name,
    role,
    phone,
    metadata,
    created_at
) VALUES (
    'user_atb_manager_001',
    'manager@allthatbasket.kr',
    '오승원',
    'manager',
    '010-0000-0002',
    jsonb_build_object(
        'position', '관리자',
        'k_level', 5,
        'max_direct_child', 12,
        'max_influence_count', 144,
        'current_direct_count', 0,
        'current_influence_count', 0
    ),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2.3 샘플 강사 3명
INSERT INTO users (id, email, name, role, phone, metadata, created_at) VALUES
    ('user_atb_teacher_001', 'coach1@allthatbasket.kr', '김코치', 'teacher', '010-1001-0001', 
     '{"position": "헤드코치", "k_level": 3, "specialty": "드리블/슈팅"}', NOW()),
    ('user_atb_teacher_002', 'coach2@allthatbasket.kr', '이코치', 'teacher', '010-1001-0002',
     '{"position": "코치", "k_level": 2, "specialty": "체력/피지컬"}', NOW()),
    ('user_atb_teacher_003', 'coach3@allthatbasket.kr', '박코치', 'teacher', '010-1001-0003',
     '{"position": "코치", "k_level": 2, "specialty": "전술/팀플레이"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2.4 샘플 학부모 5명
INSERT INTO users (id, email, name, role, phone, metadata, created_at) VALUES
    ('user_atb_parent_001', 'parent1@gmail.com', '김학부모', 'parent', '010-2001-0001',
     '{"children": ["user_atb_student_001"]}', NOW()),
    ('user_atb_parent_002', 'parent2@gmail.com', '이학부모', 'parent', '010-2001-0002',
     '{"children": ["user_atb_student_002"]}', NOW()),
    ('user_atb_parent_003', 'parent3@gmail.com', '박학부모', 'parent', '010-2001-0003',
     '{"children": ["user_atb_student_003"]}', NOW()),
    ('user_atb_parent_004', 'parent4@gmail.com', '최학부모', 'parent', '010-2001-0004',
     '{"children": ["user_atb_student_004"]}', NOW()),
    ('user_atb_parent_005', 'parent5@gmail.com', '정학부모', 'parent', '010-2001-0005',
     '{"children": ["user_atb_student_005"]}', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2.5 샘플 학생 5명
INSERT INTO users (id, email, name, role, phone, metadata, created_at) VALUES
    ('user_atb_student_001', 'student1@school.kr', '김민준', 'student', NULL,
     '{"grade": "중1", "age": 13, "class": "A반", "parent_id": "user_atb_parent_001", "position": "포인트가드"}', NOW()),
    ('user_atb_student_002', 'student2@school.kr', '이서연', 'student', NULL,
     '{"grade": "중2", "age": 14, "class": "A반", "parent_id": "user_atb_parent_002", "position": "슈팅가드"}', NOW()),
    ('user_atb_student_003', 'student3@school.kr', '박지훈', 'student', NULL,
     '{"grade": "중1", "age": 13, "class": "B반", "parent_id": "user_atb_parent_003", "position": "스몰포워드"}', NOW()),
    ('user_atb_student_004', 'student4@school.kr', '최예린', 'student', NULL,
     '{"grade": "초6", "age": 12, "class": "B반", "parent_id": "user_atb_parent_004", "position": "파워포워드"}', NOW()),
    ('user_atb_student_005', 'student5@school.kr', '정우성', 'student', NULL,
     '{"grade": "중2", "age": 14, "class": "A반", "parent_id": "user_atb_parent_005", "position": "센터"}', NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. 조직 멤버십 연결
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES
    ('org_allthatbasket_001', 'user_atb_owner_001', 'owner', NOW()),
    ('org_allthatbasket_001', 'user_atb_manager_001', 'manager', NOW()),
    ('org_allthatbasket_001', 'user_atb_teacher_001', 'teacher', NOW()),
    ('org_allthatbasket_001', 'user_atb_teacher_002', 'teacher', NOW()),
    ('org_allthatbasket_001', 'user_atb_teacher_003', 'teacher', NOW()),
    ('org_allthatbasket_001', 'user_atb_parent_001', 'parent', NOW()),
    ('org_allthatbasket_001', 'user_atb_parent_002', 'parent', NOW()),
    ('org_allthatbasket_001', 'user_atb_parent_003', 'parent', NOW()),
    ('org_allthatbasket_001', 'user_atb_parent_004', 'parent', NOW()),
    ('org_allthatbasket_001', 'user_atb_parent_005', 'parent', NOW()),
    ('org_allthatbasket_001', 'user_atb_student_001', 'student', NOW()),
    ('org_allthatbasket_001', 'user_atb_student_002', 'student', NOW()),
    ('org_allthatbasket_001', 'user_atb_student_003', 'student', NOW()),
    ('org_allthatbasket_001', 'user_atb_student_004', 'student', NOW()),
    ('org_allthatbasket_001', 'user_atb_student_005', 'student', NOW())
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. 초기 V-Index 설정
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO v_current (
    user_id,
    org_id,
    motions,
    threats,
    relations,
    base_value,
    interaction_exponent,
    updated_at
) VALUES
    -- 학생들 초기 V-Index
    ('user_atb_student_001', 'org_allthatbasket_001', 80, 15, 0.4, 1.0, 1.0, NOW()),
    ('user_atb_student_002', 'org_allthatbasket_001', 75, 20, 0.35, 1.0, 1.0, NOW()),
    ('user_atb_student_003', 'org_allthatbasket_001', 70, 18, 0.3, 1.0, 1.0, NOW()),
    ('user_atb_student_004', 'org_allthatbasket_001', 85, 10, 0.45, 1.0, 1.0, NOW()),
    ('user_atb_student_005', 'org_allthatbasket_001', 72, 22, 0.32, 1.0, 1.0, NOW())
ON CONFLICT (user_id, org_id) DO UPDATE SET
    motions = EXCLUDED.motions,
    threats = EXCLUDED.threats,
    relations = EXCLUDED.relations,
    updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. 수업 반(Class) 설정
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO classes (
    id,
    org_id,
    name,
    description,
    teacher_id,
    schedule,
    capacity,
    current_count,
    created_at
) VALUES
    ('class_atb_a', 'org_allthatbasket_001', 'A반 (주니어)', '중등부 기초반', 'user_atb_teacher_001',
     '{"days": ["월", "수", "금"], "time": "16:00-18:00"}', 15, 3, NOW()),
    ('class_atb_b', 'org_allthatbasket_001', 'B반 (키즈)', '초등/중등 입문반', 'user_atb_teacher_002',
     '{"days": ["화", "목"], "time": "16:00-17:30"}', 12, 2, NOW()),
    ('class_atb_elite', 'org_allthatbasket_001', '엘리트반', '대회 준비반', 'user_atb_teacher_003',
     '{"days": ["토", "일"], "time": "10:00-13:00"}', 8, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. 학생-반 연결
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO class_enrollments (class_id, student_id, enrolled_at) VALUES
    ('class_atb_a', 'user_atb_student_001', NOW()),
    ('class_atb_a', 'user_atb_student_002', NOW()),
    ('class_atb_a', 'user_atb_student_005', NOW()),
    ('class_atb_b', 'user_atb_student_003', NOW()),
    ('class_atb_b', 'user_atb_student_004', NOW())
ON CONFLICT (class_id, student_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. 농구 학원 전용 미션/뱃지 설정
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO mission_templates (
    id,
    org_id,
    name,
    description,
    category,
    points,
    icon,
    requirements
) VALUES
    ('mission_atb_dribble', 'org_allthatbasket_001', '드리블 마스터', '연속 드리블 100회 달성', 'skill', 50, '🏀', 
     '{"type": "dribble_count", "target": 100}'),
    ('mission_atb_freethrow', 'org_allthatbasket_001', '자유투 명사수', '자유투 10개 중 8개 성공', 'skill', 80,  '🎯',
     '{"type": "freethrow_accuracy", "target": 0.8}'),
    ('mission_atb_attendance', 'org_allthatbasket_001', '개근상', '한 달 출석 100%', 'attendance', 100, '📅',
     '{"type": "monthly_attendance", "target": 1.0}'),
    ('mission_atb_teamplay', 'org_allthatbasket_001', '팀플레이어', '어시스트 10회 달성', 'teamwork', 60, '🤝',
     '{"type": "assist_count", "target": 10}'),
    ('mission_atb_improvement', 'org_allthatbasket_001', '성장왕', 'V-Index 10% 상승', 'growth', 120, '📈',
     '{"type": "v_index_growth", "target": 0.1}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badge_templates (
    id,
    org_id,
    name,
    description,
    tier,
    icon,
    requirements
) VALUES
    ('badge_atb_rookie', 'org_allthatbasket_001', '루키', '첫 수업 완료', 'bronze', '🌟',
     '{"type": "class_complete", "count": 1}'),
    ('badge_atb_regular', 'org_allthatbasket_001', '레귤러', '10회 수업 완료', 'silver', '⭐',
     '{"type": "class_complete", "count": 10}'),
    ('badge_atb_allstar', 'org_allthatbasket_001', '올스타', '50회 수업 완료', 'gold', '🌟',
     '{"type": "class_complete", "count": 50}'),
    ('badge_atb_mvp', 'org_allthatbasket_001', 'MVP', 'V-Index 90+ 달성', 'platinum', '🏆',
     '{"type": "v_index_threshold", "value": 90}'),
    ('badge_atb_legend', 'org_allthatbasket_001', '레전드', '1년 연속 재원', 'diamond', '💎',
     '{"type": "enrollment_duration", "months": 12}')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 완료! 🏀 올댓바스켓 초기 데이터 설정 완료
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
    '🏀 올댓바스켓 초기 데이터 설정 완료!' as status,
    (SELECT COUNT(*) FROM users WHERE id LIKE 'user_atb_%') as total_users,
    (SELECT COUNT(*) FROM classes WHERE org_id = 'org_allthatbasket_001') as total_classes,
    (SELECT COUNT(*) FROM mission_templates WHERE org_id = 'org_allthatbasket_001') as total_missions,
    (SELECT COUNT(*) FROM badge_templates WHERE org_id = 'org_allthatbasket_001') as total_badges;
