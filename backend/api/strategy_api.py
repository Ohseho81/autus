# ═══════════════════════════════════════════════════════════════════════════
# AUTUS L7 Strategy API - 전략 결정 엔진 REST API
# ═══════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/strategy", tags=["Strategy L7"])


# ═══════════════════════════════════════════════════════════════════════════
# Request Models
# ═══════════════════════════════════════════════════════════════════════════

class EntitySignalsRequest(BaseModel):
    """개체 신호 요청"""
    replicability: float
    standardization: float
    scarcity: float
    price_elasticity: float
    demand_stability: float
    competition_density: float
    process_simplicity: float
    physical_independence: float
    outcome_clarity: float
    brand_dependency: float


class ClassifyRequest(BaseModel):
    """분류 요청"""
    entity_id: str
    entity_name: str
    signals: EntitySignalsRequest


class EnvironmentMetricsRequest(BaseModel):
    """환경 지표 요청"""
    energy_density: float
    potential_mass: float
    competition_friction: float
    regulation_friction: float
    operational_friction: float
    growth_velocity: float
    market_saturation: float
    entropy_level: float
    entropy_trend: float


class AnalyzeEnvironmentRequest(BaseModel):
    """환경 분석 요청"""
    entity_id: str
    entity_name: str
    metrics: EnvironmentMetricsRequest
    current_industry: Optional[str] = None


class BulkClassifyRequest(BaseModel):
    """대량 분류 요청"""
    entities: List[ClassifyRequest]


class MatchKeymanRequest(BaseModel):
    """키맨 매칭 요청"""
    entity_id: str
    entity_name: str
    strategy: str
    keyman_type: str
    region: Optional[str] = None


class FullAnalysisRequest(BaseModel):
    """통합 분석 요청"""
    entity_id: str
    entity_name: str
    signals: EntitySignalsRequest
    metrics: EnvironmentMetricsRequest
    current_industry: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Entity Classification Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/classify")
async def classify_entity(request: ClassifyRequest):
    """
    개체 분류
    
    5대 전략 중 최적 전략을 할당합니다.
    """
    from strategy.entity_classifier import get_classifier, EntitySignals
    
    classifier = get_classifier()
    
    signals = EntitySignals(**request.signals.dict())
    result = classifier.classify(request.entity_id, request.entity_name, signals)
    
    return {
        "entity_id": result.entity_id,
        "entity_name": result.entity_name,
        "strategy": result.strategy.value,
        "confidence": round(result.confidence, 3),
        "keyman_type": result.keyman_type.value,
        "keyman_requirements": result.keyman_requirements,
        "strategic_goal": result.strategic_goal,
        "kpis": result.kpis,
        "recommended_actions": result.recommended_actions,
        "scores": {k.value: round(v, 3) for k, v in result.scores.items()},
        "analyzed_at": result.analyzed_at,
    }


@router.post("/classify/bulk")
async def bulk_classify(request: BulkClassifyRequest):
    """
    대량 분류
    
    여러 개체를 한 번에 분류합니다.
    """
    from strategy.entity_classifier import get_classifier, EntitySignals
    
    classifier = get_classifier()
    results = []
    
    for entity in request.entities:
        signals = EntitySignals(**entity.signals.dict())
        result = classifier.classify(entity.entity_id, entity.entity_name, signals)
        results.append({
            "entity_id": result.entity_id,
            "entity_name": result.entity_name,
            "strategy": result.strategy.value,
            "confidence": round(result.confidence, 3),
            "keyman_type": result.keyman_type.value,
        })
    
    return {
        "total": len(results),
        "results": results,
        "summary": classifier.get_strategy_summary(),
    }


