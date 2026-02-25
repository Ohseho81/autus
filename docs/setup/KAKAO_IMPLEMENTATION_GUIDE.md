# 온리쌤 카카오 연동 구현 가이드

**버전**: 1.0
**작성일**: 2026-02-14
**소요 시간**: 2주 (Phase 1 기준)

---

## 🎯 목표

**2주 내에 알림톡 자동화 완성**
- ✅ 출석 체크 → 1분 내 학부모 알림
- ✅ 결석 자동 감지 → 10분 내 알림
- ✅ 수업 결과 → 자동 전송
- ✅ 결제 완료 → 즉시 알림

---

## 📋 준비물

### 1. 카카오 비즈니스 채널
- [ ] 사업자등록번호
- [ ] 대표자 정보
- [ ] 고객센터 연락처

### 2. Solapi 계정
- [ ] 이메일 주소
- [ ] 휴대폰 번호 (본인인증)
- [ ] 10,000원 (초기 충전금)

### 3. 개발 환경
- [ ] Python 3.9+
- [ ] FastAPI
- [ ] Supabase 접근 권한

---

## 📝 Step-by-Step 구현 가이드

### Step 1: 카카오 비즈니스 채널 생성 (30분)

#### 1-1. 채널 생성

```
1. https://kakaobusiness.com 접속
2. "채널 만들기" 클릭
3. 채널명 입력: "온리쌤 배구아카데미"
4. 카테고리 선택: "교육 > 학원"
5. 채널 공개: ON
6. 검색 허용: ON
```

#### 1-2. 비즈니스 채널 전환

```
1. 채널 관리 → 설정 → 비즈니스 정보
2. 사업자등록번호 입력
3. 사업자등록증 업로드
4. 전환 신청
5. 승인 대기 (1~2일)
```

#### 1-3. 고객센터 연락처 등록

```
1. 채널 관리 → 설정 → 고객센터
2. 연락처 입력: 010-1234-5678
3. 운영 시간 입력: 평일 09:00~18:00
4. 저장
```

**✅ 체크포인트**: 채널 ID 확인 (예: `@onlyssam`)

---

### Step 2: Solapi 계정 생성 및 설정 (20분)

#### 2-1. 회원가입

```
1. https://solapi.com 접속
2. "무료 회원가입" 클릭
3. 이메일 인증
4. 휴대폰 본인인증
```

#### 2-2. API 키 발급

```
1. 로그인 → 대시보드
2. 좌측 메뉴 → API Keys
3. "새 API Key 생성" 클릭
4. API Key 복사 (예: NCS52A4522252FB5)
5. API Secret 복사 (예: 6t7ukebcNQ3...)

⚠️ Secret은 재확인 불가 → 반드시 저장!
```

#### 2-3. 발신번호 등록

```
1. 좌측 메뉴 → 발신번호 관리
2. "발신번호 추가" 클릭
3. 학원 대표번호 입력: 010-1234-5678
4. ARS 인증 또는 서류 인증
5. 승인 대기 (즉시 또는 1~2시간)
```

#### 2-4. 카카오 채널 연동

```
1. 좌측 메뉴 → 카카오 채널
2. "채널 추가" 클릭
3. 채널 ID 입력: @onlyssam
4. 카카오 로그인 (채널 관리자 계정)
5. 연동 승인
```

#### 2-5. 충전

```
1. 좌측 메뉴 → 캐시 충전
2. 금액 입력: 10,000원
3. 카드 또는 계좌이체
4. 충전 완료 확인
```

**✅ 체크포인트**:
- API Key 저장됨
- 발신번호 승인됨
- 채널 연동됨
- 캐시 10,000원 충전됨

---

### Step 3: 알림톡 템플릿 승인 신청 (1시간)

#### 3-1. 템플릿 작성

**Solapi 대시보드 → 카카오 채널 → 템플릿 관리**

**템플릿 1: 출석 체크**
```
템플릿 코드: attendance_checked
템플릿명: 출석 확인

내용:
📚 출석 확인

#{student_name} 학생이 #{check_time}에 출석했습니다.

오늘도 화이팅! 🏐

────────────────
온리쌤 배구아카데미
문의: 010-1234-5678

강조 유형: 없음
```

**템플릿 2: 결석 알림**
```
템플릿 코드: absence_alert
템플릿명: 결석 알림

내용:
⚠️ 결석 알림

#{student_name} 학생이 #{class_time} 수업에 결석했습니다.

혹시 사정이 있으신가요?
연락 부탁드립니다.

────────────────
온리쌤 배구아카데미
문의: 010-1234-5678

강조 유형: 강조 표기
```

