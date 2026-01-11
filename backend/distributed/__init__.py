"""
AUTUS Distributed Architecture v2.1
====================================

분산 연산 아키텍처:
- 데이터는 로컬에 가두고, 법칙만 클라우드에서 흐르게 한다
- 3-Tier Calibration: Global(0.2) + Cohort(0.3) + Personal(0.5)

Components:
- LocalPhysicsEngine: 로컬 물리 연산
- CloudCalibrationEngine: 클라우드 상수 보정
- Protocol: Upstream/Downstream 통신
- Orchestrator: 전체 시스템 관리
"""

from .protocol import (
    UpstreamPacket,
    DownstreamPacket,
    Cohort,
)
from .local_engine import LocalPhysicsEngine
from .cloud_engine import CloudCalibrationEngine
from .orchestrator import AUTUSDistributedSystem

__all__ = [
    "LocalPhysicsEngine",
    "CloudCalibrationEngine",
    "AUTUSDistributedSystem",
    "UpstreamPacket",
    "DownstreamPacket",
    "Cohort",
]
