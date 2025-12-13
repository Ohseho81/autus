from typing import Dict, Tuple

class CityPackAdapter:
    """City 이벤트를 Autus 입력으로 변환"""
    
    def __init__(self, manager=None):
        self.manager = manager
        self.cities = {}
    
    def create_city(self, city_id: str) -> dict:
        """도시 GMU 생성"""
        gmu_id = f"CITY_{city_id}"
        if self.manager:
            return self.manager.create(gmu_id)
        self.cities[gmu_id] = {
            "id": gmu_id,
            "slots": {},
            "grove_state": "normal",
            "events": []
        }
        return self.cities[gmu_id]
    
    def create_district(self, city_id: str, district_id: str) -> dict:
        """구역 GMU 생성"""
        gmu_id = f"CITY_{city_id}_DIST_{district_id}"
        if self.manager:
            return self.manager.create(gmu_id)
        self.cities[gmu_id] = {
            "id": gmu_id,
            "parent": f"CITY_{city_id}",
            "slots": {},
            "grove_state": "normal",
            "events": []
        }
        return self.cities[gmu_id]
    
    def map_event(self, event) -> Tuple[Dict[str, float], float, float]:
        """
        이벤트를 (tasks, pressure, resource_efficiency)로 변환
        """
        intensity = event.intensity
        duration_factor = event.duration_factor() if hasattr(event, 'duration_factor') else 1.0
        
        if event.kind == "incident":
            # 재난/사고: People 압력 ↑, 자원 효율 ↓
            return (
                {"People": 0.2, "Policy": 0.1, "Work": 0.3},
                0.8 * intensity * duration_factor,  # pressure
                0.2  # resource_efficiency (낮음)
            )
        
        if event.kind == "policy":
            # 규제/행정: Policy 중심, 중간 압력
            return (
                {"Policy": 0.6, "People": 0.2},
                0.5 * intensity * duration_factor,
                0.4
            )
        
        if event.kind == "investment":
            # 투자/인프라: Money/Work 중심, 낮은 압력, 높은 자원
            return (
                {"Money": 0.7, "Work": 0.5, "Policy": 0.2},
                0.2 * intensity,
                0.8  # resource_efficiency (높음)
            )
        
        # 기본값
        return ({"Work": 0.3}, 0.3, 0.5)
    
    def explain_impact(self, event, result: dict) -> dict:
        """이벤트 영향 설명 생성"""
        slots = result.get("slots", {})
        grove = result.get("grove_state", "unknown")
        
        explanation = {
            "event": event.kind,
            "intensity": event.intensity,
            "duration": event.duration,
            "impact": [],
            "grove_state": grove
        }
        
        if event.kind == "incident":
            if slots.get("Heart", 0) < 0.5:
                explanation["impact"].append("Heart ↓: 조직 의지 약화")
            if slots.get("Base", 0) < 0.5:
                explanation["impact"].append("Base ↓: 안정성 저하")
            explanation["impact"].append("Pressure ↑: 외부 압력 증가")
        
        elif event.kind == "policy":
            explanation["impact"].append("Boundary ↑: 규제 경계 강화")
            if grove == "tension":
                explanation["impact"].append("Grove: 긴장 상태 진입")
        
        elif event.kind == "investment":
            explanation["impact"].append("Core ↑: 핵심 역량 강화")
            explanation["impact"].append("Engines ↑: 실행력 향상")
            explanation["impact"].append("Resource ↑: 자원 유입")
        
        return explanation
