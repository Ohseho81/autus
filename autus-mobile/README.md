# AUTUS Mobile v2.1

> **Operating System of Reality**
> 개인/조직의 붕괴를 방지하는 물리 기반 모니터링 시스템

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 웹에서 실행
npm run web

# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android
```

## 📁 프로젝트 구조

```
src/
├── components/      # 재사용 가능한 UI 컴포넌트 (React.memo 적용)
├── screens/         # 5개 탭 화면 (FlatList 가상화)
├── stores/          # Zustand 전역 상태 (subscribeWithSelector)
├── hooks/           # 커스텀 훅 (useMemo 최적화)
├── constants/       # 상수 데이터 (36노드, 5레이어, 5회로)
├── types/           # TypeScript 타입 정의
├── utils/           # 유틸리티 함수
└── services/        # AsyncStorage, Haptics
```

## ⚡ 최적화 적용 사항

| 영역 | 최적화 기법 |
|------|------------|
| **컴포넌트** | `React.memo` - 불필요한 리렌더링 방지 |
| **계산** | `useMemo/useCallback` - 재계산 방지 |
| **리스트** | `FlatList` - 가상화로 메모리 절약 |
| **상태** | `subscribeWithSelector` - 선택적 구독 |
| **탭** | `lazy: true` - 지연 로딩 |

## 📊 핵심 데이터

### 36개 노드 (5개 레이어)
- **L1 💰 재무**: 현금, 수입, 지출, 부채, 런웨이, 예비비, 미수금, 마진
- **L2 ❤️ 생체**: 수면, HRV, 활동량, 연속작업, 휴식간격, 병가
- **L3 ⚙️ 운영**: 마감, 지연, 가동률, 태스크, 오류율, 처리속도, 재고, 의존도
- **L4 👥 고객**: 고객수, 이탈률, NPS, 반복구매, CAC, LTV, 리드
- **L5 🌍 외부**: 직원, 이직률, 경쟁자, 시장성장, 환율, 금리, 규제

### 5개 회로
- **survival**: 지출 → 현금 → 런웨이
- **fatigue**: 태스크 → 수면 → HRV → 지연
- **repeat**: 반복구매 → 수입 → 현금
- **people**: 이직률 → 가동률 → 처리속도
- **growth**: 리드 → 고객수 → 수입

## 🎯 주요 기능

- [x] Top-1 위험 노드 감지
- [x] 동적 통계 계산 (평형점/안정성)
- [x] 미션 CRUD (생성/완료/무시/삭제)
- [x] 노드 필터링 (활성/전체/위험)
- [x] 상태 자동 저장/복원 (AsyncStorage)
- [x] 햅틱 피드백 (터치/성공/경고)
- [x] Pull to Refresh

## 🛠 기술 스택

- **Framework**: React Native + Expo
- **Language**: TypeScript
- **State**: Zustand
- **Navigation**: React Navigation
- **Storage**: AsyncStorage
- **Haptics**: Expo Haptics

---

**"위험을 측정할 수 없으면 관리할 수 없다"**
