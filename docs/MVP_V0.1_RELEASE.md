# AUTUS MVP v0.1 — 기능 동결 선언

> **릴리즈 날짜**: 2026-01-17
> **코드네임**: Responsibility OS
> **상태**: ✅ 기능 동결 (Feature Freeze)

---

## 🎯 MVP v0.1 기능 세트

### 포함된 기능

| # | 기능 | 설명 | 상태 |
|---|------|------|------|
| 1 | **할 일 우선순위 자동 정렬** | Eisenhower Matrix 기반 Q1-Q4 분류 | ✅ |
| 2 | **회의록 핵심 결정 추출** | 담당자 + 기한 자동 파싱 | ✅ |
| 3 | **일일 보고서 자동 생성** | 카테고리화 + 시간 추정 | ✅ |
| 4 | **오프라인 지원** | IndexedDB 로컬 저장 | ✅ |
| 5 | **데이터 내보내기** | JSON 백업 | ✅ |

### 제외된 기능 (v0.2 이후)

| 기능 | 이유 | 예정 버전 |
|------|------|----------|
| V 시각화 | 데이터 축적 필요 | v0.2 |
| P2P 동기화 | 사용자 기반 필요 | v0.3 |
| Gmail 연동 | OAuth 구현 복잡 | v0.4 |
| 음성 입력 | 범위 초과 | v1.0 |

---

## 📦 배포 정보

### 프론트엔드 (PWA)
- **URL**: https://autus-ai.com/automation
- **호스팅**: Netlify
- **빌드**: 정적 HTML (번들 없음)

### 백엔드 (API)
- **URL**: https://autus-api.onrender.com
- **호스팅**: Render.com
- **프레임워크**: FastAPI

### 저장소
- **GitHub**: https://github.com/Ohseho81/autus
- **브랜치**: main

---

## 📂 파일 구조

```
autus/
├── backend/
│   ├── automation/
│   │   ├── __init__.py
│   │   ├── prioritizer.py      # 할 일 우선순위
│   │   ├── meeting_extractor.py # 회의록 추출
│   │   └── report_generator.py  # 보고서 생성
│   ├── routers/
│   │   └── automation_router.py # REST API
│   └── physics/
│       ├── v_engine.py         # V 공식 (숨김)
│       ├── v_predictor.py      # AI 예측 (숨김)
│       ├── laplace_demon.py    # 라플라스 (숨김)
│       └── transformer_predictor.py # Transformer (숨김)
│
├── frontend/
│   ├── deploy/
│   │   ├── automation.html     # MVP PWA
│   │   ├── sovereign-live/     # Sovereign PWA
│   │   └── _redirects          # Netlify 라우팅
│   └── src/
│       ├── api/
│       │   └── automation.ts   # API 클라이언트
│       ├── components/
│       │   └── Automation/     # React 컴포넌트
│       └── lib/
│           └── db.ts           # IndexedDB
│
└── docs/
    ├── MVP_AUTOMATION_SPEC.md
    ├── DEV_ROADMAP.md
    └── MVP_V0.1_RELEASE.md     # 이 문서
```

---

## 🔒 동결 원칙

### 변경 가능
- 버그 수정
- 성능 최적화
- UI 미세 조정

### 변경 불가
- 새 기능 추가
- API 스키마 변경
- 데이터 구조 변경

---

## 📊 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| DAU | 30명 | 일일 활성 사용자 |
| 완료율 | 60% | 추천 수락 비율 |
| 시간 절감 | 30분/일 | 사용자 피드백 |
| NPS | 40+ | 추천 의향 설문 |

---

## 🚀 다음 단계 (v0.2)

1. **베타 사용자 수집** (5-10명)
2. **피드백 수집** (1주일)
3. **복리 시각화 설계** 시작
4. **V 그래프 구현**

---

## 📝 핵심 원칙

1. **설명하지 않고 결과만 남긴다**
2. **V 예측은 절대 노출하지 않는다**
3. **자동화 → 결정 → 보상 → P2P → 위임** 순서 유지
4. **Zero-Cloud**: 모든 데이터는 사용자 기기에만

---

*"AUTUS MVP v0.1 — 기능 동결 완료"*
*2026-01-17*
