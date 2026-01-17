"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS API Routers (v3.1.0)
═══════════════════════════════════════════════════════════════════════════════

📁 구조:
├── Core APIs (핵심)
│   ├── autus_api          - AUTUS 메인 API
│   ├── autus_unified_api  - 48노드 + 42아키타입 통합 API ⭐
│   ├── engine_api         - AUTUS Engine v2.0 API
│   └── kernel_api         - 커널 API
│
├── Physics APIs (물리 엔진)
│   ├── efficiency_api     - 효율성 분석 API
│   ├── flow_api           - 자금 흐름 API
│   └── person_score_api   - 개인 점수 API
│
├── Network APIs (네트워크)
│   ├── edge_api           - Edge 네트워크 API
│   ├── distributed_api    - 분산 아키텍처 v2.1 API
│   └── scale_api          - Multi-Scale API
│
├── Analysis APIs (분석)
│   ├── audit_api          - 감사/로그 API
│   ├── keyman_api         - Keyman 분석 API
│   ├── ontology_api       - 온톨로지 엔진 API
│   └── strategy_api       - 전략 결정 API
│
├── Data APIs (데이터)
│   ├── collection_api     - 데이터 수집 API
│   ├── reliance_api       - 의존 아키텍처 API
│   └── viewport_api       - Viewport 로딩 API
│
├── System APIs (시스템)
│   ├── notification_api   - 알림 API
│   ├── unified_api        - 통합 API
│   └── final_api          - 최종 API
│
└── Sovereign APIs (v2.2.0)
    ├── sovereign_api      - 데이터 주권 API
    ├── injection_api      - 지식 주입 API
    └── pipeline_api       - 파이프라인 API

총 24개 API (정리 완료)
═══════════════════════════════════════════════════════════════════════════════
"""

import warnings

__all__ = []

def _safe_import(name: str):
    """안전한 모듈 임포트"""
    try:
        module = __import__(f"api.{name}", fromlist=[name])
        globals()[name] = module
        __all__.append(name)
        return module
    except ImportError as e:
        warnings.warn(f"Failed to import {name}: {e}")
        return None

# Core APIs
audit_api = _safe_import("audit_api")
autus_api = _safe_import("autus_api")
edge_api = _safe_import("edge_api")
efficiency_api = _safe_import("efficiency_api")
# 삭제됨: engine_api (engine_v2 의존), kernel_api (AUTUSKernel 의존)
# 삭제됨: distributed_api (engine_v2 의존), final_api (autus_final 의존)

# Extended APIs
flow_api = _safe_import("flow_api")
keyman_api = _safe_import("keyman_api")
notification_api = _safe_import("notification_api")
ontology_api = _safe_import("ontology_api")
person_score_api = _safe_import("person_score_api")
scale_api = _safe_import("scale_api")
strategy_api = _safe_import("strategy_api")
unified_api = _safe_import("unified_api")
viewport_api = _safe_import("viewport_api")
reliance_api = _safe_import("reliance_api")
collection_api = _safe_import("collection_api")

# v2.2.0 Sovereign APIs (Injection & Pipeline)
injection_api = _safe_import("injection_api")
pipeline_api = _safe_import("pipeline_api")

# v3.0.0 AUTUS Unified API (48노드 + 42 아키타입 통합)
autus_unified_api = _safe_import("autus_unified_api")

# v4.0.0 K/I Physics & Automation APIs (신규)
ki_api = _safe_import("ki_api")
automation_api = _safe_import("automation_api")
