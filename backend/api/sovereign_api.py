# ═══════════════════════════════════════════════════════════════════════════
# Sovereign API - 삭제 기반 최적화 API
# ═══════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import logging

from sovereign.delete_scanner import get_scanner, DeleteCategory
from sovereign.inertia_calc import InertiaCalculator, InertiaSource, InertiaType
from sovereign.optimization import OptimizationEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sovereign", tags=["Sovereign"])

# 전역 인스턴스
scanner = get_scanner()
inertia_calc = InertiaCalculator()
opt_engine = OptimizationEngine()


# ═══════════════════════════════════════════════════════════════════════════
# Request Models
# ═══════════════════════════════════════════════════════════════════════════

class ScanRequest(BaseModel):
    entity_id: str
    industry: str


class CustomScanRequest(BaseModel):
    entity_id: str
    items: List[dict]


class InertiaSourceRequest(BaseModel):
    entity_id: str
    sources: List[dict]


class OptimizationRequest(BaseModel):
    entity_id: str
    industry: str
    current_data: Optional[dict] = None


# ═══════════════════════════════════════════════════════════════════════════
# Meta Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/industries")
async def list_industries():
    """지원 산업 목록"""
    return {
        "industries": list(scanner.INDUSTRY_TEMPLATES.keys()),
        "categories": [c.value for c in DeleteCategory],
        "inertia_types": [t.value for t in InertiaType],
    }


@router.get("/categories")
async def list_categories():
    """삭제 카테고리 + 대체 방안"""
    return {
        "categories": [
            {
                "code": c.value,
                "name": c.name,
                "replacement": scanner.REPLACEMENT_TEMPLATES.get(c, "TBD"),
                "priority": scanner.CATEGORY_PRIORITIES.get(c, 3),
            }
            for c in DeleteCategory
        ]
    }


