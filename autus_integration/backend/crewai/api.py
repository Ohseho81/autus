# backend/crewai/api.py
# CrewAI 분석 API 엔드포인트

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

router = APIRouter(prefix="/crewai", tags=["CrewAI"])

# Pydantic 모델
class Node(BaseModel):
    id: str
    value: float = 0
    source: Optional[str] = None

class Motion(BaseModel):
    source: str
    target: str
    amount: float
    direction: Optional[str] = "inflow"

class AnalysisRequest(BaseModel):
    nodes: List[Node]
    motions: List[Motion]

class AnalysisResponse(BaseModel):
    success: bool
    timestamp: str
    delete: Optional[Dict] = None
    automate: Optional[Dict] = None
    outsource: Optional[Dict] = None
    total_monthly_impact: Optional[float] = None
    velocity: Optional[float] = None

# 에이전트 인스턴스 (지연 로딩)
_agents = None

def get_agents():
    global _agents
    if _agents is None:
        try:
            from .agents import AutusAgents
            _agents = AutusAgents()
        except Exception as e:
            print(f"CrewAI 초기화 실패: {e}")
            _agents = None
    return _agents

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_data(request: AnalysisRequest):
    """
    CrewAI 3명 에이전트 분석
    
    입력: 노드 + 모션 데이터
    출력: 삭제/자동화/외부용역 제안
    """
    nodes = [n.dict() for n in request.nodes]
    motions = [m.dict() for m in request.motions]
    
    agents = get_agents()
    
    if agents:
        result = agents.analyze(nodes, motions)
    else:
        # 폴백: 규칙 기반 분석
        result = rule_based_analysis(nodes, motions)
    
    # 돈 흐름 속도 계산
    velocity = sum(abs(m.get('amount', 0)) for m in motions) / 30  # 일일 평균
    
    return AnalysisResponse(
        success=result.get('success', True),
        timestamp=datetime.now().isoformat(),
        delete=result.get('delete'),
        automate=result.get('automate'),
        outsource=result.get('outsource'),
        total_monthly_impact=result.get('total_monthly_impact'),
        velocity=velocity
    )

@router.post("/quick-delete")
async def quick_delete_analysis(request: AnalysisRequest):
    """빠른 삭제 분석 (저가치 노드만)"""
    nodes = [n.dict() for n in request.nodes]
    
    # 가치 ≤ 0 노드
    delete_targets = [
        {
            "id": n['id'],
            "value": n['value'],
            "recommendation": "DELETE",
            "estimated_monthly_loss": abs(n['value']) * 0.1  # 월 손실 추정
        }
        for n in nodes if n.get('value', 0) <= 0
    ]
    
    return {
        "success": True,
        "count": len(delete_targets),
        "targets": delete_targets,
        "total_monthly_savings": sum(t['estimated_monthly_loss'] for t in delete_targets)
    }

@router.post("/quick-automate")
async def quick_automate_analysis(request: AnalysisRequest):
    """빠른 자동화 분석 (고빈도 모션만)"""
    motions = [m.dict() for m in request.motions]
    
    # 모션 빈도 계산
    motion_counts = {}
    motion_amounts = {}
    for m in motions:
        key = f"{m['source']}->{m['target']}"
        motion_counts[key] = motion_counts.get(key, 0) + 1
        motion_amounts[key] = motion_amounts.get(key, 0) + m.get('amount', 0)
    
    # 고빈도 모션 (3회 이상)
    automate_targets = [
        {
            "motion": k,
            "frequency": v,
            "total_amount": motion_amounts[k],
            "recommendation": "AUTOMATE",
            "estimated_time_saved_hours": v * 0.5  # 회당 30분 절약 추정
        }
        for k, v in motion_counts.items() if v >= 3
    ]
    
    return {
        "success": True,
        "count": len(automate_targets),
        "targets": automate_targets,
        "total_time_saved_hours": sum(t['estimated_time_saved_hours'] for t in automate_targets)
    }

