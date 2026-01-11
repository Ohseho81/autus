"""
AUTUS Ontology API v0.1.0
=========================

온톨로지 시스템 REST API
- 스키마 정보 조회
- 사용자 온톨로지 관리
- 로그 처리
- Evidence Gate 검사

Constitution 준수:
- Article I: Zero Identity → 사용자 ID는 로컬 생성
- Article II: Privacy by Architecture → 상태는 로컬 저장, 서버는 구조만
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

from ontology.engine import (
    OntologyInitializer,
    UserOntology,
    NodeState,
    LogProcessor,
    LogEntry,
    EvidenceGate,
    create_new_user,
    get_summary,
)


# ===========================================
# Router
# ===========================================
router = APIRouter(prefix="/ontology/engine", tags=["Ontology Engine"])


# ===========================================
# Models
# ===========================================
class LogInputModel(BaseModel):
    """로그 입력 모델"""
    content: str
    category: Optional[str] = None
    timestamp: Optional[str] = None


class BatchLogInputModel(BaseModel):
    """배치 로그 입력 모델"""
    logs: List[LogInputModel]


class OntologyStateModel(BaseModel):
    """온톨로지 상태 모델"""
    local_id: str
    schema_version: str
    nodes: Dict[str, Dict[str, Any]]
    domain_weights: Dict[str, float]
    node_weights: Dict[str, Dict[str, float]]
    system_state: str
    total_logs_processed: int


class ProcessResultModel(BaseModel):
    """로그 처리 결과 모델"""
    matches: List[Dict[str, Any]]
    nodes_updated: Dict[str, float]
    evidence_gate_passed: bool
    warnings: List[str]


# ===========================================
# In-Memory Storage (Demo용)
# ===========================================
# 실제 구현에서는 사용자 로컬 저장소 사용
_demo_ontologies: Dict[str, UserOntology] = {}


# ===========================================
# Endpoints
# ===========================================
@router.get("/schema")
async def get_schema():
    """
    온톨로지 스키마 정보 조회
    
    AUTUS가 소유하는 "문법" 정보만 반환
    """
    initializer = OntologyInitializer()
    schema_info = initializer.get_schema_info()
    
    # 도메인 및 노드 상세 정보
    domains_detail = {}
    for domain_name, domain_config in initializer.structure.get("domains", {}).items():
        domains_detail[domain_name] = {
            "description": domain_config.get("description"),
            "children": domain_config.get("children", []),
            "default_weight": domain_config.get("default_weight"),
            "urgency": domain_config.get("urgency"),
            "volatility": domain_config.get("volatility"),
        }
    
    nodes_detail = {}
    for node_name, node_config in initializer.structure.get("nodes", {}).items():
        nodes_detail[node_name] = {
            "parent": node_config.get("parent"),
            "description": node_config.get("description"),
            "default_value": node_config.get("default_value"),
            "default_weight": node_config.get("default_weight"),
            "metrics": node_config.get("metrics", []),
            "characteristics": node_config.get("characteristics", {}),
        }
    
    return {
        "success": True,
        "data": {
            **schema_info,
            "domains_detail": domains_detail,
            "nodes_detail": nodes_detail,
        }
    }


@router.get("/patterns")
async def get_patterns():
    """
    로그 패턴 정보 조회
    
    AUTUS가 소유하는 "문법" 정보
    """
    processor = LogProcessor()
    stats = processor.get_pattern_stats()
    
    return {
        "success": True,
        "data": {
            "total_patterns": stats["total_patterns"],
            "by_node": stats["by_node"],
            "by_category": stats["by_category"],
        }
    }


@router.post("/user/create")
async def create_user():
    """
    새 사용자 온톨로지 생성
    
    서버에서 구조만 제공, 실제 데이터는 클라이언트에서 관리
    """
    ontology = create_new_user()
    
    # Demo용 저장
    _demo_ontologies[ontology.local_id] = ontology
    
    return {
        "success": True,
        "data": {
            "local_id": ontology.local_id,
            "schema_version": ontology.schema_version,
            "created_at": ontology.created_at,
            "initial_state": ontology.to_dict(),
        },
        "message": "새 사용자 온톨로지가 생성되었습니다. 이 데이터는 로컬에 저장하세요."
    }


@router.get("/user/{local_id}")
async def get_user(local_id: str):
    """
    사용자 온톨로지 상태 조회 (Demo용)
    
    실제 구현에서는 클라이언트 로컬에서 관리
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    summary = get_summary(ontology)
    
    return {
        "success": True,
        "data": {
            "local_id": ontology.local_id,
            "summary": summary,
            "full_state": ontology.to_dict(),
        }
    }