@router.get("/template/{industry}")
async def get_industry_template(industry: str):
    """산업별 삭제 템플릿"""
    template = scanner.INDUSTRY_TEMPLATES.get(industry)
    
    if not template:
        raise HTTPException(status_code=404, detail=f"Industry '{industry}' not found")
    
    return {
        "industry": industry,
        "template": {
            cat.value: items
            for cat, items in template.items()
        },
        "total_items": sum(len(items) for items in template.values()),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Delete Scanner Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/scan/industry")
async def scan_by_industry(request: ScanRequest):
    """산업별 스캔"""
    try:
        result = scanner.scan_by_industry(request.entity_id, request.industry)
        
        return {
            "success": True,
            "entity_id": result.entity_id,
            "scanned_at": result.scanned_at,
            "total_targets": result.total_count,
            "by_category": result.by_category,
            "targets": [
                {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category.value,
                    "priority": t.priority,
                    "delete_roi": round(t.delete_roi, 2),
                    "inertia": round(t.inertia, 2),
                    "current_cost": round(t.current_cost, 2),
                    "replacement_cost": round(t.replacement_cost, 2),
                    "replacement": t.replacement,
                    "automation_level": round(t.automation_level, 2),
                    "action_plan": t.action_plan,
                }
                for t in result.targets[:15]
            ],
            "summary": {
                "cost_saved": round(result.total_cost_saved, 2),
                "time_saved": round(result.total_time_saved, 2),
                "efficiency_gain": round(result.total_efficiency_gain, 2),
            },
            "recommendations": result.recommendations,
        }
    except Exception as e:
        logger.error(f"Industry scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan/custom")
async def scan_custom(request: CustomScanRequest):
    """커스텀 스캔"""
    try:
        result = scanner.scan_custom(request.entity_id, request.items)
        
        return {
            "success": True,
            "entity_id": result.entity_id,
            "total_targets": result.total_count,
            "targets": [
                {
                    "id": t.id,
                    "name": t.name,
                    "category": t.category.value,
                    "priority": t.priority,
                    "delete_roi": round(t.delete_roi, 2),
                    "inertia": round(t.inertia, 2),
                    "action_plan": t.action_plan,
                }
                for t in result.targets
            ],
            "summary": {
                "cost_saved": round(result.total_cost_saved, 2),
                "time_saved": round(result.total_time_saved, 2),
            },
            "recommendations": result.recommendations,
        }
    except Exception as e:
        logger.error(f"Custom scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scan/result/{entity_id}")
async def get_scan_result(entity_id: str):
    """저장된 스캔 결과 조회"""
    result = scanner.get_result(entity_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Scan result not found")
    
    return {
        "entity_id": result.entity_id,
        "scanned_at": result.scanned_at,
        "total_targets": result.total_count,
        "by_category": result.by_category,
        "recommendations": result.recommendations,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Inertia Calculator Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/inertia/add")
async def add_inertia_sources(request: InertiaSourceRequest):
    """관성 원천 추가"""
    try:
        for source_data in request.sources:
            source = InertiaSource(
                id=source_data['id'],
                name=source_data['name'],
                inertia_type=InertiaType(source_data['type']),
                mass=source_data.get('mass', 0),
                friction=source_data.get('friction', 0.5),
                dependency=source_data.get('dependency', 0.5),
                removal_cost=source_data.get('removal_cost', 0),
                removal_time=source_data.get('removal_time', 30),
                removal_risk=source_data.get('removal_risk', 0.3),
                freed_capital=source_data.get('freed_capital', 0),
                freed_time=source_data.get('freed_time', 0),
                efficiency_gain=source_data.get('efficiency_gain', 0),
                alternative=source_data.get('alternative', ''),
                automation_possible=source_data.get('automation_possible', False),
            )
            inertia_calc.add_source(request.entity_id, source)
        
        return {
            "success": True,
            "entity_id": request.entity_id,
            "sources_added": len(request.sources),
        }
    except Exception as e:
        logger.error(f"Add inertia sources error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inertia/analyze/{entity_id}")
async def analyze_inertia(entity_id: str):
    """엔티티 관성 분석"""
    report = inertia_calc.analyze_entity(entity_id)
    
    if not report:
        raise HTTPException(status_code=404, detail="No sources found for entity")
    
    return {
        "entity_id": report.entity_id,
        "entity_name": report.entity_name,
        "total_inertia": round(report.total_inertia, 2),
        "inertia_score": round(report.inertia_score, 2),
        "by_type": {k.value: round(v, 2) for k, v in report.by_type.items()},
        "delete_candidates": [
            {
                "id": s.id,
                "name": s.name,
                "type": s.inertia_type.value,
                "inertia": round(inertia_calc.calculate_inertia(s), 2),
                "delete_roi": round(inertia_calc.calculate_delete_roi(s), 2),
            }
            for s in report.delete_candidates[:10]
        ],
        "priority_order": report.priority_order[:10],
        "projected": {
            "savings": round(report.projected_savings, 2),
            "time_freed": round(report.projected_time_freed, 2),
            "efficiency": round(report.projected_efficiency, 2),
        },
    }


@router.post("/inertia/compare")
async def compare_inertia(entity_ids: List[str]):
    """엔티티 관성 비교"""
    reports = inertia_calc.compare_entities(entity_ids)
    
    return {
        "compared": len(reports),
        "rankings": [
            {
                "entity_id": r.entity_id,
                "entity_name": r.entity_name,
                "inertia_score": round(r.inertia_score, 2),
                "total_inertia": round(r.total_inertia, 2),
                "candidates_count": len(r.delete_candidates),
            }
            for r in reports
        ],
        "heaviest": reports[0].entity_id if reports else None,
        "lightest": reports[-1].entity_id if reports else None,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Optimization Engine Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/optimize")
async def run_optimization(request: OptimizationRequest):
    """최적화 분석 실행"""
    try:
        result = opt_engine.analyze(
            request.entity_id,
            request.industry,
            request.current_data
        )
        
        return {
            "success": True,
            "entity_id": result.entity_id,
            "analyzed_at": result.analyzed_at,
            "current_state": result.current_state,
            "actions": [
                {
                    "id": a.id,
                    "type": a.action_type.value,
                    "target": a.target_name,
                    "description": a.description,
                    "steps": a.steps,
                    "cost_reduction": round(a.cost_reduction, 2),
                    "time_reduction": round(a.time_reduction, 2),
                    "efficiency_gain": round(a.efficiency_gain, 2),
                    "effort": a.effort,
                    "duration_days": a.duration_days,
                    "risk_level": round(a.risk_level, 2),
                    "priority_score": round(a.priority_score, 4),
                }
                for a in result.actions[:15]
            ],
            "totals": {
                "cost_reduction": round(result.total_cost_reduction, 2),
                "time_reduction": round(result.total_time_reduction, 2),
                "efficiency_gain": round(result.total_efficiency_gain, 2),
            },
            "execution_plan": result.execution_plan,
            "risk_factors": result.risk_factors,
        }
    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/optimize/result/{entity_id}")
async def get_optimization_result(entity_id: str):
    """저장된 최적화 결과 조회"""
    result = opt_engine.get_result(entity_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Optimization result not found")
    
    return {
        "entity_id": result.entity_id,
        "analyzed_at": result.analyzed_at,
        "action_count": len(result.actions),
        "totals": {
            "cost_reduction": round(result.total_cost_reduction, 2),
            "time_reduction": round(result.total_time_reduction, 2),
            "efficiency_gain": round(result.total_efficiency_gain, 2),
        },
        "execution_plan": result.execution_plan,
    }


@router.post("/optimize/scenarios")
async def compare_optimization_scenarios(entity_id: str, scenarios: List[dict]):
    """최적화 시나리오 비교"""
    try:
        comparison = opt_engine.compare_scenarios(entity_id, scenarios)
        return comparison
    except Exception as e:
        logger.error(f"Scenario comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# Quick Analysis Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/quick-scan/{industry}")
async def quick_scan(industry: str, entity_id: str = "quick_scan"):
    """빠른 산업별 스캔"""
    result = scanner.scan_by_industry(entity_id, industry)
    
    return {
        "industry": industry,
        "found": result.total_count,
        "top_targets": [
            {"name": t.name, "category": t.category.value, "roi": round(t.delete_roi, 1)}
            for t in result.targets[:5]
        ],
        "estimated_savings": round(result.total_cost_saved, 0),
        "recommendations": result.recommendations[:3],
    }


@router.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "module": "sovereign",
        "features": [
            "delete_scanner",
            "inertia_calculator",
            "optimization_engine",
            "clark_corndog",
        ],
        "industries_supported": len(scanner.INDUSTRY_TEMPLATES),
        "categories": len(DeleteCategory),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Clark Corndog Protocol Endpoints
# ═══════════════════════════════════════════════════════════════════════════

from sovereign.clark_corndog import get_clark

clark = get_clark()


@router.post("/clark/execute")
async def execute_clark_protocol(entity_id: str = "clark_corndog_1"):
    """Clark 4단계 프로토콜 실행"""
    try:
        result = clark.execute_protocol(entity_id)
        
        return {
            "success": True,
            "entity_id": result.entity_id,
            "executed_at": result.executed_at,
            "summary": {
                "d_rate": {"before": result.d_rate_before, "after": result.d_rate_after},
                "a_rate": {"before": result.a_rate_before, "after": result.a_rate_after},
                "omega_density": {"before": result.omega_density_before, "after": result.omega_density_after},
            },
            "phase1_delete": {
                "targets": len(result.delete_targets),
                "monthly_savings": result.delete_savings,
                "top_targets": result.delete_targets[:5],
            },
            "phase2_automate": {
                "processes": len(result.automation_plan),
                "monthly_savings": result.automation_savings,
                "investment": result.automation_cost,
                "plan": result.automation_plan[:5],
            },
            "phase3_human": {
                "required_keymans": result.required_keymans,
                "plugin_count": result.plugin_count,
            },
            "phase4_scale": {
                "waves": result.replication_plan.get("waves", []),
                "projected_nodes": result.replication_plan.get("total_nodes_12m", 0),
                "projected_monthly_profit": result.replication_plan.get("projected_monthly_profit", 0),
            },
            "financials": {
                "total_monthly_savings": result.total_monthly_savings,
                "total_investment": result.total_investment,
                "payback_months": round(result.payback_months, 1),
            },
        }
    except Exception as e:
        logger.error(f"Clark protocol execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clark/dashboard/{entity_id}")
async def get_clark_dashboard(entity_id: str):
    """Clark 대시보드 요약"""
    summary = clark.get_dashboard_summary(entity_id)
    
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    
    return summary


@router.post("/clark/node/create")
async def create_clark_node(node_id: str, name: str, location: str):
    """Clark 노드 생성"""
    node = clark.create_node(node_id, name, location)
    
    return {
        "success": True,
        "node": {
            "id": node.id,
            "name": node.name,
            "location": node.location,
            "status": node.status.value,
            "created_at": node.created_at,
        }
    }


@router.put("/clark/node/{node_id}/kpis")
async def update_clark_node_kpis(
    node_id: str,
    d_rate: float,
    a_rate: float,
    omega_density: float,
    health: float,
    monthly_revenue: int,
    monthly_cost: int,
):
    """Clark 노드 KPI 업데이트"""
    clark.update_node_kpis(
        node_id, d_rate, a_rate, omega_density, health,
        monthly_revenue, monthly_cost
    )
    
    node = clark.nodes.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return {
        "success": True,
        "node_id": node_id,
        "kpis": {
            "d_rate": node.d_rate,
            "a_rate": node.a_rate,
            "omega_density": node.omega_density,
            "health": node.health,
        },
        "financials": {
            "monthly_revenue": node.monthly_revenue,
            "monthly_cost": node.monthly_cost,
            "monthly_profit": node.monthly_profit,
        },
        "status": node.status.value,
        "is_replicable": node.is_replicable,
    }


@router.get("/clark/node/{node_id}/replication-check")
async def check_clark_replication(node_id: str):
    """노드 복제 가능 여부 확인"""
    result = clark.check_replication_ready(node_id)
    return result


@router.get("/clark/nodes")
async def list_clark_nodes():
    """모든 Clark 노드 목록"""
    nodes = []
    for node in clark.nodes.values():
        nodes.append({
            "id": node.id,
            "name": node.name,
            "location": node.location,
            "status": node.status.value,
            "d_rate": node.d_rate,
            "a_rate": node.a_rate,
            "health": node.health,
            "monthly_profit": node.monthly_profit,
            "is_replicable": node.is_replicable,
        })
    
    return {
        "total": len(nodes),
        "nodes": nodes,
    }