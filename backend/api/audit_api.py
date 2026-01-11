"""
AUTUS Audit API
===============

Arbutus Analyzer 통합 API

Endpoints:
  - POST /api/audit/findings        Finding 처리
  - GET  /api/audit/state            현재 상태
  - GET  /api/audit/risk-score      리스크 점수
  - GET  /api/audit/breakdown       리스크 분석
  - GET  /api/audit/dashboard       대시보드 데이터
  - POST /api/audit/remediation     시정 조치
  - POST /api/audit/import          Arbutus 파일 임포트
"""

from fastapi import APIRouter, HTTPException
try:
    from fastapi import UploadFile, File
except ImportError:
    # python-multipart가 없으면 File 업로드 비활성화
    UploadFile = None
    File = None
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from audit.arbutus_bridge import (
    AuditPhysicsEngine,
    ArbutusBridge,
    ArbutusFindings,
    AuditRiskLevel,
    AuditCategory,
    AuditPhysics,
)


# ============================================================
# Router & Engine
# ============================================================

router = APIRouter(prefix="/api/audit", tags=["audit"])

# Engine 초기화
AUDIT_DATA_DIR = os.environ.get("AUTUS_AUDIT_DATA_DIR", "./audit_data")
engine = AuditPhysicsEngine(AUDIT_DATA_DIR)


# ============================================================
# API Models
# ============================================================

class FindingRequest(BaseModel):
    """Finding 요청"""
    id: str
    timestamp: Optional[int] = None
    category: str = Field(..., description="FRAUD, COMPLIANCE, FINANCIAL, OPERATIONAL, IT_SECURITY, VENDOR")
    risk_level: str = Field(..., description="CRITICAL, HIGH, MEDIUM, LOW, INFO")
    score: float = Field(..., ge=0, le=100)
    description: str
    affected_records: int = 0
    monetary_impact: float = 0.0
    source_table: str = ""
    query_used: str = ""
    sentiment_score: float = 0.0
    cluster_id: int = -1
    outlier_probability: float = 0.0


class RemediationRequest(BaseModel):
    """시정 조치 요청"""
    physics: str = Field(..., description="FINANCIAL_HEALTH, CAPITAL_RISK, COMPLIANCE_IQ, STAKEHOLDER, CONTROL_ENV, REPUTATION")
    effectiveness: float = Field(..., ge=0.0, le=1.0, description="효과 (0-1)")
    source: str = ""


# ============================================================
# Endpoints
# ============================================================

@router.post("/findings")
async def process_finding(req: FindingRequest) -> Dict[str, Any]:
    """Finding 처리"""
    try:
        import time
        
        finding = ArbutusFindings(
            id=req.id,
            timestamp=req.timestamp or int(time.time() * 1000),
            category=AuditCategory[req.category],
            risk_level=AuditRiskLevel[req.risk_level],
            score=req.score,
            description=req.description,
            affected_records=req.affected_records,
            monetary_impact=req.monetary_impact,
            source_table=req.source_table,
            query_used=req.query_used,
            sentiment_score=req.sentiment_score,
            cluster_id=req.cluster_id,
            outlier_probability=req.outlier_probability
        )
        
        result = engine.process_finding(finding)
        return result
    except KeyError as e:
        raise HTTPException(400, f"Invalid category or risk_level: {e}")
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/state")
async def get_state() -> Dict[str, float]:
    """현재 상태"""
    return engine.get_state()


@router.get("/risk-score")
async def get_risk_score() -> Dict[str, float]:
    """리스크 점수"""
    return {
        "risk_score": engine.get_risk_score(),
        "state": engine.get_state()
    }


@router.get("/breakdown")
async def get_breakdown() -> Dict[str, Dict]:
    """리스크 분석"""
    return engine.get_risk_breakdown()


@router.get("/dashboard")
async def get_dashboard() -> Dict[str, Any]:
    """대시보드 데이터"""
    return engine.get_dashboard_data()


@router.post("/remediation")
async def process_remediation(req: RemediationRequest) -> Dict[str, Any]:
    """시정 조치 처리"""
    try:
        physics = AuditPhysics[req.physics]
        result = engine.process_remediation(physics, req.effectiveness, req.source)
        return result
    except KeyError:
        raise HTTPException(400, f"Invalid physics: {req.physics}")
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/import")
async def import_arbutus_file(file_path: str) -> Dict[str, Any]:
    """Arbutus 파일 임포트 (파일 경로)"""
    try:
        if not os.path.exists(file_path):
            raise HTTPException(404, f"File not found: {file_path}")
        
        # 파싱
        findings = ArbutusBridge.parse_arbutus_export(file_path)
        
        # 처리
        results = []
        for finding in findings:
            result = engine.process_finding(finding)
            results.append(result)
        
        return {
            "success": True,
            "imported": len(findings),
            "processed": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(400, f"Import failed: {str(e)}")


@router.get("/")
async def audit_root():
    """Audit API 정보"""
    return {
        "name": "AUTUS Audit API",
        "version": "1.0.0",
        "description": "Arbutus Analyzer + AUTUS Physics Engine",
        "endpoints": {
            "findings": "POST /api/audit/findings",
            "state": "GET /api/audit/state",
            "risk-score": "GET /api/audit/risk-score",
            "breakdown": "GET /api/audit/breakdown",
            "dashboard": "GET /api/audit/dashboard",
            "remediation": "POST /api/audit/remediation",
            "import": "POST /api/audit/import",
        }
    }

