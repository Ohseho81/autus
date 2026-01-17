# AUTUS 컴포넌트 정리

## 핵심 컴포넌트 (유지)

### 1. 미래예측 관련
- `Galaxy/` - 3D 시각화 (InstancedMesh 최적화)
- `Prediction/` - 예측 결과 표시
- `Visualizations/CausalGraph.tsx` - 인과관계 시각화

### 2. 자동화 관련
- `Scale/ScaleUI.tsx` - K-Scale UI
- `CommandCenter/CommandCenterV2.tsx` - 자동화 대시보드
- `Sovereign/` - 자동 실행 패널

### 3. 공통
- `Common/` - 알림, KPI, 스켈레톤
- `Navigation/` - 네비게이션
- `UI/` - 모달, 툴팁

## 삭제 예정 (중복)

### Dashboard 중복
- `Dashboard/AUTUSDashboard.tsx` → `AutusApp.tsx`로 통합
- `Dashboard/GlobalSyncDashboard.tsx` → 삭제
- `Dashboard/MasterResonanceDashboard.tsx` → 삭제
- `autus-ui/KIDashboard.tsx` → 삭제
- `autus-ui/KIDashboardV2.tsx` → 삭제
- `SMB/IntegratedDashboard.tsx` → 삭제
- `Unified/UnifiedDashboard.tsx` → 삭제
- `Transform/TransformDashboard.tsx` → 삭제

### Trinity 중복
- `Trinity/*.tsx` (10개) → 핵심 3개만 유지

### 레거시
- `DataInputDashboard.tsx` → 삭제
- `LaplacianSimulator.tsx` → 삭제
- `LearningLoopDemo.tsx` → 삭제
- `AUTUSAppV3/` → 삭제

## 최종 컴포넌트 구조

```
frontend/src/components/
├── Galaxy/           # 3D 시각화 (핵심)
│   ├── GalaxyScene.tsx
│   ├── GalaxyNodes.tsx
│   ├── GalaxyConnections.tsx
│   └── GalaxyDashboard.tsx
│
├── Prediction/       # 미래예측 (핵심)
│   └── AutusPrediction.tsx
│
├── Automation/       # 자동화 (핵심)
│   ├── AutomationPanel.tsx
│   └── RuleEditor.tsx
│
├── Scale/            # K-Scale (핵심)
│   ├── ScaleUI.tsx
│   └── scaleDefinitions.ts
│
├── Common/           # 공통
│   ├── AlertFeed.tsx
│   ├── KPIWidget.tsx
│   └── Skeleton.tsx
│
├── Navigation/       # 네비게이션
│   ├── ZoomNav.tsx
│   └── ScaleSwitcher.tsx
│
└── UI/               # 기본 UI
    ├── Tooltip.tsx
    └── NodeDetailModal.tsx
```

## 통합 후 예상 파일 수

- 현재: 130개
- 목표: 30개 이하
- 감소율: 77%
