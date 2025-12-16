# LimePass Kernel v1.0.0

## Overview

100단계 실행 매뉴얼을 4계층 파이프라인으로 변환한 실행 가능 스펙.

```
Event(발생) → RulePack(해석) → Flow(행동) → ScoreCard(성과)
```

## Architecture

```
/limepass-kernel/
├── events/           # 34개 이벤트 정의
│   ├── schema.json   # Event 검증 스키마
│   ├── lgo.yaml      # 지자체 이벤트 (8개)
│   ├── uni.yaml      # 대학 이벤트 (8개)
│   ├── phgov.yaml    # PH 정부 이벤트 (7개)
│   ├── emp.yaml      # 고용처 이벤트 (9개)
│   └── gov.yaml      # 중앙정부 이벤트 (7개)
│
├── rulepacks/        # 6개 RulePack 정의
│   ├── schema.json
│   ├── local_gov_readiness.json
│   ├── university_readiness.json
│   ├── phgov_accreditation.json
│   ├── employer_quality.json
│   ├── support_eligibility.json
│   └── gov_certification.json
│
├── flows/            # 5개 Flow 정의
│   ├── schema.json
│   ├── lgo_mou.json
│   ├── uni_integration.json
│   ├── ph_accreditation.json
│   ├── emp_onboard.json
│   └── gov_national_project.json
│
├── scorecards/       # 3개 ScoreCard 정의
│   ├── schema.json
│   ├── local_gov.json
│   ├── university.json
│   └── employer.json
│
└── deltas/           # 국가별 오버라이드
    ├── kr.yaml       # 한국
    ├── ph.yaml       # 필리핀
    └── jp.yaml       # 일본 (템플릿)
```

## Event Naming Convention

```
EVT::{DOMAIN}_{ACTION}

Domains:
- LGO: Local Government (지자체)
- UNI: University (대학)
- PHGOV: Philippine Government
- EMP: Employer (고용처)
- GOV: Central Government (중앙정부)
```

## RulePack Evaluation Modes

| Mode | Description |
|------|-------------|
| `all` | 모든 조건 충족 필요 (AND) |
| `any` | 하나라도 충족 (OR) |
| `weighted` | 가중치 합산 후 threshold 비교 |

## Flow Execution Modes

| Mode | Use Case |
|------|----------|
| `sync` | 즉시 완료 필요 (문서 생성, DB 기록) |
| `async` | 시간 소요 (API 호출, 알림 발송) |
| `hybrid` | 혼합 (전체 Flow는 async, 개별 step은 선택) |

## ScoreCard Features

- **Tiers**: 점수 구간별 등급 (Platinum → Inactive)
- **Decay**: 활동 없으면 점수 감소
- **Audit**: Rekor Log로 변경 이력 불변 기록

## Delta System

국가별 차이는 delta 파일로 오버라이드:

```yaml
# deltas/kr.yaml
rulepacks:
  LocalGovReadiness:
    conditions:
      data_submission_threshold:
        value: 0.75  # 한국은 75% 이상 필요
```

기본값 + delta = 최종 설정

## Usage

```python
from kernel_loader import LimePassKernel

# 한국 설정으로 커널 로드
kernel = LimePassKernel(country="KR")

# 이벤트 발생
kernel.emit("EVT::LGO_DATA_SHARED", {
    "lgo_id": "LGO_001",
    "data_submission_rate": 0.82
})

# RulePack이 자동 평가 → Flow 트리거 → ScoreCard 업데이트
```

## Quick Reference

### 100단계 → Event 매핑

| 단계 | Event |
|------|-------|
| 1-10 | Contact/Profile 이벤트들 |
| 11-30 | Data/MOU 이벤트들 |
| 31-50 | Pilot/Integration 이벤트들 |
| 51-70 | ScoreCard/Validation 이벤트들 |
| 71-100 | Government/National 이벤트들 |

### 핵심 수치 (한국 기준)

| 항목 | 임계값 |
|------|--------|
| 지자체 데이터 제출율 | ≥ 75% |
| 대학 API 테스트 성공 | ≥ 80% |
| 고용처 Payroll 검증 | ≥ 95% |
| Fraud Risk | ≤ 0.1% |

## Version History

- v1.0.0 (2024-12): Initial release
  - 34 Events across 5 domains
  - 6 RulePacks with weighted evaluation
  - 5 Flows with 4-8 steps each
  - 3 ScoreCarda with tier system
  - Delta support for KR, PH, JP
