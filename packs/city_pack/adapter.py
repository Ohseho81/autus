from typing import Dict, Tuple, List

class CityPackAdapter:
    """City/Infrastructure 이벤트를 Autus 입력으로 변환"""
    
    def __init__(self, manager=None):
        self.manager = manager
        self.cities = {}
    
    def create_city(self, city_id: str) -> dict:
        gmu_id = f"CITY_{city_id}"
        self.cities[gmu_id] = {
            "id": gmu_id,
            "type": "city",
            "slots": {},
            "grove_state": "normal",
            "events": [],
            "infra": {}
        }
        return self.cities[gmu_id]
    
    def create_district(self, city_id: str, district_id: str) -> dict:
        gmu_id = f"CITY_{city_id}_DIST_{district_id}"
        self.cities[gmu_id] = {
            "id": gmu_id,
            "type": "district",
            "parent": f"CITY_{city_id}",
            "slots": {},
            "grove_state": "normal",
            "events": [],
            "infra": {}
        }
        return self.cities[gmu_id]
    
    def create_infra(self, city_id: str, district_id: str, infra_type: str) -> dict:
        """인프라 GMU 생성 (traffic/safety/energy)"""
        gmu_id = f"CITY_{city_id}_DIST_{district_id}_{infra_type.upper()}"
        parent_id = f"CITY_{city_id}_DIST_{district_id}"
        self.cities[gmu_id] = {
            "id": gmu_id,
            "type": infra_type,
            "parent": parent_id,
            "slots": {},
            "grove_state": "normal",
            "events": []
        }
        # 부모에 인프라 연결
        if parent_id in self.cities:
            self.cities[parent_id]["infra"][infra_type] = gmu_id
        return self.cities[gmu_id]
    
    def map_event(self, event) -> Tuple[Dict[str, float], float, float]:
        """기본 City 이벤트 변환"""
        intensity = event.intensity
        duration_factor = event.duration_factor() if hasattr(event, 'duration_factor') else 1.0
        
        if event.kind == "incident":
            return (
                {"People": 0.2, "Policy": 0.1, "Work": 0.3},
                0.8 * intensity * duration_factor,
                0.2
            )
        if event.kind == "policy":
            return (
                {"Policy": 0.6, "People": 0.2},
                0.5 * intensity * duration_factor,
                0.4
            )
        if event.kind == "investment":
            return (
                {"Money": 0.7, "Work": 0.5, "Policy": 0.2},
                0.2 * intensity,
                0.8
            )
        return ({"Work": 0.3}, 0.3, 0.5)
    
    def map_infra_event(self, event) -> Tuple[Dict[str, float], float, float]:
        """인프라 이벤트 변환"""
        intensity = event.intensity
        duration_factor = event.duration_factor() if hasattr(event, 'duration_factor') else 1.0
        
        if event.domain == "traffic":
            if event.kind == "load":
                return ({"Work": 0.6, "People": 0.3}, 0.5 * intensity * duration_factor, 0.4)
            if event.kind == "incident":
                return ({"People": 0.3, "Work": 0.4}, 0.8 * intensity * duration_factor, 0.2)
            if event.kind == "investment":
                return ({"Money": 0.5, "Work": 0.6}, 0.1, 0.8)
        
        if event.domain == "safety":
            if event.kind == "incident":
                return ({"People": 0.1, "Policy": 0.3}, 0.9 * intensity * duration_factor, 0.1)
            if event.kind == "load":
                return ({"People": 0.4, "Policy": 0.2}, 0.6 * intensity * duration_factor, 0.3)
            if event.kind == "investment":
                return ({"Policy": 0.5, "People": 0.3}, 0.1, 0.7)
        
        if event.domain == "energy":
            if event.kind == "load":
                return ({"Money": 0.5, "Work": 0.4}, 0.6 * intensity * duration_factor, 0.3)
            if event.kind == "incident":
                return ({"Money": 0.3, "Work": 0.5}, 0.7 * intensity * duration_factor, 0.2)
            if event.kind == "investment":
                return ({"Money": 0.7, "Work": 0.4}, 0.2, 0.8)
        
        return ({"Work": 0.3}, 0.3, 0.5)
    
    def explain_impact(self, event, result: dict, domain: str = None) -> dict:
        """이벤트 영향 설명"""
        slots = result.get("slots", {})
        grove = result.get("grove_state", "unknown")
        
        explanation = {
            "event": event.kind,
            "domain": domain or getattr(event, 'domain', 'city'),
            "intensity": event.intensity,
            "impact": [],
            "grove_state": grove
        }
        
        # 슬롯별 영향 분석
        if slots.get("Heart", 0) < 0.4:
            explanation["impact"].append("Heart ↓: 의지/회복력 약화")
        if slots.get("Base", 0) < 0.4:
            explanation["impact"].append("Base ↓: 안정성 저하")
        if slots.get("Sensors", 0) > 0.8:
            explanation["impact"].append("Sensors ↑: 과부하 감지")
        if slots.get("Boundary", 0) > 0.7:
            explanation["impact"].append("Boundary ↑: 외부 압력 증가")
        if slots.get("Core", 0) > 0.7:
            explanation["impact"].append("Core ↑: 핵심 역량 강화")
        if slots.get("Engines", 0) > 0.7:
            explanation["impact"].append("Engines ↑: 실행력 향상")
        
        return explanation
    
    def analyze_collapse_order(self, infra_states: Dict[str, dict]) -> List[dict]:
        """어느 인프라가 먼저 붕괴하는지 분석"""
        vulnerabilities = []
        
        for infra_id, state in infra_states.items():
            slots = state.get("slots", {})
            grove = state.get("grove_state", "normal")
            
            # 취약도 계산 (Base, Heart 낮을수록 취약)
            base = slots.get("Base", 0.5)
            heart = slots.get("Heart", 0.5)
            vulnerability = 1 - (base * 0.6 + heart * 0.4)
            
            vulnerabilities.append({
                "infra": infra_id,
                "type": state.get("type", "unknown"),
                "vulnerability": round(vulnerability, 3),
                "grove_state": grove,
                "risk_factors": []
            })
            
            if base < 0.3:
                vulnerabilities[-1]["risk_factors"].append("Base 매우 낮음")
            if heart < 0.3:
                vulnerabilities[-1]["risk_factors"].append("Heart 매우 낮음")
            if grove in ["tension", "inflection"]:
                vulnerabilities[-1]["risk_factors"].append(f"Grove: {grove}")
        
        # 취약도 높은 순 정렬
        vulnerabilities.sort(key=lambda x: x["vulnerability"], reverse=True)
        return vulnerabilities
