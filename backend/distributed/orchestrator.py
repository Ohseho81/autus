"""
AUTUS Distributed System Orchestrator v2.1
==========================================

전체 분산 시스템 관리

- 로컬 엔진과 클라우드 엔진 통합
- 통신 프로토콜 관리
- 시스템 시뮬레이션

핵심 원칙:
"데이터는 로컬에 가두고, 법칙만 클라우드에서 흐르게 한다"
"""

from typing import Dict, List, Optional
from datetime import datetime

from .local_engine import LocalPhysicsEngine
from .cloud_engine import CloudCalibrationEngine
from .protocol import (
    UpstreamPacket, DownstreamPacket, Cohort,
    sanitize_upstream, validate_upstream_privacy
)


class AUTUSDistributedSystem:
    """
    AUTUS 분산 시스템 오케스트레이터
    
    FSD 병렬 구조:
    - 개별 주행 영상 → 익명화 → 클라우드 → 주행 알고리즘 개선 → OTA
    - 개별 압력 데이터 → 익명화 → 클라우드 → 물리 상수 개선 → 배포
    """
    
    VERSION = "2.1.0"
    
    def __init__(self):
        # 클라우드 엔진 (싱글톤)
        self.cloud = CloudCalibrationEngine()
        
        # 로컬 엔진 레지스트리 (실제로는 각 디바이스에 분산)
        self.local_engines: Dict[str, LocalPhysicsEngine] = {}
        
        # 통계
        self.total_syncs = 0
        self.last_sync_time: Optional[datetime] = None
    
    # ========================================
    # 로컬 엔진 관리
    # ========================================
    
    def create_local_engine(
        self,
        device_id: Optional[str] = None,
        cohort: Cohort = Cohort.ENTREPRENEUR_EARLY
    ) -> LocalPhysicsEngine:
        """
        새 로컬 엔진 생성
        
        실제 환경에서는 각 디바이스에서 개별 생성
        """
        engine = LocalPhysicsEngine(device_id, cohort)
        self.local_engines[engine.device_id] = engine
        return engine
    
    def get_local_engine(self, device_id: str) -> Optional[LocalPhysicsEngine]:
        """로컬 엔진 조회"""
        return self.local_engines.get(device_id)
    
    def remove_local_engine(self, device_id: str) -> bool:
        """로컬 엔진 제거"""
        if device_id in self.local_engines:
            del self.local_engines[device_id]
            return True
        return False
    
    # ========================================
    # 동기화 (Local ↔ Cloud)
    # ========================================
    
    def sync_local_to_cloud(
        self,
        engine: LocalPhysicsEngine,
        validate: bool = True
    ) -> UpstreamPacket:
        """
        로컬 → 클라우드 동기화
        
        1. Upstream 패킷 생성
        2. 프라이버시 검증
        3. 클라우드로 전송
        """
        # Upstream 생성
        upstream = engine.generate_upstream_packet()
        
        # 프라이버시 검증
        if validate:
            if not validate_upstream_privacy(upstream):
                # 정화 후 재시도
                upstream = sanitize_upstream(upstream)
        
        # 클라우드로 전송
        self.cloud.receive_upstream(upstream)
        
        return upstream
    
    def sync_cloud_to_local(
        self,
        engine: LocalPhysicsEngine
    ) -> DownstreamPacket:
        """
        클라우드 → 로컬 동기화
        
        1. Downstream 패킷 생성
        2. 로컬 엔진에 적용
        """
        # Downstream 생성
        downstream = self.cloud.generate_downstream_packet(engine.cohort.value)
        
        # 로컬 엔진에 적용
        engine.apply_downstream_packet(downstream)
        
        return downstream
    
    def full_sync(
        self,
        engine: LocalPhysicsEngine
    ) -> Dict:
        """
        양방향 동기화
        
        Upstream → 분석 → Downstream
        """
        upstream = self.sync_local_to_cloud(engine)
        downstream = self.sync_cloud_to_local(engine)
        
        self.total_syncs += 1
        self.last_sync_time = datetime.now()
        
        return {
            "upstream": upstream.to_dict(),
            "downstream": downstream.to_dict(),
            "sync_time": self.last_sync_time.isoformat()
        }
    
    # ========================================
    # 전체 사이클
    # ========================================
    
    def full_cycle(
        self,
        engine: LocalPhysicsEngine,
        data: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        전체 사이클 실행
        
        1. 데이터 입력 (로컬)
        2. 물리 계산 (로컬)
        3. Upstream (로컬 → 클라우드)
        4. 분석 (클라우드)
        5. Downstream (클라우드 → 로컬)
        6. 출력 생성 (로컬)
        """
        # 1. 데이터 입력
        if data:
            engine.update_all_values(data)
        
        # 2. 물리 계산
        engine.compute_cycle()
        
        # 3-5. 동기화
        sync_result = self.full_sync(engine)
        
        # 6. 출력 생성
        output = engine.generate_output()
        
        return {
            "upstream": sync_result["upstream"],
            "downstream": sync_result["downstream"],
            "output": {
                "node_id": output.node_id,
                "node_name": output.node_name,
                "state": output.state.name,
                "message": output.message
            } if output else None,
            "engine_state": engine.to_dict()
        }
    
    # ========================================
    # 배치 처리
    # ========================================
    
    def batch_sync_all(self) -> Dict:
        """
        모든 로컬 엔진 동기화
        
        실제 환경에서는 스케줄러로 주기적 실행
        """
        results = []
        
        for device_id, engine in self.local_engines.items():
            try:
                upstream = self.sync_local_to_cloud(engine)
                results.append({
                    "device_id": device_id,
                    "success": True,
                    "stability": upstream.system_stability
                })
            except Exception as e:
                results.append({
                    "device_id": device_id,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "total": len(results),
            "success": sum(1 for r in results if r["success"]),
            "failed": sum(1 for r in results if not r["success"]),
            "results": results
        }
    
    def broadcast_downstream(self) -> Dict:
        """
        모든 로컬 엔진에 Downstream 배포
        
        FSD OTA 업데이트와 유사
        """
        results = []
        
        for device_id, engine in self.local_engines.items():
            try:
                downstream = self.sync_cloud_to_local(engine)
                results.append({
                    "device_id": device_id,
                    "success": True,
                    "version": downstream.version
                })
            except Exception as e:
                results.append({
                    "device_id": device_id,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "total": len(results),
            "success": sum(1 for r in results if r["success"]),
            "failed": sum(1 for r in results if not r["success"]),
            "results": results
        }
    
    # ========================================
    # 시뮬레이션
    # ========================================
    
    def simulate_multi_user(
        self,
        user_count: int = 10,
        cohort: Cohort = Cohort.ENTREPRENEUR_EARLY
    ) -> Dict:
        """
        다중 사용자 시뮬레이션
        
        테스트 및 검증용
        """
        import random
        
        engines = []
        
        # 엔진 생성 및 시뮬레이션 데이터 입력
        for i in range(user_count):
            engine = self.create_local_engine(cohort=cohort)
            
            # 랜덤 데이터 생성
            data = {
                "n01": random.uniform(10000000, 100000000),  # 현금
                "n02": random.uniform(3000000, 15000000),    # 수입
                "n03": random.uniform(2000000, 10000000),    # 지출
                "n05": random.uniform(4, 30),               # 런웨이
                "n09": random.uniform(4, 8),                # 수면
                "n10": random.uniform(20, 60),              # HRV
                "n15": random.uniform(1, 10),               # 마감
                "n18": random.uniform(5, 50),               # 태스크
                "n23": random.uniform(10, 200),             # 고객수
                "n24": random.uniform(2, 15),               # 이탈률
            }
            
            engine.update_all_values(data)
            engine.compute_cycle()
            engines.append(engine)
        
        # 배치 동기화
        self.batch_sync_all()
        
        # 통계
        stabilities = [e.system_stability() for e in engines]
        critical_counts = [len(e.get_critical_nodes()) for e in engines]
        
        return {
            "user_count": user_count,
            "cohort": cohort.value,
            "avg_stability": sum(stabilities) / len(stabilities),
            "avg_critical_nodes": sum(critical_counts) / len(critical_counts),
            "cloud_stats": self.cloud.get_global_stats()
        }
    
    # ========================================
    # 상태 조회
    # ========================================
    
    def get_system_status(self) -> Dict:
        """전체 시스템 상태 조회"""
        return {
            "version": self.VERSION,
            "local_engines_count": len(self.local_engines),
            "total_syncs": self.total_syncs,
            "last_sync_time": self.last_sync_time.isoformat() if self.last_sync_time else None,
            "cloud_stats": self.cloud.get_global_stats()
        }
    
    def to_dict(self) -> Dict:
        """전체 상태를 딕셔너리로"""
        return {
            "version": self.VERSION,
            "status": self.get_system_status(),
            "local_engines": [
                {"device_id": e.device_id, "cohort": e.cohort.value}
                for e in self.local_engines.values()
            ],
            "cloud": self.cloud.to_dict()
        }


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_system_instance: Optional[AUTUSDistributedSystem] = None


def get_distributed_system() -> AUTUSDistributedSystem:
    """분산 시스템 싱글톤 인스턴스"""
    global _system_instance
    if _system_instance is None:
        _system_instance = AUTUSDistributedSystem()
    return _system_instance


def reset_distributed_system():
    """테스트용 리셋"""
    global _system_instance
    _system_instance = None
