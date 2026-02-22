# 🚀 AUTUS 3,000명 즉시 론칭 가이드

**목표**: 8주 안에 3,000명 론칭
**예산**: 3,000만원
**인력**: 혼자 시작 → 개발자 1명 채용

---

## ⚡ 지금 당장 실행 (30분)

### 1. Supabase 테이블 생성

```bash
# 1. Supabase 대시보드 접속
https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti

# 2. SQL Editor 열기
좌측 메뉴 → SQL Editor → New query

# 3. supabase_schema_v1.sql 내용 복사 & 실행
[파일 열기] → 전체 선택 → 복사 → 붙여넣기 → Run

# 4. 확인
✅ profiles
✅ payments
✅ schedules
✅ bookings
✅ notifications
```

**소요 시간**: 5분

---

### 2. FastAPI 로컬 실행

```bash
# 1. 패키지 설치
pip3 install fastapi uvicorn supabase --break-system-packages

# 2. 환경 변수 설정
export SUPABASE_URL="https://pphzvnaedmzcvpxjulti.supabase.co"
export SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"  # Service Role Key

# 3. 서버 실행
python3 main.py

# 4. 확인
http://localhost:8000/docs
```

**소요 시간**: 10분

---

### 3. 테스트 데이터 생성

```bash
# API Docs에서 직접 테스트
http://localhost:8000/docs

# 1. 학생 프로필 생성
POST /profiles
{
  "type": "student",
  "name": "오선우",
  "phone": "010-2048-6048",
  "metadata": {"school": "옥정중", "grade": "2"}
}

# 2. 결제 생성
POST /payments
{
  "student_id": "uuid-of-oseonwoo",
  "total_amount": 200000,
  "paid_amount": 0,
  "invoice_date": "2026-02-14",
  "due_date": "2026-03-01"
}

# 3. 출석 체크
POST /attendance/check
{
  "student_id": "uuid-of-oseonwoo",
  "class_date": "2026-02-14",
  "attendance_status": "present"
}

# 4. 대시보드 확인
GET /stats/dashboard
```

**소요 시간**: 15분

---

## 📅 8주 상세 타임라인

### Week 1: Supabase + FastAPI (혼자)

**Day 1-2**:
- [x] Supabase 테이블 생성
- [x] FastAPI 기본 API 완성
- [ ] 로컬 테스트

**Day 3-4**:
- [ ] 카카오 비즈니스 채널 생성
- [ ] Solapi 계정 + API 키 발급
- [ ] 템플릿 5개 작성 & 승인 신청

**Day 5-7**:
- [ ] FastAPI 카카오 연동 개발
- [ ] 출석 체크 → 알림 자동화
- [ ] 결제 완료 → 알림 자동화

**산출물**:
- ✅ 5개 테이블
- ✅ 10개 API 엔드포인트
- ✅ 카카오톡 알림 2종

---

### Week 2: 관리자 UI (혼자)

**Day 1-3**:
- [ ] Next.js 프로젝트 생성
- [ ] 학생 목록 페이지
- [ ] 결제 관리 페이지

**Day 4-5**:
- [ ] 출석 체크 페이지
- [ ] 대시보드 (통계)

**Day 6-7**:
- [ ] Railway 배포
- [ ] 도메인 연결
- [ ] HTTPS 설정

**산출물**:
- ✅ 관리자 웹 페이지 (4개)
- ✅ 배포 완료

---

### Week 3: 개발자 채용 (중요!)

**Day 1-3**:
- [ ] 채용 공고 작성 & 게시
  - 원티드, 프로그래머스, 커리어리
  - 조건: FastAPI + PostgreSQL 경험
  - 급여: 월 400만원 (2개월 계약)

**Day 4-7**:
- [ ] 서류 심사
- [ ] 1차 면접 (기술)
- [ ] 2차 면접 (핏)
- [ ] 최종 선발

**산출물**:
- ✅ 개발자 1명 합류

---

### Week 4-5: 2명 협업 - 학부모 포털

**사용자 (당신)**:
- [ ] ClickHouse 설치 & 연동
- [ ] Event Ledger 마이그레이션
- [ ] AI 파이프라인 설계

**개발자**:
- [ ] 학부모 포털 UI (Next.js)
- [ ] 로그인 (카카오 간편 로그인)
- [ ] 내 아이 페이지 (출석, 성적, 결제)

