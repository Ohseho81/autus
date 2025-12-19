# AUTUS Layer v2.0 — 팀 내부 배포

> "See the Future. Don't Touch It."

모든 웹사이트에 AUTUS 관측 레이어를 오버레이하는 Chrome Extension입니다.

---

## 📦 설치 방법

### 1단계: 폴더 준비
이 폴더를 로컬 PC에 저장합니다.
```
autus-extension-v2/
├── manifest.json
├── content.js
├── layer.css
├── background.js
├── popup.html
├── popup.js
└── icons/
```

### 2단계: Chrome 확장프로그램 페이지 열기
Chrome 주소창에 입력:
```
chrome://extensions/
```

### 3단계: 개발자 모드 활성화
페이지 우측 상단 **"개발자 모드"** 토글 ON

### 4단계: 확장프로그램 로드
**"압축해제된 확장 프로그램을 로드합니다"** 클릭 → 이 폴더 선택

### 5단계: 완료!
모든 웹사이트 우측 하단에 AUTUS Beacon 표시됨

---

## 🎯 사용법

### Beacon (최소화 상태)
| 색상 | 상태 |
|------|------|
| 🟢 초록 | STABLE — 안정 |
| 🟡 노랑 | CAUTION — 주의 |
| 🔴 빨강 | ALERT — 경고 |

**클릭** → 패널 확장

### Panel (확장 상태)
- **Solar View**: 9개 행성 실시간 공전
- **Twin State**: Energy / Flow / Risk
- **9 Planets**: 개별 행성 수치
- **Bottleneck**: 병목 감지 알림
- **Forecast**: Δt +1h 예측 변화율

---

## ⌨️ 키보드 단축키

| 단축키 | 기능 |
|--------|------|
| `Alt + A` | 패널 토글 |
| `Alt + S` | 빠른 상태 확인 |
| `Esc` | 패널 닫기 |

---

## ⚙️ 설정

툴바에서 AUTUS 아이콘 클릭:

- **Layer Enabled**: 레이어 표시/숨김
- **Auto-expand**: 페이지 로드 시 자동 확장
- **Observation Target**: 관측 대상 Entity 선택
  - Company ABC
  - Person 001
  - City Seoul
  - Nation KR

---

## 🔗 API 연동

**Base URL**: `https://solar.autus-ai.com`

| Endpoint | 용도 |
|----------|------|
| `/api/v1/shadow/snapshot/{entity_id}` | 현재 상태 |
| `/api/v1/orbit/frames/{entity_id}` | 궤도 데이터 |
| `/status` | 시스템 상태 |

**오프라인 모드**: API 연결 실패 시 자동 시뮬레이션

---

## 🛡️ AUTUS 원칙

1. **관측 전용** — 데이터 조작 불가
2. **항상 존재** — 현실은 꺼지지 않음
3. **미래 가시화** — Forecast는 물리 연장

---

## 📁 파일 구조

| 파일 | 용도 | 수정 가능 |
|------|------|----------|
| `manifest.json` | Extension 설정 | ⚠️ 주의 |
| `content.js` | 페이지 주입 로직 | ✅ |
| `layer.css` | UI 스타일 | ✅ |
| `background.js` | 백그라운드 워커 | ⚠️ 주의 |
| `popup.html/js` | 설정 팝업 | ✅ |
| `icons/` | 아이콘 이미지 | ✅ |

---

## 🔄 업데이트 방법

1. 새 파일 받기
2. `chrome://extensions/` 열기
3. AUTUS Layer 카드에서 **새로고침** 아이콘 클릭

---

## 🐛 문제 해결

### 레이어가 안 보여요
1. `chrome://extensions/`에서 AUTUS 활성화 확인
2. 팝업에서 "Layer Enabled" ON 확인
3. 페이지 새로고침

### API 연결 안 됨
- 오프라인 모드로 자동 전환됨
- `solar.autus-ai.com` 접속 확인

### 단축키 안 먹어요
- 일부 사이트에서 단축키 충돌 가능
- Beacon 직접 클릭으로 대체

---

**Version**: 2.0.0  
**API**: solar.autus-ai.com  
**AUTUS — The Operating System of Reality**
