# 🚀 AUTUS 3,000명 론칭 - 지금 바로 시작 (5분)

**현재 상황**: 401 오류로 학생 데이터 업로드 차단
**해결 시간**: 5분
**다음 단계**: FastAPI 서버 실행 (2분)

---

## ⚡ 즉시 실행 (순서대로)

### Step 1: Supabase Service Role Key 확인 (1분)

```bash
# 1. 브라우저에서 Supabase 대시보드 열기
https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti

# 2. Settings → API 클릭

# 3. "Project API keys" 섹션에서:
#    - anon key (공개용) ❌ 이거 아님!
#    - service_role key (관리자용) ✅ 이거!

# 4. service_role 옆 "Reveal" 버튼 클릭

# 5. 전체 키 복사 (매우 긴 문자열, 약 200자)
```

---

### Step 2: 환경 변수 설정 (1분)

```bash
# 터미널에서 실행 (복사한 키 붙여넣기)
export SUPABASE_SERVICE_KEY="여기에_복사한_service_role_key_붙여넣기"

# 확인
echo $SUPABASE_SERVICE_KEY
# → 긴 문자열이 출력되면 성공
```

**중요**: 매 터미널 세션마다 설정 필요
(또는 ~/.bashrc / ~/.zshrc에 추가하여 영구 저장)

---

### Step 3: Supabase 테이블 생성 (2분)

```bash
# 1. Supabase 대시보드 → SQL Editor
https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti/sql

# 2. "New query" 버튼 클릭

# 3. supabase_schema_v1.sql 파일 내용 복사

# 4. SQL Editor에 붙여넣기

# 5. 우측 하단 "Run" 버튼 클릭

# 6. 성공 메시지 확인:
#    ✅ AUTUS 3,000명 즉시 론칭용 스키마 생성 완료!
```

**확인 방법**:
- 좌측 메뉴 → Table Editor
- profiles, payments, schedules, bookings, notifications 테이블 보임

---

### Step 4: 설정 검증 (1분)

```bash
# 검증 스크립트 실행
python3 /sessions/modest-bold-einstein/mnt/autus/verify_setup.py
```

**성공 화면**:
```
✅ SUPABASE_SERVICE_KEY 설정됨
✅ Supabase 클라이언트 생성 성공
✅ profiles 테이블 존재
✅ payments 테이블 존재
✅ schedules 테이블 존재
✅ bookings 테이블 존재
✅ notifications 테이블 존재
```

**실패 시**:
- Step 1-3 다시 확인
- FIX_401_ERROR.md 참고

---

### Step 5: 학생 데이터 업로드 (2분)

```bash
# 보안 강화 버전 사용 (환경 변수)
python3 /sessions/modest-bold-einstein/mnt/autus/upload_students_secure.py
```

**성공 화면**:
```
✅ Supabase 연결 성공
✅ profiles 테이블 접근 가능
✅ CSV 로드 완료: 781명

[Batch 1/16] 50명 업로드 중...
  ✅ 성공: 50명

[Batch 2/16] 50명 업로드 중...
  ✅ 성공: 50명

...

✅ 성공: 781/781명
❌ 실패: 0/781명

✅ 모든 학생 데이터 업로드 완료!
```

**Supabase에서 확인**:
- Table Editor → profiles → 781 rows

---

## 🎉 완료! 다음 단계는?

### Option 1: FastAPI 서버 실행 (로컬 테스트)

```bash
# 서버 시작
python3 /sessions/modest-bold-einstein/mnt/autus/main.py
```

**성공 화면**:
```
============================================================
🚀 AUTUS API 서버 시작
============================================================

📊 Docs: http://localhost:8000/docs
🔍 Health: http://localhost:8000/

INFO:     Uvicorn running on http://0.0.0.0:8000
```

**브라우저에서 테스트**:
1. http://localhost:8000/docs 열기
2. `GET /profiles` → Try it out → Execute
3. 781명 학생 데이터 확인

---

### Option 2: 카카오 비즈니스 준비 (1시간)

```bash
# 1. 카카오 비즈니스 채널 생성
https://kakaobusiness.com

# 2. Solapi 가입
https://solapi.com

# 3. 알림톡 템플릿 5개 작성
- 출석 체크
- 결석 알림
- 수업 결과
- 결제 완료
- 미수금 안내
```

**자세한 내용**: KAKAO_IMPLEMENTATION_GUIDE.md 참고

---

### Option 3: Railway 배포 (Week 2)

```bash
# Railway 계정 생성
https://railway.app

# GitHub 연동 후 자동 배포
# 상세 가이드는 Week 2에서
```

---

## 📋 현재 진행 상황

```
✅ Supabase 프로젝트 생성
✅ 5개 테이블 DDL 작성
✅ FastAPI 10개 엔드포인트 개발
⏳ Supabase 테이블 생성 (Step 3)
⏳ 학생 데이터 업로드 (Step 5)
❌ 카카오 비즈니스 연동
❌ 관리자 UI
❌ 베타 테스트
❌ 3,000명 론칭
```

**Week 1 진행률**: 26% → Step 3-5 완료 시 80%

---

## 🆘 문제 해결

### 오류: "Invalid API key"
→ Step 1-2 다시 확인 (service_role key인지 확인)

### 오류: "relation 'profiles' does not exist"
→ Step 3 Supabase 테이블 생성 필요

### 오류: "duplicate key value"
→ 이미 업로드됨. Supabase에서 확인

### 오류: "connection timeout"
→ 인터넷 연결 확인

### 오류: "command not found: python3"
→ `python` 또는 `python3.11` 시도

---

## 📁 파일 가이드

| 파일 | 용도 |
|------|------|
| **FIX_401_ERROR.md** | 401 오류 해결 가이드 (지금 보는 문서) |
| **verify_setup.py** | 설정 검증 스크립트 |
| **upload_students_secure.py** | 학생 데이터 업로드 (환경 변수 버전) |
| **upload_students_to_supabase.py** | 학생 데이터 업로드 (하드코딩 버전) |
| **main.py** | FastAPI 서버 |
| **supabase_schema_v1.sql** | Supabase 테이블 생성 SQL |
| **WEEK1_CHECKLIST.md** | Week 1 진행 상황 체크리스트 |
| **README_QUICK_START.md** | 8주 전체 로드맵 |

---

## ⏱️ 예상 소요 시간

| 단계 | 시간 | 누적 |
|------|------|------|
| Step 1: Service Role Key 확인 | 1분 | 1분 |
| Step 2: 환경 변수 설정 | 1분 | 2분 |
| Step 3: Supabase 테이블 생성 | 2분 | 4분 |
| Step 4: 설정 검증 | 1분 | 5분 |
| Step 5: 학생 데이터 업로드 | 2분 | 7분 |
| **합계** | | **7분** |

---

## 🎯 성공 기준

모든 항목이 ✅여야 성공:

- [ ] Supabase 테이블 5개 생성
- [ ] 학생 데이터 781명 업로드
- [ ] FastAPI 서버 로컬 실행 가능
- [ ] API 문서 접근 가능 (http://localhost:8000/docs)

---

**🚀 지금 바로 Step 1부터 시작하세요!**

Step 1 → https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti/settings/api
