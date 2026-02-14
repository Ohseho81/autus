# 🚀 온리쌤 3,000명 즉시 론칭 가이드

## 📌 현재 상태
- ✅ 환경 변수 설정 완료 (`SUPABASE_SERVICE_KEY`)
- ✅ 781명 학생 데이터 준비 완료 (`students.csv`)
- ✅ 업로드 스크립트 수정 완료 (`upload_students_fixed.py`)
- ⏳ **Supabase 테이블 생성 대기**
- ⏳ **데이터 업로드 대기**

---

## 🎯 지금 바로 실행 (10분)

### Step 1: Supabase 테이블 생성 (3분)

#### 1-1. Supabase 대시보드 접속
```
https://supabase.com/dashboard/project/dcobyicibvhpwcjqkmgw
```

#### 1-2. SQL Editor 열기
- 왼쪽 메뉴 → **SQL Editor**
- **New query** 버튼 클릭

#### 1-3. Schema SQL 복사 & 실행
1. 파일 열기:
   ```bash
   cat /Users/oseho/autus/supabase_schema_v1.sql
   ```

2. **전체 내용 복사** (Cmd+A → Cmd+C)

3. Supabase SQL Editor에 **붙여넣기** (Cmd+V)

4. **Run** 버튼 클릭 ▶️

#### 1-4. 실행 결과 확인
- ✅ SUCCESS 메시지 확인
- 왼쪽 메뉴 → **Table Editor** → `profiles` 테이블 생성 확인

---

### Step 2: 학생 데이터 업로드 (5분)

#### 2-1. 터미널에서 실행
```bash
cd /Users/oseho/autus
python3 upload_students_fixed.py
```

#### 2-2. 진행 과정
1. **기존 데이터 확인**: 0건 (처음 실행)
2. **CSV 로드**: 781건
3. **데이터 품질 검증**: 자동 실행
4. **미리보기**: 처음 3건 표시
5. **업로드 확인**: `y` 입력
6. **배치 업로드**: 50건씩 16개 배치
7. **결과 확인**: 성공/실패 통계

#### 2-3. 예상 출력
```
============================================================
📊 총 781건의 학생 데이터 업로드 시작
============================================================

[배치 1/16] 50건 업로드 중... ✅ 성공
[배치 2/16] 50건 업로드 중... ✅ 성공
...
[배치 16/16] 31건 업로드 중... ✅ 성공

============================================================
🎉 업로드 완료!
============================================================
✅ 성공: 781/781건 (100.0%)
❌ 실패: 0/781건
============================================================

🔍 업로드 검증 중...
   ✅ profiles 테이블 학생 수: 781건
```

---

### Step 3: Supabase에서 데이터 확인 (2분)

#### 3-1. Table Editor에서 확인
```
Supabase → Table Editor → profiles
```

#### 3-2. 필터 적용
```sql
type = 'student'
```

#### 3-3. 확인 항목
- ✅ 총 레코드 수: 781건
- ✅ 이름, 전화번호 정상 표시
- ✅ metadata에 school, birth_year 저장됨

---

## 🔍 문제 해결

### Q1. "No such table: profiles" 오류
**원인**: Step 1 (테이블 생성) 미실행
**해결**: Supabase SQL Editor에서 schema 먼저 실행

### Q2. "401 Unauthorized" 오류
**원인**: 환경 변수 만료
**해결**:
```bash
export SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"
echo $SUPABASE_SERVICE_KEY  # 확인
```

### Q3. 중복 데이터 오류
**원인**: 이미 업로드된 상태에서 재실행
**해결**:
```sql
-- Supabase SQL Editor에서 삭제
DELETE FROM profiles WHERE type = 'student';
```

---

## 📊 품질 검증 체크리스트

### 자동 검증 항목 (스크립트 내장)
- ✅ 필수 필드 (name, type) 존재
- ✅ 전화번호 형식 (010-xxxx-xxxx)
- ✅ 중복 이름 감지
- ✅ 개별 재시도 (배치 실패 시)
- ✅ 최종 카운트 검증

### 수동 검증 (Supabase에서)
```sql
-- 1. 총 학생 수
SELECT COUNT(*) FROM profiles WHERE type = 'student';
-- 예상: 781

-- 2. 전화번호 없는 학생
SELECT COUNT(*) FROM profiles WHERE type = 'student' AND phone IS NULL;

-- 3. metadata 확인
SELECT name, metadata->'school' as school, metadata->'birth_year' as birth_year
FROM profiles WHERE type = 'student' LIMIT 10;

-- 4. 중복 이름
SELECT name, COUNT(*) as cnt
FROM profiles WHERE type = 'student'
GROUP BY name HAVING COUNT(*) > 1;
```

---

## ⏭️ 다음 단계 (Week 1)

### 1. FastAPI 로컬 테스트
```bash
cd /Users/oseho/autus
python3 main.py
# http://127.0.0.1:8000/docs
```

### 2. Railway 배포
```bash
# Railway CLI 설치
brew install railway

# 프로젝트 생성 & 배포
railway login
railway init
railway up
```

### 3. 카카오 비즈니스 채널
- https://kakaobusiness.com
- 채널 생성 → Solapi 연동

### 4. 첫 번째 알림 전송 테스트
```python
# 10명 테스트
POST /api/notifications/send
{
  "template": "attendance_reminder",
  "student_ids": [...]
}
```

---

## 💡 TIP

### 빠른 재시작 (오류 시)
```bash
# 1. profiles 테이블 초기화
DELETE FROM profiles WHERE type = 'student';

# 2. 재업로드
python3 upload_students_fixed.py
```

### 환경 변수 영구 설정 (.zshrc)
```bash
echo 'export SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"' >> ~/.zshrc
source ~/.zshrc
```

### 성공률 100% 달성 조건
1. ✅ Supabase 테이블 먼저 생성
2. ✅ 환경 변수 확인 (`echo $SUPABASE_SERVICE_KEY`)
3. ✅ CSV 파일 위치 확인 (`ls students.csv`)
4. ✅ 인터넷 연결 확인

---

**지금 바로 Step 1부터 시작하세요! 10분이면 781명 학생 데이터가 Supabase에 안전하게 저장됩니다.** 🚀
