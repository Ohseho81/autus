# 🔧 401 오류 해결 가이드

## 문제 상황
- **오류**: `Invalid API key` (401 Unauthorized)
- **영향**: 781명 학생 데이터 업로드 실패
- **원인**: Service Role Key 인증 실패

---

## ✅ 해결 방법 (5분)

### Step 1: Supabase 대시보드에서 올바른 키 확인

1. **Supabase 대시보드 접속**
   ```
   https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti
   ```

2. **Settings → API 메뉴로 이동**
   - 좌측 사이드바: ⚙️ Settings
   - API 클릭

3. **Service Role Key 복사**
   - `service_role` 키 찾기
   - "Reveal" 버튼 클릭
   - **전체 키 복사** (매우 긴 문자열)

**중요**: `anon` key가 아닌 `service_role` key를 사용해야 합니다!

---

### Step 2: 업로드 스크립트 업데이트

올바른 Service Role Key를 확인한 후:

```bash
# 1. 스크립트 열기
nano /sessions/modest-bold-einstein/mnt/autus/upload_students_to_supabase.py

# 2. 25번째 줄 수정
# 기존:
SUPABASE_SERVICE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"

# 새로 복사한 키로 교체:
SUPABASE_SERVICE_KEY = "여기에_새로운_service_role_key_붙여넣기"
```

---

### Step 3: 테이블 생성 확인

학생 데이터 업로드 전에 테이블이 생성되어 있어야 합니다.

```bash
# Supabase 대시보드 → SQL Editor → New Query

# supabase_schema_v1.sql 전체 내용 복사 & 실행
```

**확인 사항**:
- ✅ profiles 테이블
- ✅ payments 테이블
- ✅ schedules 테이블
- ✅ bookings 테이블
- ✅ notifications 테이블

---

### Step 4: 학생 데이터 재업로드

```bash
# 올바른 Service Role Key로 업데이트한 후 실행
python3 /sessions/modest-bold-einstein/mnt/autus/upload_students_to_supabase.py
```

**성공 메시지**:
```
✅ 성공: 781/781건
❌ 실패: 0/781건
```

---

## 🔐 보안 주의사항

**Service Role Key는 절대 공개하지 마세요!**

- GitHub에 커밋 금지
- 환경 변수로 관리 권장
- 프로덕션 배포 시 Railway Secrets 사용

```bash
# 환경 변수로 관리 (권장)
export SUPABASE_SERVICE_KEY="실제_키_값"
python3 upload_students_to_supabase.py
```

---

## 📋 체크리스트

업로드 성공을 위한 필수 조건:

- [ ] Supabase 프로젝트 활성화 상태
- [ ] Service Role Key 정확히 복사
- [ ] profiles 테이블 생성 완료
- [ ] students.csv 파일 존재 (781 records)
- [ ] Python supabase 패키지 설치

---

## 🆘 추가 오류 발생 시

### 오류: "relation 'profiles' does not exist"
→ Step 3으로 돌아가서 테이블 생성

### 오류: "duplicate key value violates unique constraint"
→ 기존 데이터가 있음. 삭제 후 재시도:
```sql
DELETE FROM profiles WHERE type = 'student';
```

### 오류: "connection timeout"
→ 인터넷 연결 확인

---

## ✅ 성공 후 다음 단계

1. **Supabase 대시보드에서 데이터 확인**
   - Table Editor → profiles
   - 781명 학생 데이터 확인

2. **FastAPI 서버 실행**
   ```bash
   python3 /sessions/modest-bold-einstein/mnt/autus/main.py
   ```

3. **API 테스트**
   ```
   http://localhost:8000/docs
   GET /profiles?type=student
   ```

---

**예상 소요 시간**: 5분
**난이도**: ⭐ (매우 쉬움)
