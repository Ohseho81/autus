"""
National Meaning Layer OS v1
NationalKernelService - 이벤트 → 벡터 변환 서비스
"""
from typing import Dict, List, Iterable, Any
from pathlib import Path
import yaml

from .national_vector import NationalVector
from .national_risk import compute_risk, compute_success_probability, compute_j_score


CONFIG_DIR = Path(__file__).parent


def _load_yaml(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# YAML 로드 (없으면 기본값)
try:
    DELTA_RULES = _load_yaml(CONFIG_DIR / "delta_rules.yml")
except:
    DELTA_RULES = {"routes": {}, "default": {"DIR": 0, "FOR": 0, "GAP": 0, "UNC": 0, "TEM": 0, "INT": 0}}

try:
    EVENT_RULES = _load_yaml(CONFIG_DIR / "national_events.yml").get("events", {})
except:
    EVENT_RULES = {}


def _get_route_delta(route_code: str) -> Dict[str, float]:
    """루트별 기본 Delta 가져오기"""
    routes = DELTA_RULES.get("routes", {})
    default = DELTA_RULES.get("default", {"DIR": 0, "FOR": 0, "GAP": 0, "UNC": 0, "TEM": 0, "INT": 0})
    return routes.get(route_code, default)


def _get_event_delta(event_code: str) -> Dict[str, float]:
    """이벤트별 Delta 가져오기"""
    return EVENT_RULES.get(
        event_code,
        {"DIR": 0.0, "FOR": 0.0, "GAP": 0.0, "UNC": 0.0, "TEM": 0.0, "INT": 0.0},
    )


class NationalKernelService:
    """국가 정책 해석용 6D 커널 서비스"""

    def __init__(self, route_code: str = "PH-KR"):
        self.route_code = route_code
        self.route_delta = _get_route_delta(route_code)

    def apply_event(self, v: NationalVector, event_code: str) -> NationalVector:
        """단일 이벤트 적용: 루트 Delta + 이벤트 Delta"""
        ed = _get_event_delta(event_code)

        v.dir   += self.route_delta.get("DIR", 0) + ed.get("DIR", 0)
        v.force += self.route_delta.get("FOR", 0) + ed.get("FOR", 0)
        v.gap   += self.route_delta.get("GAP", 0) + ed.get("GAP", 0)
        v.unc   += self.route_delta.get("UNC", 0) + ed.get("UNC", 0)
        v.tem   += self.route_delta.get("TEM", 0) + ed.get("TEM", 0)
        v.integ += self.route_delta.get("INT", 0) + ed.get("INT", 0)

        return v.clamp()

    def apply_events(self, initial: NationalVector, events: Iterable[str]) -> Dict[str, Any]:
        """여러 이벤트를 순차 적용하고 trace 반환"""
        v = initial.copy()
        history: List[Dict] = []

        for ev in events:
            before = v.to_dict()
            v = self.apply_event(v, ev)
            after = v.to_dict()

            history.append({
                "event": ev,
                "vector_before": before,
                "vector_after": after,
                "risk": round(compute_risk(v), 3),
                "success": round(compute_success_probability(v), 3),
                "j_score": compute_j_score(v),
            })

        return {
            "route_code": self.route_code,
            "events_count": len(history),
            "final_vector": v.to_dict(),
            "final_risk": round(compute_risk(v), 3),
            "final_success": round(compute_success_probability(v), 3),
            "final_j_score": compute_j_score(v),
            "history": history,
        }

    @staticmethod
    def list_routes() -> List[str]:
        """사용 가능한 루트 목록"""
        return list(DELTA_RULES.get("routes", {}).keys())

    @staticmethod
    def list_events() -> List[str]:
        """사용 가능한 이벤트 목록"""
        return list(EVENT_RULES.keys())


if __name__ == "__main__":
    print("=== NationalKernelService 테스트 ===\n")
    
    kernel = NationalKernelService("PH-KR")
    print(f"루트: {kernel.route_code}")
    print(f"루트 Delta: {kernel.route_delta}\n")
    
    events = [
        "HUM.APPLY.SUBMITTED",
        "HUM.DOC.UPLOADED",
        "HUM.DOC.APPROVED",
        "GOV.VISA.APPROVED",
        "EMP.OFFER.ACCEPTED",
        "CITY.SETTLEMENT.COMPLETE",
    ]
    
    result = kernel.apply_events(NationalVector(), events)
    
    print(f"이벤트 수: {result['events_count']}")
    print(f"최종 J-Score: {result['final_j_score']}")
    print(f"최종 Risk: {result['final_risk']}")
    print(f"최종 Success: {result['final_success']}")
