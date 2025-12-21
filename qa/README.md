# AUTUS Visual QA 시스템

> **"3개 표준"** 기반 픽셀 단위 UI 검증 시스템

---

## 📐 3개 표준 (LOCKED)

### 표준 ① Golden Reference

**3장 고정 (상태 3종)**

| 파일명 | 상태 | 설명 |
|--------|------|------|
| `G1_NAV.png` | NAV | 기본 내비 상태 |
| `G2_ALERT.png` | ALERT | 위험 경고 상태 |
| `G3_CONTROL.png` | CONTROL | 조작 집중 상태 |

### 표준 ② 캡처 환경

```
1920 × 1080
DPR = 1
Zoom = 100%
Color = sRGB
Browser = Chromium 120+
```

### 표준 ③ Diff 기준 (2-트랙)

| Track | 기준 | 용도 |
|-------|------|------|
| **Track A** | Pixel-Exact (diff = 0) | 레퍼런스/데모 |
| **Track B** | ≤ 0.5% AND SSIM ≥ 0.995 | 제품 UI |

---

## 🚀 사용법

### 설치

```bash
cd qa
npm install
npx playwright install chromium
```

### Golden 캡처

```bash
npm run capture
```

### Diff 리포트 생성

```bash
npm run diff
```

### CI 실행

```bash
npm run ci
```

---

## 📁 폴더 구조

```
qa/
├── golden/                 # Golden Set (3장)
│   ├── G1_NAV.png
│   ├── G2_ALERT.png
│   ├── G3_CONTROL.png
│   ├── state-fixtures.json # 상태 고정 데이터
│   └── capture-metadata.json
├── captures/               # 현재 캡처 (CI에서 생성)
├── reports/                # Diff 리포트
│   ├── diff-report.json
│   ├── diff-report.html
│   └── *_diff.png
├── scripts/
│   ├── capture-golden.ts
│   └── diff-report.ts
├── LAYER_SET_SPEC.md       # 7레이어 규약
└── package.json
```

---

## 🔒 CI 통합

`.github/workflows/visual-qa.yml`에서:

1. `frontend/**` 변경 시 자동 실행
2. Track B (≤0.5%) 초과 시 빌드 실패
3. Diff 리포트 아티팩트로 업로드

---

## 📊 리포트 예시

### JSON

```json
{
  "summary": {
    "total": 3,
    "track_a_pass": 3,
    "track_b_pass": 3,
    "overall": "PASS"
  }
}
```

### HTML

`reports/diff-report.html` 에서 시각적 비교 확인

---

## ⚠️ 주의사항

1. **Golden 변경 시** — PR에 변경 사유 명시 필수
2. **마스크 영역** — 화면의 3% 초과 금지
3. **동적 데이터** — 반드시 고정값으로 캡처
4. **애니메이션** — 완료 후 캡처 (CSS 애니메이션 비활성화)

---

## 🎯 ROI

| 항목 | Before | After |
|------|--------|-------|
| QA 시간/릴리즈 | 20분 | 2분 |
| 월 절감 (20회 기준) | - | 6시간 |
| 비용 절감 | - | ₩300k/월 |
