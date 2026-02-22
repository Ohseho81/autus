# ✅ Week 1 체크리스트 (7일)

**목표**: Supabase + FastAPI 기본 구조 완성 + 카카오톡 알림 연동

---

## 📅 Day 1-2: 데이터베이스 + API (완료율: 60%)

### ✅ 완료된 작업

- [x] Supabase 프로젝트 생성
- [x] 5개 테이블 DDL 작성 (supabase_schema_v1.sql)
- [x] FastAPI 기본 구조 작성 (main.py)
- [x] 10개 API 엔드포인트 개발
- [x] 학생 데이터 준비 (781명)

### 🔴 진행 중 / 차단

- [ ] **[차단]** Supabase 테이블 실제 생성
  - **문제**: Service Role Key 401 오류
  - **해결**: FIX_401_ERROR.md 참고
  - **소요 시간**: 5분

- [ ] **[진행 필요]** 학생 데이터 업로드
  - **방법 1**: upload_students_to_supabase.py (Service Role Key 수정 후)
  - **방법 2**: upload_students_secure.py (환경 변수 사용 - 권장)
  - **소요 시간**: 5분

- [ ] **[진행 필요]** FastAPI 로컬 실행
  ```bash
  # 환경 변수 설정
  export SUPABASE_URL="https://pphzvnaedmzcvpxjulti.supabase.co"
  export SUPABASE_SERVICE_KEY="your-service-role-key"

  # 서버 실행
  python3 main.py

  # 확인
  http://localhost:8000/docs
  ```
  - **소요 시간**: 5분

---

## 📅 Day 3-4: 카카오 비즈니스 준비

### 🔲 해야 할 작업

- [ ] **카카오 비즈니스 채널 생성**
  - 사이트: https://kakaobusiness.com
  - 준비물: 사업자등록증
  - 소요 시간: 30분

- [ ] **Solapi 계정 생성**
  - 사이트: https://solapi.com
  - API Key 발급
  - 초기 충전: 10만원
  - 소요 시간: 20분

- [ ] **알림톡 템플릿 5개 작성**
  1. 출석 체크 알림
  2. 결석 알림
  3. 수업 결과 알림
  4. 결제 완료 알림
  5. 미수금 안내 알림

  - 승인 대기: 1-2 영업일
  - 소요 시간: 1시간

---

## 📅 Day 5-7: 카카오 연동 개발

### 🔲 해야 할 작업

- [ ] **Solapi 연동 테스트**
  ```bash
  python3 solapi_integration.py
  ```
  - 테스트 메시지 발송
  - 소요 시간: 30분

- [ ] **FastAPI 웹훅 개발**
  - 출석 체크 → 알림 자동화
  - 결제 완료 → 알림 자동화
  - 소요 시간: 4시간

- [ ] **Supabase Edge Function 작성** (선택)
  - 결석 자동 감지
  - 매일 자정 실행
  - 소요 시간: 2시간

---

## 📊 Week 1 산출물

### 필수 산출물

1. **데이터베이스**
   - ✅ 5개 테이블 (profiles, payments, schedules, bookings, notifications)
   - ✅ 2개 뷰 (unpaid_payments, today_bookings)
   - ⏳ 781명 학생 데이터

2. **API**
   - ✅ 10개 엔드포인트
   - ⏳ 로컬 테스트 완료
   - ❌ 웹훅 연동 (Day 5-7)

3. **알림**
   - ❌ 카카오 비즈니스 채널
   - ❌ 5개 템플릿 승인
   - ❌ 카카오톡 알림 2종 (출석, 결제)

---

## 🎯 Week 1 종료 조건

모든 항목이 ✅ 상태여야 Week 2로 진행 가능:

- [ ] Supabase에 781명 학생 데이터 존재
- [ ] FastAPI 서버 로컬 실행 가능
- [ ] `/profiles`, `/payments`, `/attendance` 엔드포인트 동작
- [ ] 카카오 비즈니스 채널 개설
- [ ] Solapi 계정 생성 + API 키 발급
- [ ] 알림톡 템플릿 5개 승인 완료 (또는 승인 대기 중)

---

## 🚨 현재 우선순위 (지금 당장!)

### Priority 1: 401 오류 해결 (5분)

```bash
# 1. Supabase 대시보드에서 Service Role Key 복사
https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti
→ Settings → API → service_role

# 2. 환경 변수 설정
export SUPABASE_SERVICE_KEY="실제_키_값"

# 3. 테이블 생성
# Supabase → SQL Editor → supabase_schema_v1.sql 실행

# 4. 학생 데이터 업로드 (보안 강화 버전)
python3 upload_students_secure.py
```

### Priority 2: FastAPI 테스트 (5분)

```bash
# 서버 실행
python3 main.py

# 브라우저에서 확인
http://localhost:8000/docs

# 학생 목록 조회 테스트
GET /profiles?type=student
```

### Priority 3: 카카오 계정 생성 (1시간)

- 카카오 비즈니스 채널 개설
- Solapi 가입
- 템플릿 작성 시작

---

## 📞 도움 필요시

### Supabase 관련
- 공식 문서: https://supabase.com/docs
- Discord: https://discord.supabase.com

### FastAPI 관련
- 공식 문서: https://fastapi.tiangolo.com
- Swagger UI: http://localhost:8000/docs

### 카카오 관련
- 비즈니스 고객센터: 1544-4293
- Solapi 고객센터: support@solapi.com

---

## 💰 Week 1 예산 사용

| 항목 | 금액 | 상태 |
|------|------|------|
| Supabase | 무료 | ✅ |
| Solapi 초기 충전 | 10만원 | ⏳ |
| FastAPI 개발 | 0원 (혼자) | ✅ |
| **합계** | **10만원** | |

**잔여 예산**: 2,990만원

---

## ✅ 진행 상황

```
Day 1-2: ████████░░ 80% (코드 작성 완료, 배포 대기)
Day 3-4: ░░░░░░░░░░  0% (카카오 계정 생성 필요)
Day 5-7: ░░░░░░░░░░  0% (웹훅 개발 대기)
```

**전체 진행률**: 26% (7일 중 1.8일 완료)

---

**🚀 다음 액션**: FIX_401_ERROR.md 참고하여 Service Role Key 업데이트
