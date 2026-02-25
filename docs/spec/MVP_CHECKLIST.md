# ✅ AUTUS MVP 개발 체크리스트

> MVP 목표: 학원 1곳에서 3개월 파일럿 운영

---

## 📋 개발 우선순위

```
🔴 P0 (필수) - MVP 런칭 전 필수
🟡 P1 (중요) - 런칭 후 2주 내
🟢 P2 (개선) - 런칭 후 1달 내
⚪ P3 (나중) - 차기 버전
```

---

## 1. 🔐 인증/인가 (P0)

### Backend
- [ ] 🔴 JWT 기반 인증 구현
- [ ] 🔴 역할별 권한 체크 미들웨어
- [ ] 🔴 토큰 갱신 로직
- [ ] 🟡 비밀번호 재설정

### Frontend
- [ ] 🔴 로그인 페이지
- [ ] 🔴 토큰 저장/관리 (Zustand)
- [ ] 🔴 인증 상태 체크 HOC
- [ ] 🟡 자동 로그인/로그아웃

---

## 2. 🎒 학생 관리 (P0)

### Backend
- [ ] 🔴 학생 CRUD API
- [ ] 🔴 학생 목록 조회 (페이지네이션, 필터)
- [ ] 🔴 학생 상세 조회
- [ ] 🔴 온도(σ) 계산 로직
- [ ] 🟡 학생 검색
- [ ] 🟡 학생 일괄 등록 (CSV)

### Frontend
- [ ] 🔴 학생 목록 페이지
- [ ] 🔴 학생 상세 페이지
- [ ] 🔴 온도 히스토리 차트
- [ ] 🟡 학생 등록 폼
- [ ] 🟡 학생 검색 UI

### Database
- [ ] 🔴 students 테이블
- [ ] 🔴 temperature_history 테이블
- [ ] 🔴 student_sigma_factors 테이블

---

## 3. ✏️ Quick Tag (기록) (P0)

### Backend
- [ ] 🔴 기록 생성 API
- [ ] 🔴 기록 → 온도 변화 로직
- [ ] 🔴 기록 목록 조회 API
- [ ] 🔴 오늘 기록 현황 API
- [ ] 🟡 기록 수정/삭제 API

### Frontend
- [ ] 🔴 Quick Tag 플로팅 버튼
- [ ] 🔴 Quick Tag 입력 모달
  - [ ] 학생 선택
  - [ ] 감정 슬라이더 (-20 ~ +20)
  - [ ] 유대관계 선택 (강함/보통/냉담)
  - [ ] 이슈 태그 선택
  - [ ] 메모 입력
- [ ] 🔴 기록 완료 애니메이션
- [ ] 🟡 기록 히스토리 페이지

### Database
- [ ] 🔴 records 테이블
- [ ] 🔴 record_tags 테이블

---

## 4. 🚨 Risk Queue (P0)

### Backend
- [ ] 🔴 위험 학생 자동 감지 로직
- [ ] 🔴 Risk Queue 목록 API
- [ ] 🔴 조치 기록 API
- [ ] 🔴 이탈 확률 계산 로직
- [ ] 🟡 AI 추천 조치 생성

### Frontend
- [ ] 🔴 Risk Queue 페이지
- [ ] 🔴 학생 카드 UI (이유, 추천 조치)
- [ ] 🔴 조치 버튼 (챙기기, 해결, 상위보고)
- [ ] 🟡 필터 (미조치/진행중/완료)

### Database
- [ ] 🔴 risk_queue 테이블
- [ ] 🔴 risk_actions 테이블

---

## 5. 📊 대시보드 (P0)

### Backend
- [ ] 🔴 KPI 조회 API
- [ ] 🔴 주간 변화량 API
- [ ] 🔴 선생님별 현황 API

### Frontend
- [ ] 🔴 선생님 대시보드
  - [ ] 🔴 연속 기록 표시
  - [ ] 🔴 "지금 바로" 섹션
  - [ ] 🔴 오늘 수업 목록
- [ ] 🔴 실장 대시보드
  - [ ] 🔴 KPI 4개 카드
  - [ ] 🔴 주간 변화량
  - [ ] 🔴 관심 필요 목록
  - [ ] 🔴 선생님별 현황
- [ ] 🟡 원장 대시보드
- [ ] 🟡 학부모 대시보드
- [ ] 🟡 학생 대시보드

---

## 6. 🔔 알림 (P1)

### Backend
- [ ] 🟡 알림 생성 로직
- [ ] 🟡 알림 목록 API
- [ ] 🟡 읽음 처리 API
- [ ] 🟢 푸시 알림 (FCM)

### Frontend
- [ ] 🟡 알림 센터 UI
- [ ] 🟡 알림 벨 아이콘 (뱃지)
- [ ] 🟡 토스트 알림
- [ ] 🟢 푸시 알림 권한 요청

---

## 7. 💬 메시지 (P1)

### Backend
- [ ] 🟡 메시지 발송 API
- [ ] 🟡 메시지 템플릿 API
- [ ] 🟡 메시지 히스토리 API
- [ ] 🟢 자동 메시지 스케줄러

### Frontend
- [ ] 🟡 메시지 작성 UI
- [ ] 🟡 템플릿 선택 UI
- [ ] 🟡 메시지 히스토리
- [ ] 🟢 자동 완성 (AI)

### Database
- [ ] 🟡 messages 테이블
- [ ] 🟡 message_templates 테이블

---

