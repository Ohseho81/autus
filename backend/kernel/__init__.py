"""
AUTUS Kernel Package - The Stealth Standard
============================================
EP10: 보이지 않는 표준

Components:
- Motion Taxonomy (10대 핵심 동작)
- ABL-R Schema (Authority-Budget-Liability-Reference)
- Smart Router (헌법 기반 라우팅)
- Proof Pack (증빙 패키지 생성)
- Gap Engine (A3: SMB Gap 분석)
"""

from .motion_taxonomy import MotionType, MOTION_REGISTRY, get_motion, validate_inputs
from .ablr_schema import Entity, AuthorityConstraint, BudgetExponent, ReferenceSource
from .smart_router import SmartRouter, RouterDecision, RouterAction
from .proof_pack import ProofPack, ProofPackGenerator, generate_proof_pdf_html
from .gap_engine import GapAnalysisEngine, GapInput, GapOutput, GapThresholds, gap_engine

__all__ = [
    "MotionType",
    "MOTION_REGISTRY",
    "get_motion",
    "validate_inputs",
    "Entity",
    "AuthorityConstraint",
    "BudgetExponent",
    "ReferenceSource",
    "SmartRouter",
    "RouterDecision",
    "RouterAction",
    "ProofPack",
    "ProofPackGenerator",
    "generate_proof_pdf_html",
    "GapAnalysisEngine",
    "GapInput",
    "GapOutput",
    "GapThresholds",
    "gap_engine",
]
