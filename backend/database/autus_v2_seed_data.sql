-- ═══════════════════════════════════════════════════════════════════════════
-- AUTUS 2.0 SEED DATA - KRATON 학원 테스트 데이터
-- ═══════════════════════════════════════════════════════════════════════════

-- 조직 생성
INSERT INTO organizations (id, name, industry, config, location) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'KRATON 영어학원', 'academy', '{
  "terms": {"customer": "학생", "payer": "학부모", "executor": "강사"},
  "tsel_weights": {"T": 0.25, "S": 0.30, "E": 0.25, "L": 0.20},
  "goals": {"customers": 150, "churn_rate": 3, "satisfaction": 4.5}
}', '{"lat": 37.5665, "lng": 126.9780, "address": "서울특별시 중구", "radius_km": 3}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 사용자 생성
INSERT INTO users (id, org_id, email, name, role, phone) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'owner@kraton.com', '김원장', 'owner', '010-1111-1111'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@kraton.com', '이관리', 'operator', '010-2222-2222'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'park@kraton.com', '박강사', 'executor', '010-3333-3333'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'kim@kraton.com', '김강사', 'executor', '010-4444-4444'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'kim.mom@gmail.com', '김민수 어머니', 'payer', '010-1234-5678'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'lee.mom@gmail.com', '이서연 어머니', 'payer', '010-2345-6789'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'park.mom@gmail.com', '박지훈 어머니', 'payer', '010-3456-7890')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 학생들 (고객)
INSERT INTO customers (id, org_id, name, grade, class, stage, executor_id, payer_id, location, enrolled_at) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '김민수', '중2', 'A반', '6month', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', '{"lat": 37.5670, "lng": 126.9790, "distance_km": 0.5}', '2024-05-01'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '최유진', '중1', 'B반', '3month', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', '{"lat": 37.5640, "lng": 126.9760, "distance_km": 0.8}', '2024-10-01'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '이서연', '중2', 'A반', '1year', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', '{"lat": 37.5650, "lng": 126.9770, "distance_km": 0.3}', '2024-01-01'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '박지훈', '중3', 'A반', '2year+', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07', '{"lat": 37.5680, "lng": 126.9800, "distance_km": 0.7}', '2023-03-01'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '정하은', '중1', 'B반', '6month', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', '{"lat": 37.5630, "lng": 126.9750, "distance_km": 1.0}', '2024-07-01')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 온도 데이터
INSERT INTO customer_temperatures (customer_id, temperature, zone, trend, trend_value, trust_score, satisfaction_score, engagement_score, loyalty_score, sigma_total, sigma_internal, sigma_voice, sigma_external, churn_probability, churn_predicted_date) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 38, 'critical', 'declining', -12, 52, 35, 60, 25, 0.70, 0.75, 0.60, 0.80, 0.42, '2025-02-15'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 48, 'warning', 'declining', -5, 55, 45, 50, 40, 0.85, 0.90, 0.80, 0.85, 0.25, NULL),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 72, 'good', 'stable', 2, 75, 70, 80, 65, 1.0, 1.0, 1.0, 1.0, 0.08, NULL),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 85, 'excellent', 'improving', 5, 90, 85, 88, 80, 1.1, 1.1, 1.1, 1.0, 0.03, NULL),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 65, 'normal', 'stable', 0, 65, 60, 70, 55, 0.95, 0.95, 1.0, 0.90, 0.12, NULL)
ON CONFLICT (customer_id) DO UPDATE SET temperature = EXCLUDED.temperature, zone = EXCLUDED.zone;

-- TSEL 상세 요인
INSERT INTO tsel_factors (customer_id, dimension, factor_name, factor_key, score, status) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'T', '성적 향상', 'grade_improvement', 45, 'bad'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'T', '강사 신뢰', 'teacher_quality', 68, 'good'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'S', '학부모 만족', 'parent_satisfaction', 30, 'bad'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'S', '가격 대비 가치', 'value_for_money', 28, 'bad'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'E', '출석률', 'attendance', 85, 'good'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'E', '숙제 완료', 'homework', 45, 'neutral'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'L', '재등록 의향', 'renewal_intent', 20, 'bad'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'L', '추천 의향', 'recommend_intent', 25, 'bad');

-- σ 영향 요인
INSERT INTO sigma_factors (customer_id, source, factor_name, impact) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'internal', '숙제 미제출 3회', -0.10),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'voice', '비용 민감 Voice', -0.15),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'external', 'D학원 프로모션', -0.05),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'voice', '시간 변경 요청', -0.05),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'external', '중간고사 스트레스', -0.10);