@router.post("/user/{local_id}/log")
async def process_user_log(local_id: str, log_input: LogInputModel):
    """
    단일 로그 처리
    
    로그 → 패턴 매칭 → 노드 업데이트
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    processor = LogProcessor()
    
    # 로그 생성
    log = LogEntry(
        timestamp=log_input.timestamp or datetime.now().isoformat(),
        content=log_input.content,
        category=log_input.category,
    )
    
    # 처리
    result = processor.process_log(log, ontology)
    
    return {
        "success": True,
        "data": {
            "matches": [
                {
                    "pattern_id": m.pattern_id,
                    "pattern_name": m.pattern_name,
                    "node": m.node,
                    "delta": m.delta,
                }
                for m in result.matches
            ],
            "nodes_updated": result.nodes_updated,
            "evidence_gate_passed": result.evidence_gate_passed,
            "warnings": result.warnings,
            "new_summary": get_summary(ontology),
        },
        "message": f"{len(result.matches)}개 패턴이 매칭되었습니다."
    }


@router.post("/user/{local_id}/logs")
async def process_user_logs(local_id: str, batch_input: BatchLogInputModel):
    """
    배치 로그 처리
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    processor = LogProcessor()
    
    total_matches = 0
    all_nodes_updated = {}
    all_warnings = []
    
    for log_input in batch_input.logs:
        log = LogEntry(
            timestamp=log_input.timestamp or datetime.now().isoformat(),
            content=log_input.content,
            category=log_input.category,
        )
        result = processor.process_log(log, ontology)
        
        total_matches += len(result.matches)
        for node, delta in result.nodes_updated.items():
            all_nodes_updated[node] = all_nodes_updated.get(node, 0) + delta
        all_warnings.extend(result.warnings)
    
    return {
        "success": True,
        "data": {
            "logs_processed": len(batch_input.logs),
            "total_matches": total_matches,
            "nodes_updated": all_nodes_updated,
            "warnings": list(set(all_warnings)),  # 중복 제거
            "new_summary": get_summary(ontology),
        },
        "message": f"{len(batch_input.logs)}개 로그가 처리되었습니다."
    }


@router.get("/user/{local_id}/summary")
async def get_user_summary(local_id: str):
    """
    사용자 온톨로지 요약 조회
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    summary = get_summary(ontology)
    
    return {
        "success": True,
        "data": summary
    }


@router.get("/user/{local_id}/evidence-gate/{node_name}")
async def check_evidence_gate(local_id: str, node_name: str, action_type: str = "suggestion"):
    """
    특정 노드의 Evidence Gate 검사
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    
    if node_name not in ontology.nodes:
        raise HTTPException(status_code=404, detail=f"노드 '{node_name}'을 찾을 수 없습니다")
    
    processor = LogProcessor()
    gate_result = processor.evidence_gate.evaluate(
        ontology.nodes[node_name],
        node_name,
        action_type
    )
    
    return {
        "success": True,
        "data": {
            "node": node_name,
            "action_type": action_type,
            **gate_result
        }
    }


@router.get("/demo/users")
async def list_demo_users():
    """
    Demo용 사용자 목록 조회
    """
    users = []
    for local_id, ontology in _demo_ontologies.items():
        summary = get_summary(ontology)
        users.append({
            "local_id": local_id[:8] + "...",
            "self_value": summary["self_value"],
            "total_logs": summary["total_logs"],
            "system_state": summary["system_state"],
        })
    
    return {
        "success": True,
        "data": {
            "count": len(users),
            "users": users
        }
    }


