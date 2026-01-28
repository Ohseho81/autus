# 🗺️ AUTUS 네비게이션 맵

> 역할별 버튼 연결 구조도

## 전체 구조

```mermaid
flowchart TB
    subgraph START["🏠 역할 선택 화면"]
        HOME["autus-ai.com"]
    end
    
    subgraph INTERNAL["🏛️ 내부 역할"]
        CL["👑 C-Level<br/>원장/CEO"]
        FSD["⚙️ FSD<br/>실장/관리자"]
        OPT["🔨 Optimus<br/>선생님/실무자"]
    end
    
    subgraph EXTERNAL["🌐 외부 역할"]
        CON["👩‍🎓 Consumer<br/>학생/학부모"]
        REG["🏛️ Regulatory<br/>정부/행정"]
        PAR["🤝 Partner<br/>파트너사"]
    end
    
    HOME --> CL
    HOME --> FSD
    HOME --> OPT
    HOME --> CON
    HOME --> REG
    HOME --> PAR
    
    CL -.->|🔄 역할 변경| HOME
    FSD -.->|🔄 역할 변경| HOME
    OPT -.->|🔄 역할 변경| HOME
    CON -.->|🔄 역할 변경| HOME
    REG -.->|🔄 역할 변경| HOME
    PAR -.->|🔄 역할 변경| HOME
```

---

## 👑 C-Level (원장/CEO) 네비게이션

```mermaid
flowchart LR
    subgraph CLEVEL["👑 C-Level Dashboard"]
        CL_HOME["🏛️ A=T^σ<br/>AutusDashboard"]
        CL_GOALS["🎯 Goals<br/>GoalEngine"]
        CL_VALUE["💎 Value<br/>ValueDashboard"]
        CL_GLOBAL["🌏 Global<br/>GlobalTelemetry"]
        CL_ANALYTICS["📈 Analytics<br/>PerformanceAnalytics"]
        CL_SETTINGS["⚙️ Settings<br/>SettingsPage"]
    end
    
    CL_HOME --- CL_GOALS
    CL_GOALS --- CL_VALUE
    CL_VALUE --- CL_GLOBAL
    CL_GLOBAL --- CL_ANALYTICS
    CL_ANALYTICS --- CL_SETTINGS
```

### C-Level 메뉴 설명

| 버튼 | 페이지 | 기능 |
|------|--------|------|
| 🏛️ A=T^σ | AutusDashboard | 핵심 지표 대시보드, V-Index 현황 |
| 🎯 Goals | GoalEngine | 목표 설정 및 진척도 관리 |
| 💎 Value | ValueDashboard | 자산 가치화 현황, STU 계산 |
| 🌏 Global | GlobalTelemetry | 글로벌 데이터 (한국/필리핀) |
| 📈 Analytics | PerformanceAnalytics | 성과 분석, 트렌드 |
| ⚙️ Settings | SettingsPage | 시스템 설정 |

---

## ⚙️ FSD (실장/관리자) 네비게이션

```mermaid
flowchart LR
    subgraph FSD_NAV["⚙️ FSD Dashboard"]
        FSD_HOME["🎯 Judgment<br/>FSDDashboard"]
        FSD_PRINCIPAL["👔 Principal<br/>PrincipalConsole"]
        FSD_RETENTION["🛡️ Retention<br/>RetentionForce"]
        FSD_RISK["⚠️ Risk Queue<br/>RiskQueueManager"]
        FSD_CHEM["⚗️ Chemistry<br/>ChemistryMatching"]
        FSD_MIRROR["🪞 Mirror<br/>SafetyMirror"]
    end
    
    FSD_HOME --- FSD_PRINCIPAL
    FSD_PRINCIPAL --- FSD_RETENTION
    FSD_RETENTION --- FSD_RISK
    FSD_RISK --- FSD_CHEM
    FSD_CHEM --- FSD_MIRROR
```

### FSD 메뉴 설명

| 버튼 | 페이지 | 기능 |
|------|--------|------|
| 🎯 Judgment | FSDDashboard | 판단 대시보드, 의사결정 지원 |
| 👔 Principal | PrincipalConsole | 원장 콘솔, 알림 관리 |
| 🛡️ Retention | RetentionForce | 이탈 방지, 유지율 관리 |
| ⚠️ Risk Queue | RiskQueueManager | 위험 학생 목록, 우선순위 |
| ⚗️ Chemistry | ChemistryMatching | 선생님-학생 매칭 |
| 🪞 Mirror | SafetyMirror | 학부모 앱 패턴 분석 |

---

## 🔨 Optimus (선생님/실무자) 네비게이션

