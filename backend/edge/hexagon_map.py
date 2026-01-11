"""
Arbutus Edge Kernel + Hexagon Map Visualization
================================================

백만 건 로그 → 이상 징후 추출 → 헥사곤 맵 시각화
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum, IntEnum
from collections import defaultdict
import json
import time
import math
import hashlib


# ============================================================
# 1. HEXAGON PHYSICS (6 영역)
# ============================================================

class HexPhysics(IntEnum):
    """헥사곤 물리 영역"""
    FINANCIAL = 0      # 재무 건강성 (12시 방향)
    CAPITAL = 1        # 자본 리스크 (2시)
    COMPLIANCE = 2     # 규정 준수 (4시)
    CONTROL = 3        # 통제 환경 (6시)
    REPUTATION = 4     # 평판 (8시)
    STAKEHOLDER = 5    # 이해관계자 (10시)


# 헥사곤 좌표 (중심 기준, 반지름 1)
HEX_COORDS = {
    HexPhysics.FINANCIAL:   (0.0, 1.0),      # 12시
    HexPhysics.CAPITAL:     (0.866, 0.5),    # 2시
    HexPhysics.COMPLIANCE:  (0.866, -0.5),   # 4시
    HexPhysics.CONTROL:     (0.0, -1.0),     # 6시
    HexPhysics.REPUTATION:  (-0.866, -0.5),  # 8시
    HexPhysics.STAKEHOLDER: (-0.866, 0.5),   # 10시
}

# 이상 유형 → Physics 매핑
ANOMALY_PHYSICS_MAP = {
    "duplicate": [HexPhysics.CAPITAL, HexPhysics.CONTROL],
    "outlier": [HexPhysics.FINANCIAL, HexPhysics.CAPITAL],
    "benford": [HexPhysics.FINANCIAL, HexPhysics.COMPLIANCE],
    "gap": [HexPhysics.CONTROL, HexPhysics.COMPLIANCE],
    "high_value": [HexPhysics.CAPITAL, HexPhysics.FINANCIAL],
    "round_amount": [HexPhysics.CAPITAL, HexPhysics.REPUTATION],
    "weekend": [HexPhysics.CONTROL, HexPhysics.COMPLIANCE],
    "period_end": [HexPhysics.FINANCIAL, HexPhysics.COMPLIANCE],
    "missing_approval": [HexPhysics.CONTROL, HexPhysics.COMPLIANCE],
    "unauthorized": [HexPhysics.CONTROL, HexPhysics.REPUTATION],
}


# ============================================================
# 2. ANOMALY DATA STRUCTURES
# ============================================================

@dataclass
class AnomalyPoint:
    """이상 징후 포인트"""
    id: str
    anomaly_type: str
    severity: float          # 0-1
    physics: HexPhysics
    
    # 원본 데이터
    source_record: Dict
    value: float
    z_score: Optional[float] = None
    
    # 헥사곤 좌표 (계산됨)
    hex_x: float = 0.0
    hex_y: float = 0.0
    
    # 메타데이터
    timestamp: int = 0
    category: str = ""
    vendor: str = ""
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.anomaly_type,
            "severity": round(self.severity, 3),
            "physics": self.physics.name,
            "physics_id": self.physics.value,
            "x": round(self.hex_x, 4),
            "y": round(self.hex_y, 4),
            "value": self.value,
            "z_score": self.z_score,
            "category": self.category,
            "vendor": self.vendor,
            "timestamp": self.timestamp
        }


@dataclass
class HexagonRegion:
    """헥사곤 영역"""
    physics: HexPhysics
    center_x: float
    center_y: float
    
    # 집계 데이터
    anomaly_count: int = 0
    total_severity: float = 0.0
    max_severity: float = 0.0
    anomalies: List[AnomalyPoint] = field(default_factory=list)
    
    @property
    def avg_severity(self) -> float:
        return self.total_severity / self.anomaly_count if self.anomaly_count > 0 else 0
    
    @property
    def risk_level(self) -> str:
        if self.avg_severity >= 0.7:
            return "CRITICAL"
        elif self.avg_severity >= 0.5:
            return "HIGH"
        elif self.avg_severity >= 0.3:
            return "MEDIUM"
        elif self.avg_severity >= 0.1:
            return "LOW"
        return "NORMAL"
    
    def to_dict(self) -> dict:
        return {
            "physics": self.physics.name,
            "physics_id": self.physics.value,
            "center": {"x": self.center_x, "y": self.center_y},
            "anomaly_count": self.anomaly_count,
            "avg_severity": round(self.avg_severity, 3),
            "max_severity": round(self.max_severity, 3),
            "risk_level": self.risk_level
        }


# ============================================================
# 3. HEXAGON MAP ENGINE
# ============================================================

class HexagonMapEngine:
    """
    헥사곤 맵 엔진
    
    이상 징후를 6개 Physics 영역에 매핑하고 시각화 데이터 생성
    """
    
    def __init__(self, radius: float = 200.0):
        self.radius = radius
        
        # 6개 헥사곤 영역 초기화
        self.regions: Dict[HexPhysics, HexagonRegion] = {}
        for physics in HexPhysics:
            cx, cy = HEX_COORDS[physics]
            self.regions[physics] = HexagonRegion(
                physics=physics,
                center_x=cx * radius,
                center_y=cy * radius
            )
        
        # 전체 이상 징후
        self.all_anomalies: List[AnomalyPoint] = []
        
        # 통계
        self.stats = {
            "total_anomalies": 0,
            "by_type": defaultdict(int),
            "by_physics": defaultdict(int),
            "processing_time_ms": 0
        }
    
    def reset(self):
        """초기화"""
        for region in self.regions.values():
            region.anomaly_count = 0
            region.total_severity = 0.0
            region.max_severity = 0.0
            region.anomalies.clear()
        
        self.all_anomalies.clear()
        self.stats = {
            "total_anomalies": 0,
            "by_type": defaultdict(int),
            "by_physics": defaultdict(int),
            "processing_time_ms": 0
        }
    
    def map_anomaly(self, anomaly: AnomalyPoint) -> AnomalyPoint:
        """
        이상 징후를 헥사곤 좌표에 매핑
        
        - 해당 Physics 영역 중심 근처에 배치
        - 심각도에 따라 중심에 가까울수록 심각
        """
        region = self.regions[anomaly.physics]
        
        # 심각도 기반 거리 (심각할수록 중심에 가까움)
        distance_factor = 1 - anomaly.severity * 0.7
        max_offset = self.radius * 0.4 * distance_factor
        
        # 고유 ID 기반 오프셋 (겹침 방지)
        hash_val = int(hashlib.md5(anomaly.id.encode()).hexdigest()[:8], 16)
        angle = (hash_val % 360) * math.pi / 180
        offset = (hash_val % 1000) / 1000 * max_offset
        
        anomaly.hex_x = region.center_x + math.cos(angle) * offset
        anomaly.hex_y = region.center_y + math.sin(angle) * offset
        
        return anomaly
    
    def add_anomaly(self, anomaly: AnomalyPoint):
        """이상 징후 추가"""
        # 좌표 매핑
        self.map_anomaly(anomaly)
        
        # 영역에 추가
        region = self.regions[anomaly.physics]
        region.anomalies.append(anomaly)
        region.anomaly_count += 1
        region.total_severity += anomaly.severity
        region.max_severity = max(region.max_severity, anomaly.severity)
        
        # 전체 목록에 추가
        self.all_anomalies.append(anomaly)
        
        # 통계 업데이트
        self.stats["total_anomalies"] += 1
        self.stats["by_type"][anomaly.anomaly_type] += 1
        self.stats["by_physics"][anomaly.physics.name] += 1
    
    def process_kernel_results(
        self,
        duplicates: List[Dict],
        outliers: List[Dict],
        benford: Dict,
        source_table: Any = None
    ) -> Dict:
        """
        Edge Kernel 결과를 헥사곤 맵으로 변환
        """
        start = time.perf_counter()
        self.reset()
        
        # 1. 중복 처리
        for dup in duplicates:
            severity = min(1.0, dup["count"] / 10)  # 10회 이상 = 최대 심각도
            physics = ANOMALY_PHYSICS_MAP["duplicate"][0]
            
            anomaly = AnomalyPoint(
                id=f"DUP-{dup['key'][:20]}",
                anomaly_type="duplicate",
                severity=severity,
                physics=physics,
                source_record=dup.get("first_row", {}),
                value=dup["count"],
                category=dup.get("first_row", {}).get("category", ""),
                vendor=dup.get("first_row", {}).get("vendor", "")
            )
            self.add_anomaly(anomaly)
        
        # 2. 이상치 처리
        for out in outliers:
            z = abs(out.get("z_score", 0))
            severity = min(1.0, z / 5)  # z=5 이상 = 최대 심각도
            physics = ANOMALY_PHYSICS_MAP["outlier"][0]
            
            # 금액 크기에 따라 Physics 분배
            value = out.get("value", 0)
            if value > 100000:
                physics = HexPhysics.CAPITAL
            elif value > 50000:
                physics = HexPhysics.FINANCIAL
            
            anomaly = AnomalyPoint(
                id=f"OUT-{out['row_index']}",
                anomaly_type="outlier",
                severity=severity,
                physics=physics,
                source_record={},
                value=value,
                z_score=out.get("z_score")
            )
            self.add_anomaly(anomaly)
        
        # 3. 벤포드 위반 처리
        if benford.get("conformity") in ["MARGINAL", "NON_CONFORMING"]:
            severity = 0.5 if benford["conformity"] == "MARGINAL" else 0.8
            physics = ANOMALY_PHYSICS_MAP["benford"][0]
            
            for digit in benford.get("suspicious_digits", []):
                anomaly = AnomalyPoint(
                    id=f"BENFORD-{digit}",
                    anomaly_type="benford",
                    severity=severity,
                    physics=physics,
                    source_record={"digit": digit, "chi_square": benford["chi_square"]},
                    value=benford.get("observed", {}).get(digit, 0)
                )
                self.add_anomaly(anomaly)
        
        elapsed_ms = (time.perf_counter() - start) * 1000
        self.stats["processing_time_ms"] = elapsed_ms
        
        return self.get_visualization_data()
    
    def get_visualization_data(self) -> Dict:
        """시각화용 데이터 반환"""
        return {
            "timestamp": int(time.time() * 1000),
            "radius": self.radius,
            "regions": [r.to_dict() for r in self.regions.values()],
            "anomalies": [a.to_dict() for a in self.all_anomalies],
            "stats": {
                "total": self.stats["total_anomalies"],
                "by_type": dict(self.stats["by_type"]),
                "by_physics": dict(self.stats["by_physics"]),
                "processing_ms": round(self.stats["processing_time_ms"], 2)
            },
            "risk_summary": {
                physics.name: self.regions[physics].risk_level
                for physics in HexPhysics
            }
        }
    
    def get_heatmap_data(self, resolution: int = 50) -> List[List[float]]:
        """
        히트맵 데이터 생성 (resolution x resolution 그리드)
        """
        grid = [[0.0 for _ in range(resolution)] for _ in range(resolution)]
        
        # 각 이상 징후의 영향을 그리드에 반영
        for anomaly in self.all_anomalies:
            # 좌표를 그리드 인덱스로 변환
            gx = int((anomaly.hex_x / self.radius + 1.5) / 3 * resolution)
            gy = int((anomaly.hex_y / self.radius + 1.5) / 3 * resolution)
            
            # 가우시안 확산
            spread = int(resolution * 0.1)
            for dx in range(-spread, spread + 1):
                for dy in range(-spread, spread + 1):
                    nx, ny = gx + dx, gy + dy
                    if 0 <= nx < resolution and 0 <= ny < resolution:
                        dist = math.sqrt(dx*dx + dy*dy)
                        influence = anomaly.severity * math.exp(-dist*dist / (spread*spread))
                        grid[ny][nx] += influence
        
        # 정규화
        max_val = max(max(row) for row in grid) or 1
        return [[round(v / max_val, 3) for v in row] for row in grid]

