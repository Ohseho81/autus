"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 2026 Solution Modules API
30개 솔루션 모듈 API
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from task_engine.solution_modules_30 import (
    SOLUTION_MODULES,
    MODULE_MATRIX,
    SolutionCategory,
    TechStack,
    Priority,
    get_module,
    get_modules_by_category,
    get_modules_by_priority,
    get_modules_by_tech,
    get_dependency_order,
    calculate_total_effort,
    get_implementation_roadmap,
)

router = APIRouter(prefix="/api/solutions", tags=["Solutions"])


# ═══════════════════════════════════════════════════════════════════════════════
# Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class ModuleResponse(BaseModel):
    id: int
    code: str
    name: str
    name_ko: str
    category: str
    description: str
    trend_keywords: List[str]
    tech_stack: List[str]
    autus_components: List[str]
    affects_k: bool
    affects_i: bool
    affects_r: bool
    priority: str
    complexity: int
    estimated_days: int
    depends_on: List[str]


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/summary")
async def get_solution_summary():
    """솔루션 시스템 요약"""
    effort = calculate_total_effort()
    return {
        "success": True,
        "data": {
            "total_modules": 30,
            "effort": effort,
            "matrix": MODULE_MATRIX,
        }
    }


@router.get("/all")
async def get_all_solutions(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    tech: Optional[str] = None,
):
    """전체 솔루션 모듈 목록"""
    modules = list(SOLUTION_MODULES.values())
    
    if category:
        try:
            cat = SolutionCategory(category.upper())
            modules = [m for m in modules if m.category == cat]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    if priority:
        try:
            pri = Priority(priority.upper())
            modules = [m for m in modules if m.priority == pri]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid priority: {priority}")
    
    if tech:
        try:
            t = TechStack(tech)
            modules = [m for m in modules if t in m.tech_stack]
        except ValueError:
            pass  # 무시
    
    return {
        "success": True,
        "count": len(modules),
        "modules": [
            {
                "id": m.id,
                "code": m.code,
                "name": m.name,
                "name_ko": m.name_ko,
                "category": m.category.value,
                "description": m.description,
                "priority": m.priority.value,
                "complexity": m.complexity,
                "estimated_days": m.estimated_days,
                "tech_stack": [t.value for t in m.tech_stack],
                "depends_on": m.depends_on,
            }
            for m in modules
        ]
    }


@router.get("/roadmap")
async def get_roadmap():
    """구현 로드맵"""
    roadmap = get_implementation_roadmap()
    order = get_dependency_order()
    
    return {
        "success": True,
        "implementation_order": order,
        "roadmap": roadmap,
        "total_phases": len(roadmap),
    }


@router.get("/by-category/{category}")
async def get_by_category(category: str):
    """카테고리별 모듈"""
    try:
        cat = SolutionCategory(category.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    
    modules = get_modules_by_category(cat)
    info = MODULE_MATRIX["categories"].get(category.upper(), {})
    
    return {
        "success": True,
        "category": category.upper(),
        "info": info,
        "count": len(modules),
        "modules": [
            {
                "code": m.code,
                "name_ko": m.name_ko,
                "priority": m.priority.value,
                "estimated_days": m.estimated_days,
            }
            for m in modules
        ]
    }


@router.get("/by-priority/{priority}")
async def get_by_priority(priority: str):
    """우선순위별 모듈"""
    try:
        pri = Priority(priority.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {priority}")
    
    modules = get_modules_by_priority(pri)
    info = MODULE_MATRIX["priorities"].get(priority.upper(), {})
    
    return {
        "success": True,
        "priority": priority.upper(),
        "info": info,
        "count": len(modules),
        "modules": [
            {
                "code": m.code,
                "name_ko": m.name_ko,
                "category": m.category.value,
                "estimated_days": m.estimated_days,
            }
            for m in modules
        ]
    }


@router.get("/{code}", response_model=ModuleResponse)
async def get_solution_detail(code: str):
    """모듈 상세 정보"""
    module = get_module(code)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module not found: {code}")
    
    return ModuleResponse(
        id=module.id,
        code=module.code,
        name=module.name,
        name_ko=module.name_ko,
        category=module.category.value,
        description=module.description,
        trend_keywords=module.trend_keywords,
        tech_stack=[t.value for t in module.tech_stack],
        autus_components=module.autus_components,
        affects_k=module.affects_k,
        affects_i=module.affects_i,
        affects_r=module.affects_r,
        priority=module.priority.value,
        complexity=module.complexity,
        estimated_days=module.estimated_days,
        depends_on=module.depends_on,
    )


@router.get("/tech/{tech_name}")
async def get_by_tech(tech_name: str):
    """기술 스택별 모듈"""
    try:
        tech = TechStack(tech_name)
    except ValueError:
        # 부분 매칭 시도
        tech = None
        for t in TechStack:
            if tech_name.lower() in t.value.lower():
                tech = t
                break
        
        if not tech:
            raise HTTPException(status_code=400, detail=f"Invalid tech: {tech_name}")
    
    modules = get_modules_by_tech(tech)
    
    return {
        "success": True,
        "tech": tech.value,
        "count": len(modules),
        "modules": [
            {
                "code": m.code,
                "name_ko": m.name_ko,
                "category": m.category.value,
            }
            for m in modules
        ]
    }


@router.get("/dependencies/{code}")
async def get_dependencies(code: str):
    """모듈 의존성 그래프"""
    module = get_module(code)
    if not module:
        raise HTTPException(status_code=404, detail=f"Module not found: {code}")
    
    # 상위 의존성 (이 모듈이 의존하는)
    upstream = []
    for dep_code in module.depends_on:
        dep = get_module(dep_code)
        if dep:
            upstream.append({
                "code": dep.code,
                "name_ko": dep.name_ko,
                "priority": dep.priority.value,
            })
    
    # 하위 의존성 (이 모듈에 의존하는)
    downstream = []
    for m in SOLUTION_MODULES.values():
        if code.upper() in m.depends_on:
            downstream.append({
                "code": m.code,
                "name_ko": m.name_ko,
                "priority": m.priority.value,
            })
    
    return {
        "success": True,
        "module": {
            "code": module.code,
            "name_ko": module.name_ko,
        },
        "upstream": upstream,
        "downstream": downstream,
    }


@router.get("/matrix")
async def get_module_matrix():
    """모듈 매트릭스 (시각화용)"""
    nodes = []
    edges = []
    
    for module in SOLUTION_MODULES.values():
        nodes.append({
            "id": module.code,
            "label": module.name_ko,
            "category": module.category.value,
            "priority": module.priority.value,
            "complexity": module.complexity,
            "days": module.estimated_days,
        })
        
        for dep in module.depends_on:
            edges.append({
                "source": dep,
                "target": module.code,
            })
    
    return {
        "success": True,
        "nodes": nodes,
        "edges": edges,
        "categories": MODULE_MATRIX["categories"],
        "priorities": MODULE_MATRIX["priorities"],
    }