@router.get("/health")
async def health():
    """CrewAI 상태 확인"""
    agents = get_agents()
    return {
        "status": "healthy" if agents else "degraded",
        "agents_loaded": agents is not None,
        "timestamp": datetime.now().isoformat()
    }


def rule_based_analysis(nodes: List[Dict], motions: List[Dict]) -> Dict:
    """규칙 기반 분석 (CrewAI 없을 때 폴백)"""
    
    # 1. 삭제 분석
    delete_targets = [
        {"id": n.get('id'), "value": n.get('value', 0)}
        for n in nodes if n.get('value', 0) <= 0
    ]
    monthly_savings = len(delete_targets) * 500000
    
    # 2. 자동화 분석
    motion_counts = {}
    for m in motions:
        key = f"{m.get('source')}->{m.get('target')}"
        motion_counts[key] = motion_counts.get(key, 0) + 1
    
    automate_targets = [
        {"motion": k, "frequency": v}
        for k, v in motion_counts.items() if v >= 3
    ]
    monthly_synergy = len(automate_targets) * 1000000
    
    # 3. 외부용역 분석 (상위 노드 기반)
    top_nodes = sorted(nodes, key=lambda x: x.get('value', 0), reverse=True)[:3]
    outsource_recs = [
        {"role": "마케팅 전문가", "expected_roi": 300, "monthly_cost": 3000000},
        {"role": "영업 전문가", "expected_roi": 250, "monthly_cost": 4000000}
    ]
    monthly_acceleration = 5000000
    
    return {
        "success": True,
        "delete": {
            "targets": delete_targets,
            "monthly_savings": monthly_savings
        },
        "automate": {
            "targets": automate_targets,
            "monthly_synergy_gain": monthly_synergy
        },
        "outsource": {
            "recommendations": outsource_recs,
            "monthly_acceleration": monthly_acceleration
        },
        "total_monthly_impact": monthly_savings + monthly_synergy + monthly_acceleration
    }



# backend/crewai/api.py
# CrewAI 분석 API 엔드포인트

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

router = APIRouter(prefix="/crewai", tags=["CrewAI"])

# Pydantic 모델
class Node(BaseModel):
    id: str
    value: float = 0
    source: Optional[str] = None

class Motion(BaseModel):
    source: str
    target: str
    amount: float
    direction: Optional[str] = "inflow"

class AnalysisRequest(BaseModel):
    nodes: List[Node]
    motions: List[Motion]

class AnalysisResponse(BaseModel):
    success: bool
    timestamp: str
    delete: Optional[Dict] = None
    automate: Optional[Dict] = None
    outsource: Optional[Dict] = None
    total_monthly_impact: Optional[float] = None
    velocity: Optional[float] = None

# 에이전트 인스턴스 (지연 로딩)
_agents = None

def get_agents():
    global _agents
    if _agents is None:
        try:
            from .agents import AutusAgents
            _agents = AutusAgents()
        except Exception as e:
            print(f"CrewAI 초기화 실패: {e}")
            _agents = None
    return _agents

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_data(request: AnalysisRequest):
    """
    CrewAI 3명 에이전트 분석
    
    입력: 노드 + 모션 데이터
    출력: 삭제/자동화/외부용역 제안
    """
    nodes = [n.dict() for n in request.nodes]
    motions = [m.dict() for m in request.motions]
    
    agents = get_agents()
    
    if agents:
        result = agents.analyze(nodes, motions)
    else:
        # 폴백: 규칙 기반 분석
        result = rule_based_analysis(nodes, motions)
    
    # 돈 흐름 속도 계산
    velocity = sum(abs(m.get('amount', 0)) for m in motions) / 30  # 일일 평균
    
    return AnalysisResponse(
        success=result.get('success', True),
        timestamp=datetime.now().isoformat(),
        delete=result.get('delete'),
        automate=result.get('automate'),
        outsource=result.get('outsource'),
        total_monthly_impact=result.get('total_monthly_impact'),
        velocity=velocity
    )