@router.delete("/demo/reset")
async def reset_demo():
    """
    Demo 데이터 초기화
    """
    _demo_ontologies.clear()
    return {
        "success": True,
        "message": "Demo 데이터가 초기화되었습니다."
    }


# ═══════════════════════════════════════════════════════════════════════════
# NODE INTELLIGENCE API
# 노드 자기 진단 및 자율 보고 시스템
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/user/{local_id}/diagnose/{node_name}")
async def diagnose_node(local_id: str, node_name: str):
    """
    노드 자기 진단 보고서
    
    노드가 자신의 상태를 분석하여 문장 형태로 보고
    "나(건강 노드)는 현재 '신선도'가 0.2야. 3일 전 로그가 마지막이라..."
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    
    if node_name not in ontology.nodes:
        raise HTTPException(status_code=404, detail=f"노드 '{node_name}'을 찾을 수 없습니다")
    
    processor = LogProcessor()
    diagnosis = processor.diagnose_node(node_name, ontology)
    
    return {
        "success": True,
        "data": {
            "node_id": diagnosis.node_id,
            "node_name": diagnosis.node_name,
            "health_status": diagnosis.health_status,
            "urgency_level": diagnosis.urgency_level,
            "status_report": diagnosis.status_report,  # 핵심: 자연어 보고서
            "primary_issue": diagnosis.primary_issue,
            "scores": {
                "reliability": diagnosis.reliability_score,
                "freshness": diagnosis.freshness_score,
                "consistency": diagnosis.consistency_score,
            },
            "causality": {
                "upstream_issues": diagnosis.upstream_issues,
                "downstream_risks": diagnosis.downstream_risks,
            },
            "action": {
                "recommended": diagnosis.recommended_action,
                "enabled": diagnosis.action_enabled,
                "logs_needed": diagnosis.logs_needed,
            }
        }
    }


@router.get("/user/{local_id}/diagnose-all")
async def diagnose_all_nodes(local_id: str):
    """
    전체 노드 자기 진단
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    processor = LogProcessor()
    
    all_diagnoses = processor.diagnose_all(ontology)
    
    return {
        "success": True,
        "data": {
            node_id: {
                "node_name": d.node_name,
                "health_status": d.health_status,
                "urgency_level": d.urgency_level,
                "status_report": d.status_report,
                "primary_issue": d.primary_issue,
                "action_enabled": d.action_enabled,
                "logs_needed": d.logs_needed,
            }
            for node_id, d in all_diagnoses.items()
        }
    }


@router.get("/user/{local_id}/priority-issues")
async def get_priority_issues(local_id: str, top_n: int = 3):
    """
    가장 시급한 문제 노드 반환
    
    "오늘 해결해야 할 과제"를 자동으로 식별
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    processor = LogProcessor()
    
    priority_issues = processor.get_priority_issues(ontology, top_n)
    
    return {
        "success": True,
        "data": {
            "issues": [
                {
                    "node_id": d.node_id,
                    "node_name": d.node_name,
                    "urgency_level": d.urgency_level,
                    "status_report": d.status_report,
                    "recommended_action": d.recommended_action,
                }
                for d in priority_issues
            ]
        }
    }


@router.get("/user/{local_id}/bottlenecks")
async def get_bottlenecks(local_id: str):
    """
    병목 구간 식별
    
    신뢰도가 급격히 떨어지는 노드 간 연결 반환
    UI에서 흐름이 끊기거나 느려지게 표현
    """
    if local_id not in _demo_ontologies:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    
    ontology = _demo_ontologies[local_id]
    processor = LogProcessor()
    
    bottlenecks = processor.get_bottleneck_connections(ontology)
    
    return {
        "success": True,
        "data": {
            "bottlenecks": bottlenecks,
            "count": len(bottlenecks),
            "has_critical": any(b["severity"] > 0.7 for b in bottlenecks)
        }
    }