**템플릿 3: 수업 결과**
```
템플릿 코드: class_result
템플릿명: 수업 결과 전송

내용:
📊 오늘의 수업 결과

학생: #{student_name}
날짜: #{class_date}
출석: #{attendance_emoji}

💬 코치 코멘트:
#{coach_comment}

성장하는 모습이 보입니다! 👏

────────────────
온리쌤 배구아카데미
```

**템플릿 4: 결제 완료**
```
템플릿 코드: payment_completed
템플릿명: 결제 완료

내용:
💳 결제 완료

#{student_name} 학생
결제 금액: #{amount}원
결제 일시: #{payment_date}

영수증: #{receipt_url}

────────────────
온리쌤 배구아카데미
```

**템플릿 5: 미수금 안내**
```
템플릿 코드: payment_reminder
템플릿명: 수강료 안내

내용:
💰 수강료 안내

#{student_name} 학생
미납 금액: #{unpaid_amount}원
납부 기한: #{due_date}

결제하기: #{payment_url}

────────────────
온리쌤 배구아카데미
문의: 010-1234-5678
```

#### 3-2. 승인 신청

```
1. 각 템플릿마다 "검수 요청" 클릭
2. 카테고리 선택: "교육/학원"
3. 발송 목적 입력: "출석 알림"
4. 예시 변수 입력
5. 검수 요청
```

**승인 소요 시간**: 1~2영업일

**✅ 체크포인트**: 5개 템플릿 모두 승인 완료

---

### Step 4: 개발 환경 설정 (30분)

#### 4-1. Python 패키지 설치

```bash
pip install fastapi uvicorn supabase requests --break-system-packages
```

#### 4-2. 환경 변수 설정

`.env` 파일 생성:
```env
# Supabase
SUPABASE_URL=https://pphzvnaedmzcvpxjulti.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

# Solapi
SOLAPI_API_KEY=NCS52A4522252FB5
SOLAPI_API_SECRET=6t7ukebcNQ3...
SOLAPI_SENDER=01012345678
KAKAO_CHANNEL_ID=@onlyssam
```

#### 4-3. 파일 구조

```
autus/
├── .env
├── solapi_integration.py      # Solapi 클라이언트
├── fastapi_webhooks.py         # FastAPI 웹훅
└── requirements.txt
```

**requirements.txt**:
```
fastapi==0.109.0
uvicorn==0.27.0
supabase==2.3.4
requests==2.31.0
python-dotenv==1.0.0
```

---

### Step 5: Supabase 데이터베이스 설정 (20분)

#### 5-1. notifications 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES atb_students(id),
  notification_type TEXT NOT NULL,
  message TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);
```

#### 5-2. Trigger 생성 (출석 알림)

```sql
CREATE OR REPLACE FUNCTION notify_attendance_checked()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.payssam.kr/webhooks/attendance',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'student_id', NEW.student_id,
      'class_date', NEW.class_date,
      'attendance_status', NEW.attendance_status
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_checked_trigger
AFTER INSERT ON class_logs
FOR EACH ROW
EXECUTE FUNCTION notify_attendance_checked();
```

---

### Step 6: FastAPI 서버 실행 (10분)

#### 6-1. 로컬 테스트

```bash
cd autus
python3 fastapi_webhooks.py
```

**예상 출력**:
```
==========================================================
🚀 온리쌤 FastAPI 서버 시작
==========================================================

INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### 6-2. 헬스 체크

```bash
curl http://localhost:8000/health
```

**예상 응답**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T10:30:00"
}
```

#### 6-3. 테스트 알림 발송

```bash
curl -X POST http://localhost:8000/webhooks/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "uuid-of-oseonwoo",
    "class_date": "2026-02-14",
    "attendance_status": "present"
  }'
```

**✅ 체크포인트**: 학부모 폰으로 알림톡 수신 확인

---

### Step 7: Railway 배포 (30분)

#### 7-1. Railway 프로젝트 생성

```
1. https://railway.app 접속
2. GitHub 연동
3. "New Project" → "Deploy from GitHub repo"
4. autus 저장소 선택
```

#### 7-2. 환경 변수 설정

```
Railway 대시보드 → Variables 탭
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- SOLAPI_API_KEY
- SOLAPI_API_SECRET
- SOLAPI_SENDER
- KAKAO_CHANNEL_ID
```

#### 7-3. 시작 명령어 설정

**Procfile** 또는 **Railway Start Command**:
```
web: uvicorn fastapi_webhooks:app --host 0.0.0.0 --port $PORT
```

#### 7-4. 도메인 확인

```
Railway가 자동 할당: https://autus-production.up.railway.app
```

#### 7-5. Supabase Trigger URL 업데이트

```sql
-- Trigger 함수 수정
CREATE OR REPLACE FUNCTION notify_attendance_checked()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://autus-production.up.railway.app/webhooks/attendance',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'student_id', NEW.student_id,
      'class_date', NEW.class_date,
      'attendance_status', NEW.attendance_status
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**✅ 체크포인트**: 운영 환경에서 알림 정상 작동