@router.post("/quick-delete")
async def quick_delete_analysis(request: AnalysisRequest):
    """빠른 삭제 분석 (저가치 노드만)"""
    nodes = [n.dict() for n in request.nodes]
    
    # 가치 ≤ 0 노드
    delete_targets = [
        {
            "id": n['id'],
            "value": n['value'],
            "recommendation": "DELETE",
            "estimated_monthly_loss": abs(n['value']) * 0.1  # 월 손실 추정
        }
        for n in nodes if n.get('value', 0) <= 0
    ]
    
    return {
        "success": True,
        "count": len(delete_targets),
        "targets": delete_targets,
        "total_monthly_savings": sum(t['estimated_monthly_loss'] for t in delete_targets)
    }

@router.post("/quick-automate")
async def quick_automate_analysis(request: AnalysisRequest):
    """빠른 자동화 분석 (고빈도 모션만)"""
    motions = [m.dict() for m in request.motions]
    
    # 모션 빈도 계산
    motion_counts = {}
    motion_amounts = {}
    for m in motions:
        key = f"{m['source']}->{m['target']}"
        motion_counts[key] = motion_counts.get(key, 0) + 1
        motion_amounts[key] = motion_amounts.get(key, 0) + m.get('amount', 0)
    
    # 고빈도 모션 (3회 이상)
    automate_targets = [
        {
            "motion": k,
            "frequency": v,
            "total_amount": motion_amounts[k],
            "recommendation": "AUTOMATE",
            "estimated_time_saved_hours": v * 0.5  # 회당 30분 절약 추정
        }
        for k, v in motion_counts.items() if v >= 3
    ]
    
    return {
        "success": True,
        "count": len(automate_targets),
        "targets": automate_targets,
        "total_time_saved_hours": sum(t['estimated_time_saved_hours'] for t in automate_targets)
    }

@router.get("/health")
async def health():
    """CrewAI 상태 확인"""
    agents = get_agents()
    return {
        "status": "healthy" if agents else "degraded",
        "agents_loaded": agents is not None,
        "timestamp": datetime.now().isoformat()
    }


def rule_based_analysis(nodes: List[Dict], motions: List[Dict]) -> Dict:
    """규칙 기반 분석 (CrewAI 없을 때 폴백)"""
    
    # 1. 삭제 분석
    delete_targets = [
        {"id": n.get('id'), "value": n.get('value', 0)}
        for n in nodes if n.get('value', 0) <= 0
    ]
    monthly_savings = len(delete_targets) * 500000
    
    # 2. 자동화 분석
    motion_counts = {}
    for m in motions:
        key = f"{m.get('source')}->{m.get('target')}"
        motion_counts[key] = motion_counts.get(key, 0) + 1
    
    automate_targets = [
        {"motion": k, "frequency": v}
        for k, v in motion_counts.items() if v >= 3
    ]
    monthly_synergy = len(automate_targets) * 1000000
    
    # 3. 외부용역 분석 (상위 노드 기반)
    top_nodes = sorted(nodes, key=lambda x: x.get('value', 0), reverse=True)[:3]
    outsource_recs = [
        {"role": "마케팅 전문가", "expected_roi": 300, "monthly_cost": 3000000},
        {"role": "영업 전문가", "expected_roi": 250, "monthly_cost": 4000000}
    ]
    monthly_acceleration = 5000000
    
    return {
        "success": True,
        "delete": {
            "targets": delete_targets,
            "monthly_savings": monthly_savings
        },
        "automate": {
            "targets": automate_targets,
            "monthly_synergy_gain": monthly_synergy
        },
        "outsource": {
            "recommendations": outsource_recs,
            "monthly_acceleration": monthly_acceleration
        },
        "total_monthly_impact": monthly_savings + monthly_synergy + monthly_acceleration
    }








