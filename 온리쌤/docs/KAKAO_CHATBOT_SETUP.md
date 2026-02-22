# 카카오 i 오픈빌더 챗봇 설정 가이드

## 1. 사전 준비

### 필요 계정
- 카카오톡 채널 (비즈니스 채널)
- 카카오 i 오픈빌더 계정

### 설정 URL
- 오픈빌더: https://i.kakao.com
- 카카오톡 채널 관리: https://center-pf.kakao.com

---

## 2. 오픈빌더 시나리오 구성

### 블록 구조

```
[웰컴 블록]
    │
    ├─ [수업 리마인더 블록] ← 알림톡 대신 채널 메시지로 발송
    │       │
    │       ├─ [출석 확인 블록]
    │       │
    │       └─ [결석 신청 블록]
    │               │
    │               └─ [보충수업 선택 블록]
    │                       │
    │                       └─ [보충 확정 블록]
    │
    └─ [문의하기 블록]
```

### 블록 상세

#### 1) 수업 리마인더 블록
- **트리거**: 스킬 API 호출 (서버에서 발송)
- **응답 타입**: 케로셀 + 버튼

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "basicCard": {
          "title": "수업 알림 🏀",
          "description": "{{studentName}} 학생의 수업이 내일 예정되어 있습니다.\n\n📅 {{lessonDate}} {{lessonTime}}\n📍 {{location}}\n👨‍🏫 {{coachName}}",
          "buttons": [
            {
              "action": "block",
              "label": "✅ 출석 예정",
              "blockId": "ATTEND_BLOCK_ID",
              "extra": {
                "lessonId": "{{lessonId}}",
                "studentId": "{{studentId}}",
                "response": "ATTEND"
              }
            },
            {
              "action": "block",
              "label": "❌ 결석 신청",
              "blockId": "ABSENT_BLOCK_ID",
              "extra": {
                "lessonId": "{{lessonId}}",
                "studentId": "{{studentId}}",
                "response": "ABSENT"
              }
            }
          ]
        }
      }
    ]
  }
}
```

#### 2) 출석 확인 블록
- **트리거**: 버튼 클릭 (action: block)
- **스킬 호출**: 출석 확인 API
- **응답**:

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "✅ 출석 확인되었습니다!\n\n{{studentName}} 학생\n📅 {{lessonDate}} {{lessonTime}}\n📍 {{location}}\n\n내일 뵙겠습니다! 🏀"
        }
      }
    ]
  }
}
```

#### 3) 결석 신청 블록
- **트리거**: 버튼 클릭
- **스킬 호출**: 보충 슬롯 조회 API
- **응답**: 보충수업 선택 버튼 목록

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "결석이 확인되었습니다.\n보충수업 날짜를 선택해주세요."
        }
      },
      {
        "quickReplies": [
          {
            "action": "block",
            "label": "2/6(목) 16:00",
            "blockId": "MAKEUP_CONFIRM_BLOCK",
            "extra": { "slotId": "slot-1" }
          },
          {
            "action": "block",
            "label": "2/7(금) 15:00",
            "blockId": "MAKEUP_CONFIRM_BLOCK",
            "extra": { "slotId": "slot-2" }
          },
          {
            "action": "block",
            "label": "2/8(토) 14:00",
            "blockId": "MAKEUP_CONFIRM_BLOCK",
            "extra": { "slotId": "slot-3" }
          }
        ]
      }
    ]
  }
}
```

#### 4) 보충 확정 블록
- **트리거**: 보충 날짜 버튼 클릭
- **스킬 호출**: 보충 확정 API
- **응답**:

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "🎉 보충수업이 확정되었습니다!\n\n📅 {{makeupDate}} {{makeupTime}}\n📍 {{location}}\n👨‍🏫 {{coachName}}\n\n변경이 필요하시면 학원으로 연락주세요.\n📞 02-1234-5678"
        }
      }
    ]
  }
}
```

---

## 3. 스킬 서버 설정

### 엔드포인트

| 스킬 이름 | URL | 용도 |
|----------|-----|------|
| 출석 확인 | `/api/kakao/skill/attend` | 출석 예정 처리 |
| 결석 신청 | `/api/kakao/skill/absent` | 결석 처리 + 보충 옵션 반환 |
| 보충 확정 | `/api/kakao/skill/makeup-confirm` | 보충수업 예약 |
| 수업 발송 | `/api/kakao/skill/send-reminder` | 리마인더 발송 트리거 |

### 스킬 요청 형식 (카카오 → 서버)

```json
{
  "intent": {
    "id": "블록ID",
    "name": "블록이름"
  },
  "userRequest": {
    "user": {
      "id": "유저ID",
      "properties": {
        "plusfriendUserKey": "채널_유저_고유키"
      }
    }
  },
  "action": {
    "clientExtra": {
      "lessonId": "lesson-123",
      "studentId": "student-456",
      "response": "ATTEND"
    }
  }
}
```

### 스킬 응답 형식 (서버 → 카카오)

```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "응답 메시지"
        }
      }
    ],
    "quickReplies": [
      {
        "action": "block",
        "label": "버튼 텍스트",
        "blockId": "다음_블록_ID"
      }
    ]
  }
}
```

---

## 4. 채널 메시지 발송 (알림톡 대체)

### API 호출

```bash
POST https://kapi.kakao.com/v1/api/talk/friends/message/send
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "receiver_uuids": ["유저UUID"],
  "template_object": {
    "object_type": "text",
    "text": "수업 알림 메시지",
    "link": {
      "web_url": "https://onlyssam.app"
    },
    "button_title": "자세히 보기"
  }
}
```

### 또는 오픈빌더 메시지 발송 API

```bash
POST https://bot-api.kakao.com/v1/bots/{BOT_ID}/send
Authorization: {OPENBUILDER_API_KEY}

{
  "target": {
    "plusFriendUserKey": "유저키"
  },
  "template": {
    "outputs": [...]
  }
}
```

---

## 5. 환경 변수

```env
# 카카오 오픈빌더
KAKAO_OPENBUILDER_BOT_ID=
KAKAO_OPENBUILDER_API_KEY=

# 카카오톡 채널
KAKAO_CHANNEL_ID=
KAKAO_CHANNEL_ADMIN_KEY=

# 블록 ID (오픈빌더에서 생성 후 입력)
KAKAO_BLOCK_ATTEND=
KAKAO_BLOCK_ABSENT=
KAKAO_BLOCK_MAKEUP_SELECT=
KAKAO_BLOCK_MAKEUP_CONFIRM=
```

---

## 6. 테스트

1. 오픈빌더에서 "배포" → "테스트"
2. 카카오톡에서 채널 검색 → 테스트 메시지 발송
3. 버튼 클릭 → 응답 확인

---

## 7. 주의사항

- **채널 메시지**는 채널을 추가한 유저에게만 발송 가능
- **알림톡**은 채널 미추가 유저에게도 발송 가능 (단, 웹링크만)
- 하이브리드 추천: 알림톡으로 채널 추가 유도 → 이후 채널 메시지로 양방향 소통
