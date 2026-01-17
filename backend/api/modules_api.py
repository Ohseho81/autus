"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 30 Modules API
30개 원자 모듈 기반 업무 조합 API
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from task_engine.modules_30 import (
    ATOMIC_MODULES,
    TASK_TEMPLATES,
    MODULE_SUMMARY,
    ModuleCategory,
    AtomicModule,
    ModulePipeline,
    get_module,
    get_modules_by_category,
    get_template,
    get_templates_by_category,
    create_custom_pipeline,
    validate_pipeline,
    compute_pipeline_physics,
    count_possible_tasks,
    PipelineExecutor,
)

router = APIRouter(prefix="/api/modules", tags=["Modules"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class ModuleResponse(BaseModel):
    id: str
    name: str
    name_ko: str
    category: str
    description: str
    base_k: float
    base_i: float
    is_async: bool
    requires_human: bool
    energy_cost: float
    can_connect_to: List[str]


class PipelineRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    name_ko: str = Field(..., min_length=1, max_length=100)
    modules: List[str] = Field(..., min_items=2, max_items=7)
    category: str = "CUSTOM"
    description: str = ""


class PipelineResponse(BaseModel):
    id: str
    name: str
    name_ko: str
    description: str
    modules: List[str]
    category: str
    subcategory: str
    computed_k: float
    computed_i: float
    requires_human: bool


class ValidationResponse(BaseModel):
    valid: bool
    message: str
    computed_k: Optional[float] = None
    computed_i: Optional[float] = None


class ExecuteRequest(BaseModel):
    pipeline_id: Optional[str] = None
    modules: Optional[List[str]] = None
    input_data: Dict[str, Any] = {}


class ExecuteResponse(BaseModel):
    success: bool
    steps: List[Dict[str, Any]]
    data: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════════
# Module Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/summary")
async def get_modules_summary():
    """모듈 시스템 요약"""
    counts = count_possible_tasks()
    return {
        "success": True,
        "data": {
            **MODULE_SUMMARY,
            "combination_counts": counts,
        }
    }


@router.get("/all", response_model=List[ModuleResponse])
async def get_all_modules():
    """전체 모듈 목록"""
    return [
        ModuleResponse(
            id=m.id,
            name=m.name,
            name_ko=m.name_ko,
            category=m.category.value,
            description=m.description,
            base_k=m.base_k,
            base_i=m.base_i,
            is_async=m.is_async,
            requires_human=m.requires_human,
            energy_cost=m.energy_cost,
            can_connect_to=m.can_connect_to or [],
        )
        for m in ATOMIC_MODULES.values()
    ]


@router.get("/by-category/{category}")
async def get_modules_by_cat(category: str):
    """카테고리별 모듈 목록"""
    try:
        cat = ModuleCategory(category.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    modules = get_modules_by_category(cat)
    return {
        "success": True,
        "category": category,
        "count": len(modules),
        "modules": [
            {
                "id": m.id,
                "name": m.name,
                "name_ko": m.name_ko,
                "description": m.description,
                "base_k": m.base_k,
                "base_i": m.base_i,
            }
            for m in modules
        ]
    }


@router.get("/{module_id}", response_model=ModuleResponse)
async def get_module_detail(module_id: str):
    """모듈 상세 정보"""
    module = get_module(module_id.upper())
    if not module:
        raise HTTPException(status_code=404, detail=f"Module not found: {module_id}")
    
    return ModuleResponse(
        id=module.id,
        name=module.name,
        name_ko=module.name_ko,
        category=module.category.value,
        description=module.description,
        base_k=module.base_k,
        base_i=module.base_i,
        is_async=module.is_async,
        requires_human=module.requires_human,
        energy_cost=module.energy_cost,
        can_connect_to=module.can_connect_to or [],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Template Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/templates/all")
async def get_all_templates(
    category: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0
):
    """템플릿 목록 조회"""
    templates = TASK_TEMPLATES
    
    if category:
        templates = get_templates_by_category(category.upper())
    
    total = len(templates)
    templates = templates[offset:offset + limit]
    
    return {
        "success": True,
        "total": total,
        "count": len(templates),
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "name_ko": t.name_ko,
                "description": t.description,
                "modules": t.modules,
                "category": t.category,
                "subcategory": t.subcategory,
            }
            for t in templates
        ]
    }


@router.get("/templates/{template_id}", response_model=PipelineResponse)
async def get_template_detail(template_id: str):
    """템플릿 상세 정보"""
    template = get_template(template_id.upper())
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")
    
    k, i = compute_pipeline_physics(template.modules)
    requires_human = any(ATOMIC_MODULES[m].requires_human for m in template.modules)
    
    return PipelineResponse(
        id=template.id,
        name=template.name,
        name_ko=template.name_ko,
        description=template.description,
        modules=template.modules,
        category=template.category,
        subcategory=template.subcategory,
        computed_k=k,
        computed_i=i,
        requires_human=requires_human,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Pipeline Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/pipeline/validate", response_model=ValidationResponse)
async def validate_pipeline_request(modules: List[str]):
    """파이프라인 유효성 검증"""
    is_valid, message = validate_pipeline(modules)
    
    result = ValidationResponse(valid=is_valid, message=message)
    
    if is_valid:
        k, i = compute_pipeline_physics(modules)
        result.computed_k = k
        result.computed_i = i
    
    return result


@router.post("/pipeline/create", response_model=PipelineResponse)
async def create_pipeline(request: PipelineRequest):
    """커스텀 파이프라인 생성"""
    try:
        pipeline = create_custom_pipeline(
            name=request.name,
            name_ko=request.name_ko,
            modules=request.modules,
            category=request.category,
            description=request.description,
        )
        
        return PipelineResponse(
            id=pipeline.id,
            name=pipeline.name,
            name_ko=pipeline.name_ko,
            description=pipeline.description,
            modules=pipeline.modules,
            category=pipeline.category,
            subcategory=pipeline.subcategory,
            computed_k=pipeline.computed_k,
            computed_i=pipeline.computed_i,
            requires_human=pipeline.requires_human,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/pipeline/execute", response_model=ExecuteResponse)
async def execute_pipeline(request: ExecuteRequest):
    """파이프라인 실행"""
    executor = PipelineExecutor()
    
    # 템플릿 ID로 실행
    if request.pipeline_id:
        template = get_template(request.pipeline_id.upper())
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        pipeline = template
    # 모듈 직접 지정
    elif request.modules:
        is_valid, error = validate_pipeline(request.modules)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)
        
        pipeline = create_custom_pipeline(
            name="Ad-hoc Pipeline",
            name_ko="임시 파이프라인",
            modules=request.modules,
        )
    else:
        raise HTTPException(status_code=400, detail="pipeline_id or modules required")
    
    result = await executor.execute(pipeline, request.input_data)
    
    return ExecuteResponse(
        success=result["success"],
        steps=result["steps"],
        data=result["data"],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Module Graph Endpoint
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/graph")
async def get_module_graph():
    """모듈 연결 그래프 (시각화용)"""
    nodes = []
    edges = []
    
    for module in ATOMIC_MODULES.values():
        nodes.append({
            "id": module.id,
            "label": module.name_ko,
            "category": module.category.value,
            "k": module.base_k,
            "i": module.base_i,
        })
        
        for target in (module.can_connect_to or []):
            edges.append({
                "source": module.id,
                "target": target,
            })
    
    return {
        "success": True,
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
        }
    }
