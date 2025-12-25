#!/usr/bin/env python3
"""
AUTUS Core Engine
=================
모든 Pack의 기반이 되는 핵심 엔진
"""

import json
import time
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any
from abc import ABC, abstractmethod

# ═══════════════════════════════════════════════════════════════════════════════
# CORE DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Entity:
    """기본 엔티티"""
    id: str
    name: str
    type: str
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class AnalysisResult:
    """분석 결과 기본 구조"""
    timestamp: str
    pack_id: str
    pack_name: str
    
    # 물리량
    loss_velocity: float      # 손실 속도 (원/초)
    pressure: float           # 압력
    entropy: float            # 엔트로피
    
    # 상태
    state: str                # STABLE/WARNING/DANGER/CRITICAL
    risk_score: float         # 0~1
    
    # 권장 행동
    mva: str                  # Minimal Viable Action
    alternatives: List[str] = field(default_factory=list)
    
    # 상세 데이터 (팩별로 다름)
    details: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# ABSTRACT BASE PACK
# ═══════════════════════════════════════════════════════════════════════════════

class BasePack(ABC):
    """모든 Pack의 추상 기반 클래스"""
    
    PACK_ID: str = "base"
    PACK_NAME: str = "Base Pack"
    PACK_VERSION: str = "1.0.0"
    
    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.created_at = datetime.now().isoformat()
    
    @abstractmethod
    def analyze(self, input_data: Dict) -> AnalysisResult:
        """핵심 분석 메서드 (각 팩에서 구현)"""
        pass
    
    @abstractmethod
    def calculate_loss(self, **kwargs) -> Dict:
        """손실 계산 (각 팩에서 구현)"""
        pass
    
    @abstractmethod
    def generate_mva(self, analysis: AnalysisResult) -> str:
        """MVA 생성 (각 팩에서 구현)"""
        pass
    
    def add_entity(self, entity: Entity):
        """엔티티 추가"""
        self.entities[entity.id] = entity
    
    def get_entity(self, entity_id: str) -> Optional[Entity]:
        """엔티티 조회"""
        return self.entities.get(entity_id)
    
    def to_json(self, result: AnalysisResult) -> str:
        """결과를 JSON으로 변환"""
        return json.dumps(asdict(result), ensure_ascii=False, indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS CORE
# ═══════════════════════════════════════════════════════════════════════════════

class AutusCore:
    """
    AUTUS 코어 엔진
    
    모든 Pack을 관리하고 통합 분석을 수행
    """
    
    VERSION = "1.0.0"
    
    def __init__(self):
        self.packs: Dict[str, BasePack] = {}
        self.ledger: List[Dict] = []
        self.created_at = datetime.now().isoformat()
    
    def register_pack(self, pack: BasePack):
        """팩 등록"""
        self.packs[pack.PACK_ID] = pack
        self._log("PACK_REGISTERED", {
            "pack_id": pack.PACK_ID,
            "pack_name": pack.PACK_NAME,
            "version": pack.PACK_VERSION
        })
    
    def get_pack(self, pack_id: str) -> Optional[BasePack]:
        """팩 조회"""
        return self.packs.get(pack_id)
    
    def analyze(self, pack_id: str, input_data: Dict) -> AnalysisResult:
        """특정 팩으로 분석"""
        pack = self.get_pack(pack_id)
        if not pack:
            raise ValueError(f"Pack not found: {pack_id}")
        
        result = pack.analyze(input_data)
        self._log("ANALYSIS", {
            "pack_id": pack_id,
            "state": result.state,
            "risk_score": result.risk_score
        })
        
        return result
    
    def analyze_all(self, input_data: Dict) -> Dict[str, AnalysisResult]:
        """모든 팩으로 분석"""
        results = {}
        for pack_id, pack in self.packs.items():
            try:
                results[pack_id] = pack.analyze(input_data)
            except Exception as e:
                self._log("ANALYSIS_ERROR", {
                    "pack_id": pack_id,
                    "error": str(e)
                })
        return results
    
    def get_integrated_risk(self, results: Dict[str, AnalysisResult]) -> Dict:
        """통합 리스크 점수"""
        if not results:
            return {"total_risk": 0, "state": "UNKNOWN"}
        
        total_risk = sum(r.risk_score for r in results.values()) / len(results)
        total_loss = sum(r.loss_velocity for r in results.values())
        
        if total_risk >= 0.8:
            state = "CRITICAL"
        elif total_risk >= 0.6:
            state = "DANGER"
        elif total_risk >= 0.4:
            state = "WARNING"
        else:
            state = "STABLE"
        
        return {
            "total_risk": round(total_risk, 3),
            "total_loss_velocity": round(total_loss, 2),
            "state": state,
            "pack_count": len(results),
            "highest_risk_pack": max(results.items(), key=lambda x: x[1].risk_score)[0]
        }
    
    def _log(self, action: str, data: Dict):
        """내부 로그"""
        self.ledger.append({
            "timestamp": datetime.now().isoformat(),
            "action": action,
            "data": data
        })
    
    def get_status(self) -> Dict:
        """시스템 상태"""
        return {
            "version": self.VERSION,
            "created_at": self.created_at,
            "packs_registered": list(self.packs.keys()),
            "pack_count": len(self.packs),
            "ledger_entries": len(self.ledger)
        }
