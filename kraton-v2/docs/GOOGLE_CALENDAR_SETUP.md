# 📅 구글 캘린더 API 설정 가이드

올댓바스켓 보충 수업 시스템을 위한 구글 캘린더 연동 설정 가이드입니다.

## 1. Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 (예: `allthatbasket-calendar`)
3. 프로젝트 선택

## 2. Calendar API 활성화

1. 좌측 메뉴 → **API 및 서비스** → **라이브러리**
2. "Google Calendar API" 검색
3. **사용 설정** 클릭

## 3. 서비스 계정 생성

1. **API 및 서비스** → **사용자 인증 정보**
2. **사용자 인증 정보 만들기** → **서비스 계정**
3. 서비스 계정 이름 입력 (예: `calendar-bot`)
4. **완료** 클릭

### 키 생성

1. 생성된 서비스 계정 클릭
2. **키** 탭 → **키 추가** → **새 키 만들기**
3. **JSON** 선택 → **만들기**
4. JSON 파일 다운로드됨 (안전하게 보관!)

## 4. 캘린더 공유 설정

서비스 계정이 캘린더에 접근하려면 공유 설정이 필요합니다.

1. [Google Calendar](https://calendar.google.com) 접속
2. 사용할 캘린더의 **설정** (⚙️) 클릭
3. **특정 사용자와 공유** → **사용자 추가**
4. 서비스 계정 이메일 입력 (예: `calendar-bot@project.iam.gserviceaccount.com`)
5. 권한: **일정 변경** 선택
6. **보내기** 클릭

### 캘린더 ID 확인

1. 캘린더 설정 페이지에서 스크롤
2. **캘린더 통합** 섹션에서 **캘린더 ID** 복사
   - 예: `abc123@group.calendar.google.com`

## 5. Vercel 환경 변수 설정

[Vercel Dashboard](https://vercel.com) → 프로젝트 → Settings → Environment Variables

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `calendar-bot@project.iam.gserviceaccount.com` | 서비스 계정 이메일 |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | JSON 파일의 `private_key` 값 (그대로 복사) |
| `GOOGLE_CALENDAR_ID` | `abc123@group.calendar.google.com` | 캘린더 ID |

> ⚠️ **중요**: `GOOGLE_PRIVATE_KEY`는 JSON 파일의 `private_key` 값을 그대로 복사하세요. 줄바꿈(`\n`)이 포함되어 있어야 합니다.

## 6. 캘린더 이벤트 규칙

보충 시스템이 올바르게 작동하려면 캘린더 이벤트 제목 규칙을 따라야 합니다:

### 팀수업
- 형식: `팀-2015~2016` 또는 `TEAM-2015~2016`
- 의미: 2015~2016년생 대상 수업
- 예시: `팀-2017~2018` (유아부 A)

### 개인훈련
- 형식: `개인-학생이름` 또는 `PVT-학생이름`
- 의미: 해당 학생 개인 레슨
- 예시: `개인-김민수`

### 코치 출근
- 형식: `출근` 또는 `WORK`
- 의미: 코치 근무 시간 (개인훈련 가능 시간 계산용)

## 7. 테스트

### API 상태 확인
```bash
curl https://your-domain.vercel.app/api/calendar?action=status
```

### 이벤트 조회
```bash
curl "https://your-domain.vercel.app/api/calendar?action=events&date=2024-02-03"
```

### 보충 가능 일정 조회
```bash
curl "https://your-domain.vercel.app/api/calendar?action=available&birthYear=2015&excludeDate=2024-02-01"
```

## 8. 문제 해결

### "Google Service Account credentials not configured"
- Vercel 환경 변수가 올바르게 설정되었는지 확인
- 환경 변수 저장 후 재배포 필요

### "Calendar not found"
- 캘린더 ID가 올바른지 확인
- 서비스 계정에 캘린더 공유가 되었는지 확인

### "Permission denied"
- 캘린더 공유 시 "일정 변경" 권한 부여 확인
- 서비스 계정 이메일이 정확한지 확인

## 9. 보안 주의사항

- JSON 키 파일을 Git에 커밋하지 마세요
- 환경 변수는 Vercel Dashboard에서만 관리
- 서비스 계정 키는 주기적으로 갱신 권장