-- Voice (고객 소리)
INSERT INTO voices (id, org_id, customer_id, content, stage, category, sentiment, status, keywords, created_at) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '요즘 학원비 부담이 좀...', 'wish', 'cost', -0.4, 'pending', '["비용", "학원비"]', '2025-01-25'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', '성적이 별로 안 오른 것 같아요', 'complaint', 'grade', -0.6, 'resolved', '["성적", "불만"]', '2025-01-20'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', '숙제가 좀 많은 것 같아요', 'wish', 'workload', -0.3, 'pending', '["숙제", "부담"]', '2025-01-22'),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', '선생님이 정말 잘 가르쳐주세요!', 'request', 'compliment', 0.8, 'resolved', '["칭찬", "강사"]', '2025-01-15')
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- 온도 히스토리
INSERT INTO temperature_history (customer_id, temperature, zone, r_score, sigma_total, event_type, event_description, temp_change, recorded_at) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 38, 'critical', 43, 0.70, 'voice', '비용 민감 Voice 감지', -5, '2025-01-25'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 43, 'warning', 45, 0.75, 'voice', '성적 불만 Voice', -8, '2025-01-20'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 51, 'normal', 50, 0.80, 'behavior', '숙제 미제출 3회차', -3, '2025-01-15'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 72, 'good', 73, 1.0, 'positive', '성적 향상', 5, '2025-01-20'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 85, 'excellent', 86, 1.1, 'positive', '추천 학생 등록', 3, '2025-01-18');

-- 경쟁사
INSERT INTO competitors (id, org_id, name, location, threat_level, metrics) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'D학원', '{"lat": 37.5660, "lng": 126.9810, "distance_km": 0.8}', 'high', '{"students": 150, "satisfaction": 4.2, "price": 45}'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'E학원', '{"lat": 37.5630, "lng": 126.9750, "distance_km": 1.2}', 'medium', '{"students": 80, "satisfaction": 3.8, "price": 40}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 외부 이벤트 (날씨/시즌)
INSERT INTO external_events (org_id, event_date, event_type, event_name, description, sigma_impact, source) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2025-02-01', 'exam', '중간고사', '2월 중간고사 기간', -0.40, 'manual'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2025-01-31', 'exam', '시험 전날', '중간고사 전날', -0.25, 'manual'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2025-02-10', 'holiday', '설 연휴', '설 연휴 기간', -0.10, 'manual'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2025-03-01', 'season', '신학기', '새 학기 시작', 0.15, 'manual');

-- 외부 여론 (심전도)
INSERT INTO external_sentiments (org_id, keyword, mention_count, sentiment, trend, source) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '사교육비', 45, -0.3, 'rising', 'news'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '학원비', 32, -0.2, 'stable', 'social'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '영어학원', 28, 0.1, 'stable', 'community'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '내신대비', 20, 0.2, 'rising', 'community');

-- 알림
INSERT INTO alerts (id, org_id, customer_id, level, title, description, related_type, status, created_at) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'critical', '김민수 온도 38° 위험', '비용 민감, 이탈확률 42%', 'temperature', 'active', NOW() - INTERVAL '10 minutes'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'warning', 'D학원 프로모션 감지', '반경 1km 내 신규 할인 프로모션', 'competitor', 'active', NOW() - INTERVAL '1 hour'),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'opportunity', 'C학원 강사 퇴사 소식', '우수 강사 영입 기회', 'competitor', 'active', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- 액션 (할일)
INSERT INTO actions (id, org_id, customer_id, alert_id, priority, title, context, assignee_id, due_date, strategy_name, strategy_reasoning, expected_effect, tips, status) VALUES
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 1, '김민수 학부모 상담', '온도 38°, 이탈확률 42%', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', CURRENT_DATE, '가치 재인식 상담', '비용 민감 Voice + 경쟁사 프로모션 노출', '{"temperatureChange": 15, "churnReduction": 0.15}', '["가격 대비 성적 향상 데이터 제시", "타학원 대비 강사 전문성 강조"]', 'pending'),
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 2, 'D학원 대응 전략', '경쟁사 프로모션 감지', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', CURRENT_DATE + 1, '차별화 전략', '가격 경쟁보다 품질 차별화', '{"temperatureChange": 5, "churnReduction": 0.05}', '["우리만의 강점 강조", "기존 학생 만족도 조사"]', 'pending')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- 고객 관계 (네트워크)
INSERT INTO customer_relationships (org_id, from_customer_id, to_customer_id, relationship_type, strength) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'referral', 0.8),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'referral', 0.7),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'classmate', 0.5)
ON CONFLICT (from_customer_id, to_customer_id) DO UPDATE SET strength = EXCLUDED.strength;

-- 리드 (잠재 고객 - 퍼널용)
INSERT INTO leads (org_id, name, phone, stage, source, created_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '잠재1', '010-0001-0001', 'awareness', 'online', NOW() - INTERVAL '30 days'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '잠재2', '010-0002-0002', 'interest', 'referral', NOW() - INTERVAL '20 days'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '잠재3', '010-0003-0003', 'trial', 'walk_in', NOW() - INTERVAL '10 days');

-- 시나리오 (수정구)
INSERT INTO scenarios (org_id, name, description, params, predicted_customers, predicted_revenue, predicted_churn_rate, is_recommended) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '현상 유지', '현재 전략 유지', '{"budget": 0}', 127, 5080, 8.0, false),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '적극 방어', '이탈 방지 집중', '{"budget": 500000}', 140, 5600, 4.0, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '확장 공격', '신규 모집 강화', '{"budget": 1000000}', 160, 6400, 6.0, false);

-- 조직 통계 초기화
SELECT update_organization_stats('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