## 8. 📈 리포트 (P1)

### Backend
- [ ] 🟡 학생 주간 리포트 생성
- [ ] 🟡 학원 대시보드 데이터
- [ ] 🟢 월간 리포트
- [ ] 🟢 PDF 생성

### Frontend
- [ ] 🟡 리포트 조회 페이지
- [ ] 🟡 학생 성장 그래프
- [ ] 🟢 PDF 다운로드

---

## 9. 🎮 게이미피케이션 (P2)

### Backend
- [ ] 🟢 XP 시스템
- [ ] 🟢 레벨 시스템
- [ ] 🟢 뱃지 시스템
- [ ] 🟢 리더보드

### Frontend
- [ ] 🟢 XP 바 컴포넌트
- [ ] 🟢 레벨업 애니메이션
- [ ] 🟢 뱃지 컬렉션
- [ ] 🟢 리더보드 페이지

### Database
- [ ] 🟢 user_gamification 테이블
- [ ] 🟢 badges 테이블
- [ ] 🟢 user_badges 테이블

---

## 10. 🚀 온보딩 (P2)

### Frontend
- [ ] 🟢 역할별 온보딩 플로우
- [ ] 🟢 첫 사용 안내
- [ ] 🟢 기능 투어

---

## 11. ⚙️ 설정 (P2)

### Backend
- [ ] 🟢 사용자 설정 API
- [ ] 🟢 알림 설정 API
- [ ] 🟢 학원 설정 API

### Frontend
- [ ] 🟢 프로필 설정
- [ ] 🟢 알림 설정
- [ ] 🟢 테마 설정

---

## 🗄️ 데이터베이스 스키마 (P0)

```sql
-- 필수 테이블 (P0)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL, -- EXECUTOR, OPERATOR, OWNER, PARENT, STUDENT
  academy_id UUID REFERENCES academies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade VARCHAR(50),
  birthday DATE,
  dream VARCHAR(255),
  class_id UUID REFERENCES classes(id),
  parent_id UUID REFERENCES users(id),
  academy_id UUID REFERENCES academies(id),
  temperature DECIMAL(5,2) DEFAULT 70,
  sigma DECIMAL(5,4) DEFAULT 0.5,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE records (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  teacher_id UUID REFERENCES users(id),
  emotion INTEGER CHECK (emotion BETWEEN -20 AND 20),
  bond VARCHAR(20), -- strong, normal, cold
  memo TEXT,
  is_positive BOOLEAN DEFAULT true,
  temperature_change DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE record_tags (
  id UUID PRIMARY KEY,
  record_id UUID REFERENCES records(id),
  tag VARCHAR(50) NOT NULL
);

CREATE TABLE risk_queue (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  reason TEXT,
  suggested_action TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, resolved
  priority VARCHAR(20) DEFAULT 'medium', -- critical, high, medium, low
  churn_probability DECIMAL(5,2),
  assigned_teacher_id UUID REFERENCES users(id),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE temperature_history (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  temperature DECIMAL(5,2),
  recorded_at DATE DEFAULT CURRENT_DATE
);
```

---

## 🧪 테스트 체크리스트

### Unit Tests (P1)
- [ ] 🟡 온도 계산 로직
- [ ] 🟡 이탈 확률 계산
- [ ] 🟡 XP 계산 로직

### Integration Tests (P2)
- [ ] 🟢 인증 플로우
- [ ] 🟢 기록 → 온도 변화
- [ ] 🟢 Risk Queue 자동 감지

### E2E Tests (P2)
- [ ] 🟢 로그인 → 기록 → 확인 플로우
- [ ] 🟢 학생 등록 → 기록 → 리포트 플로우

---

## 🚀 배포 체크리스트

### Infrastructure (P0)
- [ ] 🔴 Vercel 프로젝트 설정
- [ ] 🔴 Supabase 프로젝트 설정
- [ ] 🔴 환경 변수 설정
- [ ] 🔴 도메인 연결

### Security (P0)
- [ ] 🔴 HTTPS 적용
- [ ] 🔴 환경 변수 암호화
- [ ] 🔴 CORS 설정
- [ ] 🟡 Rate Limiting

### Monitoring (P1)
- [ ] 🟡 에러 트래킹 (Sentry)
- [ ] 🟡 성능 모니터링
- [ ] 🟢 로그 수집

---

## 📅 MVP 마일스톤

### Week 1-2: 핵심 기능
- [ ] 인증 시스템
- [ ] 학생 CRUD
- [ ] Quick Tag
- [ ] Risk Queue

### Week 3-4: 대시보드
- [ ] 선생님 대시보드
- [ ] 실장 대시보드
- [ ] 기본 알림

### Week 5-6: 통합 & 테스트
- [ ] 메시지 시스템
- [ ] 리포트
- [ ] QA & 버그 수정

### Week 7-8: 파일럿 준비
- [ ] 온보딩 플로우
- [ ] 사용자 교육 자료
- [ ] 파일럿 학원 설정

---

## 📊 MVP 성공 지표

| 지표 | 목표 | 측정 방법 |
|-----|------|----------|
| DAU | 80% 이상 | 일일 로그인 / 전체 사용자 |
| 기록률 | 70% 이상 | 기록한 날 / 근무일 |
| 이탈 방지 | 5명 이상 | Risk Queue 해결 건수 |
| 사용자 만족도 | 8점 이상 | NPS 조사 |

---

*Build on the Rock. 🏛️*
