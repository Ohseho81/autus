# 🔔 AUTUS 카카오톡 자동 알림 시스템

온리쌤 학생 데이터(Supabase)와 카카오톡 알림톡을 연동한 자동화 시스템입니다.

## 📋 기능

### 1️⃣ 수업 시작 알림
- **시기**: 수업 30분 전
- **대상**: 해당 수업 학생/학부모
- **내용**: 수업 시간, 장소 안내

### 2️⃣ 결제/미수금 안내
- **시기**: 매일 아침 9시
- **대상**: 미수금이 있는 학생 학부모
- **내용**: 결제 금액, 납부 방법

### 3️⃣ 신규 학생 환영
- **시기**: 학생 등록 즉시
- **대상**: 신규 등록 학생/학부모
- **내용**: 환영 메시지, 안내 사항

### 4️⃣ 일일 요약
- **시기**: 매일 저녁 8시
- **대상**: 관리자 (본인)
- **내용**: 전체 학생 수, 미수금 현황

---

## 🚀 사용 방법

### 즉시 테스트 (로컬 환경)

```bash
cd autus
python3 kakao_notification.py
```

**결과:**
- ✅ 일일 요약 카카오톡 발송
- ✅ 미수금 알림 발송

---

## ⚙️ 자동화 설정

### 방법 1: cron (추천)

매일 자동 실행:

```bash
# crontab 편집
crontab -e

# 추가 (매일 아침 9시 실행)
0 9 * * * cd /path/to/autus && python3 kakao_notification.py
```

### 방법 2: Supabase Edge Function

Supabase에서 이벤트 트리거 시 자동 실행

### 방법 3: GitHub Actions

원격 서버에서 스케줄 실행

---

## 📊 데이터 흐름

```
Supabase (students, memberships, payments)
    ↓
Python 스크립트 (kakao_notification.py)
    ↓
카카오톡 API
    ↓
학생/학부모 카카오톡 알림
```

---

## 🔧 설정 파일

### 카카오톡 API
- **Access Token**: `ltdTE7vL...` (이미 설정됨)
- **API URL**: `https://kapi.kakao.com/v2/api/talk/memo/default/send`

### Supabase
- **URL**: `https://pphzvnaedmzcvpxjulti.supabase.co`
- **Service Key**: 이미 설정됨

---

## 📱 알림 템플릿

### 일일 요약
```
📊 온리쌤 일일 현황

👥 전체 학생: 781명
💰 미수금 학생: 12명

오늘도 좋은 하루 되세요! 🏐
```

### 결제 안내
```
💳 결제 안내

미수금이 있는 학생: 12명
결제 확인이 필요합니다.
```

### 신규 학생 환영
```
🎉 온리쌤에 오신 것을 환영합니다!

김철수 학생, 환영합니다!

📞 문의사항이 있으시면 언제든 연락주세요.
💪 열심히 지도하겠습니다!
```

---

## 🛠️ 추가 기능 (향후)

- [ ] 개별 학생별 알림 발송
- [ ] 알림톡 템플릿 관리
- [ ] 발송 이력 기록
- [ ] 실패 알림 재전송
- [ ] 셔틀 운행 알림
- [ ] 출석 확인 알림

---

## 📄 파일 구조

```
autus/
├── kakao_notification.py    # 알림 시스템 메인
├── upload_students.py        # Supabase 업로드
├── students.csv              # 학생 데이터
└── README_KAKAO.md          # 이 파일
```

---

## ⚡ 빠른 시작

1. **테스트 실행**
   ```bash
   python3 kakao_notification.py
   ```

2. **자동화 설정**
   ```bash
   crontab -e
   # 매일 아침 9시
   0 9 * * * cd ~/autus && python3 kakao_notification.py
   ```

3. **완료!** 🎉

---

## 📞 문의

AUTUS Team
