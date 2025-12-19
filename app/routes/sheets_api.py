"""
Google Sheets 연동 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/sheets", tags=["sheets"])


def _get_connector():
    """Sheets 커넥터 가져오기 (지연 import)"""
    try:
        from connectors.sheets import get_sheets_connector
        return get_sheets_connector()
    except ImportError as e:
        print(f"[SheetsAPI] Import 오류: {e}")
        return None


def _get_demo_planets():
    """데모 데이터"""
    try:
        from connectors.sheets import get_demo_planets
        return get_demo_planets()
    except ImportError:
        return {
            "risk": 8.3,
            "entropy": 10.0,
            "pressure": 0,
            "flow": 60.0,
            "gate": "GREEN",
            "impact_percent": -8
        }


@router.get("/status")
async def sheets_status() -> Dict[str, Any]:
    """Sheets 연결 상태"""
    connector = _get_connector()
    if connector and connector.connected:
        return {
            "status": "connected",
            "message": "Google Sheets 연결됨",
            "sheet_title": connector.sheet.title if connector.sheet else "Unknown"
        }
    return {
        "status": "disconnected",
        "message": "연결 안 됨 (데모 모드)"
    }


@router.get("/persons")
async def get_persons():
    """인력 목록"""
    connector = _get_connector()
    if not connector or not connector.connected:
        return []
    return connector.get_persons()


@router.get("/finance")
async def get_finance():
    """재정 내역"""
    connector = _get_connector()
    if not connector or not connector.connected:
        return []
    return connector.get_finance()


@router.get("/partners")
async def get_partners():
    """파트너 목록"""
    connector = _get_connector()
    if not connector or not connector.connected:
        return []
    return connector.get_partners()


@router.get("/issues")
async def get_issues():
    """이슈 목록"""
    connector = _get_connector()
    if not connector or not connector.connected:
        return []
    return connector.get_issues()


@router.get("/stats")
async def get_all_stats() -> Dict[str, Any]:
    """모든 통계"""
    connector = _get_connector()
    if not connector or not connector.connected:
        return _get_demo_planets()["stats"]
    
    return {
        "persons": connector.get_person_stats(),
        "finance": connector.get_finance_stats(),
        "partners": connector.get_partner_stats(),
        "issues": connector.get_issue_stats()
    }


@router.get("/planets")
async def get_planets() -> Dict[str, Any]:
    """9 Planets 물리량 계산"""
    connector = _get_connector()
    if not connector or not connector.connected:
        return _get_demo_planets()
    return connector.calculate_planets()


@router.get("/snapshot")
async def get_snapshot() -> Dict[str, Any]:
    """
    AUTUS 스냅샷 (Frontend 호환)
    solar.html에서 사용하는 형식
    """
    connector = _get_connector()
    
    if not connector or not connector.connected:
        # 연결 안 되면 기본값 반환
        demo = _get_demo_planets()
        return {
            "risk": demo["risk"],
            "entropy": demo["entropy"],
            "pressure": demo["pressure"],
            "flow": demo["flow"],
            "gate": demo["gate"],
            "impact_percent": demo["impact_percent"],
            "shock": demo.get("shock", 0),
            "friction": demo.get("friction", 0),
            "cohesion": demo.get("cohesion", 0),
            "stability": demo.get("stability", 0),
            "source": "demo"
        }
    
    planets = connector.calculate_planets()
    
    return {
        "risk": planets["risk"],
        "entropy": planets["entropy"],
        "pressure": planets["pressure"],
        "flow": planets["flow"],
        "gate": planets["gate"],
        "impact_percent": planets["impact_percent"],
        "shock": planets["shock"],
        "friction": planets["friction"],
        "cohesion": planets["cohesion"],
        "stability": planets["stability"],
        "source": "sheets"
    }
