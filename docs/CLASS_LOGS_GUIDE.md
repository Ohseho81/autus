# 수업 결과 로그 시스템 가이드

## 📋 개요

**class_logs** 테이블은 강사가 수업 후 학생의 상태, 진도, 코멘트를 기록하고 학부모에게 자동으로 전송하는 시스템입니다.

---

## 🚀 빠른 시작

### 1. 테이블 생성

Supabase SQL Editor에서 실행:

**https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti/sql**

```sql
-- create_class_logs_table.sql 파일 내용 복사 & 실행
```

또는 파일 업로드:
[create_class_logs_table.sql](computer:///sessions/modest-bold-einstein/mnt/autus/create_class_logs_table.sql)

---

## 📊 테이블 구조

### 필수 필드

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| student_id | UUID | 학생 ID | (students 테이블 참조) |
| class_date | DATE | 수업 날짜 | 2026-02-14 |
| attendance_status | TEXT | 출석 상태 | present, absent, late |

### 선택 필드

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| skill_focus | TEXT | 오늘 중점 연습 | "서브 자세 교정" |
| skill_level | TEXT | 현재 수준 | beginner ~ expert |
| performance_score | INT | 오늘 점수 (1-10) | 8 |
| coach_comment | TEXT | 강사 코멘트 | "많이 발전했어요!" |
| student_mood | TEXT | 학생 컨디션 | great, good, okay |

---

## 🔄 워크플로우

### 수업 후 강사 입력
```
1. 강사가 모바일 폼에서 입력
   ↓
2. class_logs 테이블에 저장
   ↓
3. 자동으로 학부모 카카오톡 발송
   ↓
4. parent_notified = true 업데이트
```

---

## 💬 카카오톡 자동 알림 예시

### 학부모에게 전송되는 메시지:

```
📚 오늘의 수업 결과

👤 학생: 김철수
📅 날짜: 2026년 2월 14일
⏰ 시간: 오후 4:00
👨‍🏫 강사: 김코치

✅ 출석: 정상 출석
🎯 오늘 연습: 서브 자세 교정
⭐ 수업 점수: 8/10

📝 강사 코멘트:
오늘 서브 자세가 많이 좋아졌습니다.
계속 연습하면 실전에서도 잘 할 수 있을 것 같아요!

💪 학생 컨디션: 최고!

다음 수업도 화이팅! 🏐
```

---

## 🔌 카카오톡 연동 (자동)

### Python 스크립트 추가 (kakao_notification.py)

```python
def send_class_log_notification(log_id):
    """수업 결과를 학부모에게 전송"""
    # 1. class_logs 데이터 조회
    log = supabase.table('class_logs')\
        .select('*, students(name, parent_phone)')\
        .eq('id', log_id)\
        .single()\
        .execute()

    # 2. 카카오톡 메시지 생성
    message = f"""
📚 오늘의 수업 결과

👤 학생: {log.data['students']['name']}
📅 날짜: {log.data['class_date']}
⭐ 수업 점수: {log.data['performance_score']}/10

📝 강사 코멘트:
{log.data['coach_comment']}
    """

    # 3. 카카오톡 발송
    send_kakao_message(log.data['students']['parent_phone'], message)

    # 4. 발송 기록 업데이트
    supabase.table('class_logs')\
        .update({'parent_notified': True, 'notification_sent_at': 'now()'})\
        .eq('id', log_id)\
        .execute()
```

---

## 📱 모바일 입력 폼 (예정)

### 강사용 간편 입력 폼

```jsx
// React Native / React 폼
<ClassLogForm>
  <StudentSelector />
  <DatePicker defaultValue={today} />
  <AttendanceButtons />  // 출석/결석/지각
  <ScoreSlider min={1} max={10} />
  <TextArea placeholder="오늘의 코멘트..." />
  <SubmitButton>
    저장 & 학부모 알림 발송
  </SubmitButton>
</ClassLogForm>
```

**제출 시:**
1. class_logs 저장
2. 자동으로 학부모 카카오톡 발송
3. 완료 메시지 표시

---

## 📊 데이터 조회

### 최근 수업 기록 확인

```sql
-- 최근 10개 수업 로그
SELECT
  cl.*,
  s.name AS student_name,
  s.parent_phone
FROM class_logs cl
JOIN students s ON cl.student_id = s.id
ORDER BY cl.class_date DESC, cl.created_at DESC
LIMIT 10;
```

### 특정 학생의 수업 히스토리

```sql
SELECT *
FROM class_logs
WHERE student_id = '학생ID'
ORDER BY class_date DESC;
```

### 미발송 알림 확인

```sql
SELECT *
FROM class_logs
WHERE parent_notified = false
ORDER BY class_date DESC;
```

---

## 🎯 다음 단계

1. ✅ **테이블 생성** (create_class_logs_table.sql 실행)
2. ⏳ **모바일 입력 폼 제작** (React Native)
3. ⏳ **카카오톡 자동 알림 연동** (kakao_notification.py 업데이트)
4. ⏳ **강사 교육** (폼 사용법)

---

## 💡 Tips

### 효율적인 입력
- 수업 직후 바로 입력 (기억이 생생할 때)
- 템플릿 코멘트 활용 (자주 쓰는 문구)
- 점수는 상대적이 아닌 절대적 기준

### 학부모 만족도 향상
- 구체적인 코멘트 (추상적 X)
- 긍정적 피드백 중심
- 다음 목표 제시

---

**작성**: AUTUS Team
**문서 버전**: 1.0
**최종 수정**: 2026-02-14