---

## 🧪 테스트 시나리오

### 시나리오 1: 출석 체크

```
1. class_logs 테이블에 INSERT
   INSERT INTO class_logs (student_id, class_date, attendance_status)
   VALUES ('uuid', '2026-02-14', 'present');

2. 예상 결과:
   - Supabase Trigger 발동
   - FastAPI 웹훅 호출
   - Solapi 알림톡 발송
   - 학부모 폰 수신 (1분 내)
   - notifications 테이블 기록
```

### 시나리오 2: 결석 감지

```
1. Supabase Edge Function 실행 (수동 또는 Cron)

2. 예상 결과:
   - 현재 시간 수업 조회
   - 출석 체크 안 된 학생 발견
   - 결석 알림 발송
   - class_logs에 absent 기록
```

### 시나리오 3: 배치 미수금 알림

```
1. API 호출
   curl -X POST https://autus-production.up.railway.app/batch/payment-reminders

2. 예상 결과:
   - 미수금 학생 전체 조회
   - 알림톡 일괄 발송
   - 성공/실패 집계 반환
```

---

## 📊 모니터링

### 발송 현황 확인

**Solapi 대시보드 → 발송 내역**
- 발송 건수
- 성공률
- 실패 사유
- 잔액

### 로그 확인

**Railway 대시보드 → Logs**
- FastAPI 요청 로그
- 에러 로그
- 알림 발송 로그

### 데이터베이스 확인

```sql
-- 오늘 발송된 알림 조회
SELECT
  notification_type,
  COUNT(*) as count,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM notifications
WHERE sent_at >= CURRENT_DATE
GROUP BY notification_type;
```

---

## 🚨 문제 해결

### 알림이 발송되지 않음

**체크리스트**:
- [ ] Solapi 잔액 확인 (0원 이하?)
- [ ] 템플릿 승인 상태 (승인됨?)
- [ ] 발신번호 등록 (승인됨?)
- [ ] API 키 정확성 (오타 없는지?)
- [ ] 수신번호 형식 (010-1234-5678 또는 01012345678)
- [ ] Railway 환경 변수 (설정됨?)

### 알림이 늦게 도착함

**원인**:
- Supabase Trigger 지연
- Railway 서버 Cold Start
- Solapi 발송 대기열

**해결**:
- Railway Always On 활성화
- Supabase Edge Function 대신 FastAPI Polling 사용

### 템플릿 승인 거부됨

**흔한 사유**:
- 광고성 문구 포함
- 변수 위치 부적절
- 카테고리 불일치

**해결**:
- 정보성 문구로 수정
- 변수 위치 조정
- 카테고리 재선택

---

## 📞 지원

**Solapi 고객센터**: https://support.solapi.com
**카카오 비즈니스 고객센터**: 1544-4293
**온리쌤 개발팀**: dev@payssam.kr

---

## ✅ 최종 체크리스트

### 카카오 설정
- [ ] 카카오 비즈니스 채널 생성
- [ ] 비즈니스 채널 전환 승인
- [ ] 고객센터 연락처 등록
- [ ] 채널 ID 확인

### Solapi 설정
- [ ] 계정 생성
- [ ] API 키 발급
- [ ] 발신번호 등록 및 승인
- [ ] 카카오 채널 연동
- [ ] 캐시 충전 (10,000원+)
- [ ] 템플릿 5개 승인 완료

### 개발 환경
- [ ] Python 패키지 설치
- [ ] .env 파일 설정
- [ ] solapi_integration.py 작성
- [ ] fastapi_webhooks.py 작성

### 데이터베이스
- [ ] notifications 테이블 생성
- [ ] Supabase Trigger 생성
- [ ] Edge Function 배포 (결석 감지)

### 배포
- [ ] Railway 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 서버 배포
- [ ] 도메인 확인
- [ ] 헬스 체크 성공

### 테스트
- [ ] 출석 알림 테스트
- [ ] 결석 알림 테스트
- [ ] 수업 결과 알림 테스트
- [ ] 결제 완료 알림 테스트
- [ ] 미수금 알림 테스트

---

**🎉 모든 항목 체크 완료 시**: 온리쌤 카카오 알림 자동화 완성!

---

**문서 버전**: 1.0
**최종 수정**: 2026-02-14
**작성자**: AUTUS Team
