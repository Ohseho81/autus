"""
AUTUS API Routers
=================

Core APIs:
- audit_api: 감사/로그 API
- autus_api: AUTUS 메인 API
- edge_api: Edge 네트워크 API
- efficiency_api: 효율성 분석 API
- engine_api: AUTUS Engine v2.0 API ⭐
- distributed_api: 분산 아키텍처 v2.1 API ⭐ NEW

Extended APIs:
- flow_api: 자금 흐름 API
- keyman_api: Keyman 분석 API
- notification_api: 알림 API
- ontology_api: 온톨로지 엔진 API
- person_score_api: 개인 점수 API
- scale_api: Multi-Scale API
- strategy_api: 전략 결정 API
- unified_api: 통합 API
- viewport_api: Viewport 로딩 API
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
engine_api = _safe_import("engine_api")
kernel_api = _safe_import("kernel_api")
distributed_api = _safe_import("distributed_api")
final_api = _safe_import("final_api")

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

# v3.0.0 Universe API (Living Universe)
universe_api = _safe_import("universe_api")