**산출물**:
- ✅ ClickHouse Event Ledger
- ✅ 학부모 포털 (5개 페이지)

---

### Week 6: 베타 테스트 (100명)

**Day 1-2**:
- [ ] 베타 테스터 100명 선발
- [ ] 안내 메시지 발송
- [ ] 온보딩

**Day 3-5**:
- [ ] 버그 수집
- [ ] 긴급 수정
- [ ] 피드백 반영

**Day 6-7**:
- [ ] 성능 테스트
- [ ] 부하 테스트
- [ ] 최적화

**산출물**:
- ✅ 100명 사용자 데이터
- ✅ 버그 수정 완료

---

### Week 7: 1,000명 확장

**Day 1-3**:
- [ ] 서버 스케일 업
- [ ] DB 최적화
- [ ] CDN 설정

**Day 4-7**:
- [ ] 1,000명 온보딩
- [ ] 모니터링 강화
- [ ] 긴급 대응 체계

**산출물**:
- ✅ 1,000명 활성 사용자

---

### Week 8: 3,000명 론칭

**Day 1-2**:
- [ ] 최종 점검
- [ ] 백업 시스템
- [ ] 장애 대응 매뉴얼

**Day 3-7**:
- [ ] 3,000명 전체 온보딩
- [ ] 24시간 모니터링
- [ ] 실시간 지원

**산출물**:
- ✅ 3,000명 론칭 완료
- ✅ 월 300만원 매출 시작

---

## 💰 예산 사용 계획

| Week | 항목 | 금액 | 누적 |
|------|------|------|------|
| 1 | Solapi 충전 | 10만원 | 10만원 |
| 2 | Railway 배포 | 5만원 | 15만원 |
| 3 | 개발자 채용비 | 50만원 | 65만원 |
| 4-5 | 개발자 급여 (1개월) | 400만원 | 465만원 |
| 6 | 테스트 비용 | 30만원 | 495만원 |
| 7-8 | 개발자 급여 (1개월) | 400만원 | 895만원 |
| 7-8 | 인프라 확장 | 100만원 | 995만원 |
| 8 | 마케팅 | 200만원 | 1,195만원 |
| **예비** | 긴급 상황 | 1,805만원 | **3,000만원** |

---

## 📊 KPI 추적

### Week 2 목표
- [ ] API 응답 시간 < 100ms
- [ ] 알림 발송률 100%
- [ ] 버그 0건

### Week 6 목표 (100명 베타)
- [ ] 사용자 만족도 > 80%
- [ ] 버그 < 5건
- [ ] Uptime > 99%

### Week 8 목표 (3,000명 론칭)
- [ ] 활성 사용자 > 2,500명
- [ ] 월 매출 > 300만원
- [ ] Uptime > 99.9%

---

## 🚨 리스크 대응

### 리스크 1: 개발 지연
**대응**:
- MVP 기능만 집중 (출석 + 결제)
- 나머지 기능은 Phase 2로

### 리스크 2: 개발자 채용 실패
**대응**:
- 외주 개발사 백업 (200만원/월)
- 프리랜서 플랫폼 활용

### 리스크 3: 비용 초과
**대응**:
- 인프라 최소화 (Railway 무료 플랜 최대 활용)
- 개발자 단기 계약 (2개월)

---

## ✅ 체크리스트 (지금 바로)

### 즉시 실행 (오늘)
- [ ] Supabase 테이블 생성 (5분)
- [ ] FastAPI 로컬 실행 (10분)
- [ ] 테스트 데이터 생성 (15분)
- [ ] 카카오 비즈니스 채널 신청 (30분)
- [ ] Solapi 계정 생성 (10분)

### 이번 주 (Week 1)
- [ ] 카카오 템플릿 승인
- [ ] 출석 알림 자동화
- [ ] 결제 알림 자동화

### 다음 주 (Week 2)
- [ ] 관리자 UI 개발
- [ ] Railway 배포

---

## 📞 도움 필요시

**기술 문의**:
- Supabase 문서: https://supabase.com/docs
- FastAPI 문서: https://fastapi.tiangolo.com

**채용 지원**:
- 원티드: https://www.wanted.co.kr
- 프로그래머스: https://programmers.co.kr/job

---

**🚀 지금 바로 시작하세요!**
**첫 단계**: Supabase 테이블 생성 (5분)