```mermaid
flowchart LR
    subgraph OPT_NAV["🔨 Optimus Dashboard"]
        OPT_HOME["⚡ Execution<br/>OptimusDashboard"]
        OPT_TAG["📝 Quick Tag<br/>QuickTagConsole"]
        OPT_SCRIPT["🤖 Script AI<br/>AutoScriptGenerator"]
        OPT_STU["👩‍🎓 Students<br/>StudentDetailPage"]
        OPT_ATT["📋 Attendance<br/>AttendancePage"]
        OPT_CAL["📅 Calendar<br/>CalendarPage"]
    end
    
    OPT_HOME --- OPT_TAG
    OPT_TAG --- OPT_SCRIPT
    OPT_SCRIPT --- OPT_STU
    OPT_STU --- OPT_ATT
    OPT_ATT --- OPT_CAL
```

### Optimus 메뉴 설명

| 버튼 | 페이지 | 기능 |
|------|--------|------|
| ⚡ Execution | OptimusDashboard | 오늘의 작업, 실행 대시보드 |
| 📝 Quick Tag | QuickTagConsole | 빠른 태깅, 현장 데이터 입력 |
| 🤖 Script AI | AutoScriptGenerator | AI 스크립트 생성 |
| 👩‍🎓 Students | StudentDetailPage | 학생 상세 정보 |
| 📋 Attendance | AttendancePage | 출석 관리 |
| 📅 Calendar | CalendarPage | 일정 관리 |

---

## 👩‍🎓 Consumer (학생/학부모) 네비게이션

```mermaid
flowchart LR
    subgraph CON_NAV["👩‍🎓 Consumer Dashboard"]
        CON_PORTAL["🌐 Portal<br/>ExternalPortal"]
        CON_GARDEN["🌱 My Space<br/>DopamineGarden"]
        CON_FEED["📝 Feedback<br/>FeedbackPage"]
        CON_PROFILE["👤 Profile<br/>ProfilePage"]
    end
    
    CON_PORTAL --- CON_GARDEN
    CON_GARDEN --- CON_FEED
    CON_FEED --- CON_PROFILE
```

### Consumer 메뉴 설명

| 버튼 | 페이지 | 기능 |
|------|--------|------|
| 🌐 Portal | ExternalPortal | 메인 포털, 출석/성적/V-포인트 |
| 🌱 My Space | DopamineGarden | 개인 공간, 게이미피케이션 |
| 📝 Feedback | FeedbackPage | 피드백 제출 |
| 👤 Profile | ProfilePage | 프로필 설정 |

---

## 🏛️ Regulatory (정부/행정) 네비게이션

```mermaid
flowchart LR
    subgraph REG_NAV["🏛️ Regulatory Dashboard"]
        REG_PORTAL["🌐 Portal<br/>ExternalPortal"]
        REG_REPORTS["📄 Reports<br/>LiveDashboard"]
        REG_PROFILE["👤 Profile<br/>ProfilePage"]
    end
    
    REG_PORTAL --- REG_REPORTS
    REG_REPORTS --- REG_PROFILE
```

---

## 🤝 Partner (파트너사) 네비게이션

```mermaid
flowchart LR
    subgraph PAR_NAV["🤝 Partner Dashboard"]
        PAR_PORTAL["🌐 Portal<br/>ExternalPortal"]
        PAR_ORDERS["📦 Orders<br/>LiveDashboard"]
        PAR_PROFILE["👤 Profile<br/>ProfilePage"]
    end
    
    PAR_PORTAL --- PAR_ORDERS
    PAR_ORDERS --- PAR_PROFILE
```

---

## 🔄 전체 플로우 요약

```mermaid
flowchart TB
    START["🏠 autus-ai.com<br/>역할 선택"]
    
    START -->|MVP 모드| CL["👑 C-Level"]
    START -->|MVP 모드| FSD["⚙️ FSD"]
    START -->|MVP 모드| OPT["🔨 Optimus"]
    START -->|MVP 모드| CON["👩‍🎓 Consumer"]
    START -->|MVP 모드| REG["🏛️ Regulatory"]
    START -->|MVP 모드| PAR["🤝 Partner"]
    
    CL --> CL_PAGES["6개 페이지"]
    FSD --> FSD_PAGES["6개 페이지"]
    OPT --> OPT_PAGES["6개 페이지"]
    CON --> CON_PAGES["4개 페이지"]
    REG --> REG_PAGES["3개 페이지"]
    PAR --> PAR_PAGES["3개 페이지"]
    
    CL_PAGES -.->|🔄| START
    FSD_PAGES -.->|🔄| START
    OPT_PAGES -.->|🔄| START
    CON_PAGES -.->|🔄| START
    REG_PAGES -.->|🔄| START
    PAR_PAGES -.->|🔄| START
```

---

## 📊 페이지 매트릭스

| 역할 | 페이지 수 | 공통 페이지 |
|------|----------|------------|
| C-Level | 6 | SettingsPage |
| FSD | 6 | - |
| Optimus | 6 | CalendarPage |
| Consumer | 4 | ProfilePage, FeedbackPage |
| Regulatory | 3 | ProfilePage, ExternalPortal |
| Partner | 3 | ProfilePage, ExternalPortal |

**총 고유 페이지**: 18개

---

*Last Updated: 2026-01-26*
