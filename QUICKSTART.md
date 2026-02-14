# 🚀 AUTUS 즉시 실행 가이드

## 현재 상태
✅ 환경 변수 설정 완료
✅ SQL 스키마 준비 완료 (`EXECUTE_THIS.sql`)
✅ 업로드 스크립트 준비 완료 (`scripts/upload_students_fixed.py`)
✅ 학생 데이터 준비 완료 (`students.csv` - 781명)

---

## Step 1: Supabase 테이블 생성 (2분)

### 1-1. SQL 파일 내용 복사
터미널에서 실행:
```bash
cat EXECUTE_THIS.sql
```

### 1-2. Supabase에 붙여넣기
1. 브라우저로 이동:
   ```
   https://supabase.com/dashboard/project/dcobyicibvhpwcjqkmgw
   ```

2. 왼쪽 메뉴 → **SQL Editor** → **New query**

3. 터미널에서 복사한 내용을 **붙여넣기** (Cmd+V)

4. **Run** 버튼 클릭 ▶️

5. 성공 메시지 확인:
   ```
   ✅ AUTUS Schema 완료!
   ```

---

## Step 2: 학생 데이터 업로드 (3분)

터미널에서 실행:
```bash
python3 scripts/upload_students_fixed.py
```

### 예상 출력:
```
============================================================
📚 온리쌤 학생 데이터 업로드 시스템 v2.0
============================================================

🔍 기존 데이터 확인 중...
   현재 profiles 테이블 (type=student): 0건

📂 students.csv 파일 로드 중...
   ✅ 781건 로드 완료

🔍 데이터 품질 검증 중...
   ✅ 모든 검증 통과!

📋 데이터 미리보기 (처음 3건):
   1. 오은우 - 010-2048-6048 - 학교미정 (2016년생)
   2. 진은기 - 010-3213-7099 - BEK (2015년생)
   3. 한민기 - 010-9435-2704 - 대현 (2015년생)

✅ 781건의 데이터를 업로드하시겠습니까? (y/n): y

============================================================
📊 총 781건의 학생 데이터 업로드 시작
============================================================

[배치 1/16] 50건 업로드 중... ✅ 성공
[배치 2/16] 50건 업로드 중... ✅ 성공
[배치 3/16] 50건 업로드 중... ✅ 성공
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

## Step 3: 결과 확인 (1분)

### 3-1. Supabase Table Editor
```
Supabase → Table Editor → profiles
```

필터:
```
type = 'student'
```

확인:
- ✅ 총 781건
- ✅ universal_id 자동 할당됨
- ✅ metadata에 school, birth_year 저장됨

### 3-2. Universal Profiles 확인
```
Table Editor → universal_profiles
```

확인:
- ✅ 자동 생성된 통합 프로필
- ✅ phone_hash로 개인정보 보호
- ✅ total_services = 1 (온리쌤 1개)

---

## 🎯 자동으로 작동한 기능

### Trigger: auto_link_universal_profile
```
학생 등록 → 전화번호 해싱 → 동일인 검색 → universal_id 할당
```

### 예시:
```sql
-- 오은우 학생 등록 시
INSERT INTO profiles (name='오은우', phone='010-2048-6048')

-- 자동 실행:
1. hash_phone('010-2048-6048') → "a1b2c3..."
2. universal_profiles에서 검색
3. 없으면 신규 생성
4. profiles.universal_id = 'uuid-1'
5. universal_profiles.total_services += 1
```

---

## ⚠️ 문제 해결

### Q1. "SUPABASE_SERVICE_KEY 환경 변수가 설정되지 않았습니다"
```bash
export SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"
```

### Q2. "No such file or directory: students.csv"
현재 디렉토리 확인:
```bash
pwd  # /Users/oseho/autus 여야 함
ls students.csv
```

### Q3. "Table 'profiles' does not exist"
→ Step 1 (Supabase 테이블 생성) 먼저 실행

---

## 📊 완료 후 확인 사항

### profiles 테이블
```sql
SELECT COUNT(*) FROM profiles WHERE type = 'student';
-- 예상: 781
```

### universal_profiles 테이블
```sql
SELECT COUNT(*) FROM universal_profiles;
-- 예상: 781 이하 (같은 전화번호 형제가 있으면 적을 수 있음)
```

### 동일인 식별 테스트
```sql
-- 같은 전화번호를 가진 학생들
SELECT
  up.id,
  up.phone_hash,
  COUNT(*) as student_count,
  array_agg(p.name) as students
FROM universal_profiles up
JOIN profiles p ON p.universal_id = up.id
WHERE p.type = 'student'
GROUP BY up.id, up.phone_hash
HAVING COUNT(*) > 1;
```

---

**5분이면 완료됩니다. 지금 시작하세요!** 🚀