@router.get("/strategies")
async def list_strategies():
    """
    전략 목록
    
    사용 가능한 전략 유형과 키맨 타입을 반환합니다.
    """
    from strategy.entity_classifier import StrategyType, KeymanType, EntityClassifier
    
    classifier = EntityClassifier()
    
    return {
        "strategies": [
            {
                "type": s.value,
                "keyman_type": classifier.STRATEGY_KEYMAN_MAP[s].value,
                "goal": classifier.STRATEGY_GOALS[s],
            }
            for s in StrategyType
        ],
        "keyman_types": [
            {
                "type": k.value,
                "requirements": classifier.KEYMAN_REQUIREMENTS[k],
            }
            for k in KeymanType
        ],
    }


@router.get("/classifications")
async def get_classifications():
    """
    분류 결과 조회
    
    현재까지의 모든 분류 결과를 반환합니다.
    """
    from strategy.entity_classifier import get_classifier
    
    classifier = get_classifier()
    
    return {
        "total": len(classifier.classifications),
        "summary": classifier.get_strategy_summary(),
    }


@router.get("/classifications/{entity_id}")
async def get_classification(entity_id: str):
    """
    특정 개체 분류 결과 조회
    """
    from strategy.entity_classifier import get_classifier
    
    classifier = get_classifier()
    result = classifier.get_classification(entity_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")
    
    return {
        "entity_id": result.entity_id,
        "entity_name": result.entity_name,
        "strategy": result.strategy.value,
        "confidence": round(result.confidence, 3),
        "keyman_type": result.keyman_type.value,
        "strategic_goal": result.strategic_goal,
        "kpis": result.kpis,
        "recommended_actions": result.recommended_actions,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Environment Analysis Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/environment/analyze")
async def analyze_environment(request: AnalyzeEnvironmentRequest):
    """
    환경 분석
    
    적응(Adapt) vs 전이(Migrate) 결정을 내립니다.
    """
    from strategy.environment_analyzer import get_analyzer, EnvironmentMetrics
    
    analyzer = get_analyzer()
    
    metrics = EnvironmentMetrics(**request.metrics.dict())
    result = analyzer.analyze(
        request.entity_id, 
        request.entity_name, 
        metrics,
        request.current_industry
    )
    
    return {
        "entity_id": result.entity_id,
        "entity_name": result.entity_name,
        "decision": result.decision.value,
        "confidence": round(result.confidence, 3),
        "decision_factors": result.decision_factors,
        "adaptation_actions": result.adaptation_actions,
        "migration_target": result.migration_target.value if result.migration_target else None,
        "migration_reasoning": result.migration_reasoning,
        "projected_improvement": f"{result.projected_improvement:.0%}",
        "analyzed_at": result.analyzed_at,
    }


@router.get("/environment/dead-nodes")
async def scan_dead_nodes():
    """
    데드 노드 스캔
    
    전이가 필요한 노드를 식별합니다.
    """
    from strategy.environment_analyzer import get_analyzer
    
    analyzer = get_analyzer()
    dead_nodes = analyzer.scan_dead_nodes()
    
    return {
        "count": len(dead_nodes),
        "nodes": [
            {
                "entity_id": n.entity_id,
                "entity_name": n.entity_name,
                "entropy_level": round(n.current_metrics.entropy_level, 3),
                "migration_target": n.migration_target.value if n.migration_target else None,
                "reasoning": n.migration_reasoning,
                "projected_improvement": f"{n.projected_improvement:.0%}",
            }
            for n in dead_nodes
        ],
    }


@router.get("/environment/summary")
async def get_environment_summary():
    """
    환경 분석 요약
    """
    from strategy.environment_analyzer import get_analyzer
    
    analyzer = get_analyzer()
    return analyzer.get_summary()


@router.get("/environment/{entity_id}")
async def get_environment_analysis(entity_id: str):
    """
    특정 개체 환경 분석 조회
    """
    from strategy.environment_analyzer import get_analyzer
    
    analyzer = get_analyzer()
    result = analyzer.get_analysis(entity_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "entity_id": result.entity_id,
        "entity_name": result.entity_name,
        "decision": result.decision.value,
        "confidence": round(result.confidence, 3),
        "decision_factors": result.decision_factors,
        "migration_target": result.migration_target.value if result.migration_target else None,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Keyman Matching Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/keyman/match")
async def match_keyman(request: MatchKeymanRequest):
    """
    키맨 매칭
    
    전략에 맞는 최적 키맨을 찾습니다.
    """
    from strategy.keyman_matcher import get_matcher
    from strategy.entity_classifier import StrategyType, KeymanType
    
    try:
        strategy = StrategyType(request.strategy)
        keyman_type = KeymanType(request.keyman_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid type: {e}")
    
    matcher = get_matcher()
    result = matcher.match(
        request.entity_id,
        request.entity_name,
        strategy,
        keyman_type,
        request.region,
    )
    
    if not result:
        return {
            "matched": False,
            "message": "적합한 키맨을 찾지 못했습니다.",
        }
    
    return {
        "matched": True,
        "entity_id": result.entity_id,
        "strategy": result.strategy.value,
        "keyman": {
            "id": result.matched_keyman.id,
            "name": result.matched_keyman.name,
            "type": result.matched_keyman.keyman_type.value,
            "specialty": result.matched_keyman.specialty,
            "rating": result.matched_keyman.average_rating,
        },
        "match_score": round(result.match_score, 3),
        "match_reasons": result.match_reasons,
        "projected_impact": result.projected_impact,
        "onboarding_steps": result.onboarding_steps,
        "estimated_onboarding_days": result.estimated_onboarding_days,
    }


@router.get("/keyman/available")
async def get_available_keymans(keyman_type: str = None):
    """
    가용 키맨 목록
    """
    from strategy.keyman_matcher import get_matcher
    from strategy.entity_classifier import KeymanType
    
    matcher = get_matcher()
    
    kt = None
    if keyman_type:
        try:
            kt = KeymanType(keyman_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid keyman type: {keyman_type}")
    
    return {
        "keymans": matcher.get_available_keymans(kt),
        "total": len(matcher.keyman_pool),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Sovereign Report Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/report")
async def generate_sovereign_report():
    """
    주권자 리포트 생성
    
    전체 노드 현황과 권장사항을 포함한 리포트를 생성합니다.
    """
    from strategy.sovereign_report import get_reporter
    
    reporter = get_reporter()
    report = reporter.generate_report()
    
    return {
        "report_id": report.report_id,
        "generated_at": report.generated_at,
        "overview": {
            "total_nodes": report.total_nodes,
            "active_nodes": report.active_nodes,
            "dead_nodes": report.dead_nodes,
        },
        "strategy_distribution": report.strategy_distribution,
        "environment_distribution": report.environment_distribution,
        "key_insights": report.key_insights,
        "urgent_actions": report.urgent_actions,
        "node_summaries": report.node_summaries,
        "recommendations": report.recommendations,
    }


@router.get("/report/executive")
async def get_executive_summary():
    """
    경영진 요약
    
    핵심 인사이트와 권장사항만 포함한 요약입니다.
    """
    from strategy.sovereign_report import get_reporter
    
    reporter = get_reporter()
    return reporter.generate_executive_summary()


@router.get("/report/one-liner/{entity_id}")
async def get_one_liner(entity_id: str):
    """
    1줄 리포트
    
    특정 노드에 대한 1줄 요약입니다.
    """
    from strategy.sovereign_report import get_reporter
    
    reporter = get_reporter()
    one_liner = reporter.generate_one_liner(entity_id)
    
    return {
        "entity_id": entity_id,
        "report": one_liner,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Full Analysis Endpoint
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/full-analysis")
async def full_analysis(request: FullAnalysisRequest):
    """
    통합 분석 (분류 + 환경 + 매칭 + 리포트)
    
    개체에 대한 전체 분석을 한 번에 수행합니다.
    """
    from strategy.entity_classifier import get_classifier, EntitySignals
    from strategy.environment_analyzer import get_analyzer, EnvironmentMetrics
    from strategy.keyman_matcher import get_matcher
    from strategy.sovereign_report import get_reporter
    
    classifier = get_classifier()
    analyzer = get_analyzer()
    matcher = get_matcher()
    reporter = get_reporter()
    
    # 1. 분류
    entity_signals = EntitySignals(**request.signals.dict())
    classification = classifier.classify(
        request.entity_id, 
        request.entity_name, 
        entity_signals
    )
    
    # 2. 환경 분석
    env_metrics = EnvironmentMetrics(**request.metrics.dict())
    environment = analyzer.analyze(
        request.entity_id, 
        request.entity_name, 
        env_metrics, 
        request.current_industry
    )
    
    # 3. 키맨 매칭
    keyman_match = matcher.match(
        request.entity_id,
        request.entity_name,
        classification.strategy,
        classification.keyman_type,
    )
    
    # 4. 1줄 리포트
    one_liner = reporter.generate_one_liner(request.entity_id)
    
    return {
        "entity_id": request.entity_id,
        "entity_name": request.entity_name,
        
        "classification": {
            "strategy": classification.strategy.value,
            "confidence": round(classification.confidence, 3),
            "keyman_type": classification.keyman_type.value,
            "goal": classification.strategic_goal,
            "kpis": classification.kpis,
        },
        
        "environment": {
            "decision": environment.decision.value,
            "confidence": round(environment.confidence, 3),
            "factors": environment.decision_factors[:3],
            "migration_target": environment.migration_target.value if environment.migration_target else None,
            "projected_improvement": f"{environment.projected_improvement:.0%}",
        },
        
        "keyman_match": {
            "matched": keyman_match is not None,
            "keyman_name": keyman_match.matched_keyman.name if keyman_match else None,
            "match_score": round(keyman_match.match_score, 3) if keyman_match else None,
            "onboarding_days": keyman_match.estimated_onboarding_days if keyman_match else None,
        } if keyman_match else {"matched": False},
        
        "one_liner": one_liner,
        
        "actions": {
            "strategic": classification.recommended_actions[:3],
            "environmental": environment.adaptation_actions[:3] if environment.adaptation_actions else [],
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
# Admin Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.delete("/reset")
async def reset_all_data():
    """
    모든 분석 데이터 초기화 (개발용)
    """
    from strategy.entity_classifier import get_classifier
    from strategy.environment_analyzer import get_analyzer
    from strategy.keyman_matcher import get_matcher
    
    get_classifier().clear_classifications()
    get_analyzer().clear_analyses()
    get_matcher().clear_matches()
    
    return {
        "status": "reset",
        "message": "모든 전략 분석 데이터가 초기화되었습니다.",
    }


# ═══════════════════════════════════════════════════════════════════════════
# Strategy Sync & Execution Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/sync")
async def sync_all_nodes():
    """
    [1] Strategy Sync: 42개 노드 전략 동기화
    
    모든 노드에 대해 분류 + 환경 분석 + 키맨 매칭을 실행합니다.
    """
    from strategy.node_seeder import get_seeder
    
    seeder = get_seeder()
    results = seeder.seed_all_nodes()
    
    return {
        "status": "synced",
        "message": f"{results['summary']['total_nodes']}개 노드 전략 동기화 완료",
        "summary": results["summary"],
        "classifications": results["classifications"],
        "matches": results["matches"][:10],  # 상위 10개만
    }


@router.get("/migration/scan")
async def scan_for_migration():
    """
    [2] Migration Scan: 데드 노드 스캔 + 업종 전환 계획
    
    전이가 필요한 노드를 식별하고 전환 계획을 생성합니다.
    """
    from strategy.node_seeder import get_seeder
    
    seeder = get_seeder()
    
    # 먼저 데이터가 있는지 확인
    from strategy.entity_classifier import get_classifier
    if not get_classifier().classifications:
        # 데이터 시딩
        seeder.seed_all_nodes()
    
    dead_nodes = seeder.get_dead_nodes()
    migration_plan = seeder.get_migration_plan()
    
    return {
        "status": "scanned",
        "total_dead_nodes": len(dead_nodes),
        "dead_nodes": dead_nodes,
        "migration_plan": migration_plan,
        "recommendations": [
            "🚨 Phase 1 노드는 즉시 업종 전환 착수",
            "📊 Phase 2 노드는 2주 내 전환 계획 수립",
            "⚠️ Phase 3 노드는 월간 모니터링 강화",
        ],
    }


@router.get("/execute/daechi")
async def execute_daechi_node():
    """
    [3] 대치동 실행: 첫 번째 노드 L7 전략 적용
    
    대치동 농구 노드(node_01)에 대한 상세 실행 계획을 생성합니다.
    """
    from strategy.node_seeder import get_seeder
    
    seeder = get_seeder()
    
    # 먼저 데이터가 있는지 확인
    from strategy.entity_classifier import get_classifier
    if not get_classifier().classifications:
        # 데이터 시딩
        seeder.seed_all_nodes()
    
    plan = seeder.get_daechi_execution_plan()
    
    return {
        "status": "execution_plan_generated",
        "node": plan,
        "next_steps": [
            "✅ Week 1: 키맨 온보딩 미팅 예약",
            "📊 Week 1: 현황 데이터 대시보드 세팅",
            "🎯 Week 2: KPI 목표 확정",
            "🚀 Week 3: 프리미엄 솔루션 론칭",
        ],
    }


@router.post("/execute/all")
async def execute_all_strategies():
    """
    [1+2+3] 전체 실행: Sync + Migration Scan + 대치동 실행
    
    모든 전략 분석을 한 번에 실행합니다.
    """
    from strategy.node_seeder import get_seeder
    
    seeder = get_seeder()
    
    # 1. 전략 동기화
    sync_results = seeder.seed_all_nodes()
    
    # 2. 데드 노드 스캔
    dead_nodes = seeder.get_dead_nodes()
    migration_plan = seeder.get_migration_plan()
    
    # 3. 대치동 실행 계획
    daechi_plan = seeder.get_daechi_execution_plan()
    
    return {
        "status": "all_executed",
        "timestamp": datetime.now().isoformat(),
        
        # 1. Strategy Sync 결과
        "strategy_sync": {
            "total_nodes": sync_results["summary"]["total_nodes"],
            "strategy_distribution": sync_results["summary"]["strategy_distribution"],
            "matched_keymans": sync_results["summary"]["matched_keymans"],
        },
        
        # 2. Migration Scan 결과
        "migration_scan": {
            "dead_node_count": len(dead_nodes),
            "dead_nodes": dead_nodes,
            "migration_plan": migration_plan,
        },
        
        # 3. 대치동 실행 계획
        "daechi_execution": {
            "node_name": daechi_plan.get("node_name"),
            "strategy": daechi_plan.get("current_status", {}).get("strategy"),
            "keyman": daechi_plan.get("keyman_assignment", {}).get("keyman_name"),
            "first_week_actions": daechi_plan.get("execution_plan", {}).get("phase_1_week_1_2", []),
            "success_metrics": daechi_plan.get("success_metrics"),
        },
        
        # 핵심 인사이트
        "key_insights": [
            f"📊 총 {sync_results['summary']['total_nodes']}개 노드 분석 완료",
            f"🚨 {len(dead_nodes)}개 노드 업종 전환 필요",
            f"🤝 {sync_results['summary']['matched_keymans']}개 노드 키맨 매칭 완료",
            f"🎯 대치동 노드: {daechi_plan.get('current_status', {}).get('goal', 'N/A')}",
        ],
        
        # 즉시 조치 사항
        "immediate_actions": [
            "🚨 데드 노드 업종 전환 회의 소집",
            "📞 대치동 키맨 온보딩 콜 예약",
            "📊 주간 성과 리포트 자동화 설정",
            "🔄 월간 전략 리뷰 일정 확정",
        ],
    }