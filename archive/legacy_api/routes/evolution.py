"""
AUTUS Evolution API
제3법칙: 메타-순환 - AUTUS가 AUTUS를 개발
제7법칙: 진화 - 지속적 개선

코드 분석, Pack 생성, 자동 개선
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from evolution.analyzer import get_analyzer
from evolution.generator import get_generator
from evolution.improver import get_improver

router = APIRouter(prefix="/evolution", tags=["Evolution"])

_analyzer = get_analyzer()
_generator = get_generator()
_improver = get_improver()


# ============ Models ============

class GeneratePackRequest(BaseModel):
    name: str
    description: str
    use_llm: bool = True

class GenerateFromCodeRequest(BaseModel):
    code: str
    name: Optional[str] = None

class ImprovePackRequest(BaseModel):
    pack_path: str
    use_llm: bool = False
    auto_apply: bool = True


# ============ Analysis ============

@router.get("/analyze/file")
async def analyze_file(path: str):
    """파일 분석"""
    result = _analyzer.analyze_file(path)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/analyze/directory")
async def analyze_directory(path: str = "."):
    """디렉토리 분석"""
    return _analyzer.analyze_directory(path)

@router.get("/analyze/pack")
async def analyze_pack(path: str):
    """Pack 분석"""
    result = _analyzer.analyze_pack(path)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/analyze/autus")
async def analyze_autus():
    """AUTUS 자기 분석"""
    return _analyzer.analyze_directory(".")


# ============ Generation ============

@router.post("/generate/pack")
async def generate_pack(request: GeneratePackRequest):
    """Pack 생성"""
    result = _generator.generate(
        name=request.name,
        description=request.description,
        use_llm=request.use_llm
    )
    return result

@router.post("/generate/from-code")
async def generate_from_code(request: GenerateFromCodeRequest):
    """코드에서 Pack 생성"""
    result = _generator.generate_from_code(
        code=request.code,
        name=request.name
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


# ============ Improvement ============

@router.post("/improve/analyze")
async def improve_analyze(request: ImprovePackRequest):
    """Pack 분석 (개선점 발견)"""
    result = _improver.analyze(request.pack_path)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/improve/pack")
async def improve_pack(request: ImprovePackRequest):
    """Pack 개선"""
    if request.use_llm:
        result = _improver.improve_with_llm(request.pack_path)
    else:
        result = _improver.improve(request.pack_path, auto_apply=request.auto_apply)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/improve/batch")
async def improve_batch(directory: Optional[str] = None):
    """일괄 개선"""
    return _improver.batch_improve(directory)


# ============ Meta-Circular ============

@router.get("/meta/status")
async def meta_status():
    """메타-순환 상태"""
    analysis = _analyzer.analyze_directory(".")
    
    return {
        "status": "active",
        "capabilities": {
            "analyze": True,
            "generate": True,
            "improve": True
        },
        "autus_stats": {
            "total_files": analysis.get("total_files", 0),
            "total_lines": analysis.get("total_lines", 0),
            "total_functions": analysis.get("total_functions", 0),
            "total_classes": analysis.get("total_classes", 0)
        },
        "principle": "AUTUS develops AUTUS"
    }

@router.post("/meta/evolve")
async def meta_evolve(target: str = "packs"):
    """자가 진화 실행"""
    results = {
        "target": target,
        "actions": []
    }
    
    if target == "packs" or target == "all":
        # Pack 일괄 개선
        improve_result = _improver.batch_improve()
        results["actions"].append({
            "type": "pack_improvement",
            "improved": improve_result.get("improved_count", 0)
        })
    
    if target == "analysis" or target == "all":
        # 자기 분석
        analysis = _analyzer.analyze_directory(".")
        results["actions"].append({
            "type": "self_analysis",
            "files": analysis.get("total_files", 0),
            "issues_found": sum(
                len(f.get("issues", []))
                for f in analysis.get("files", [])
            )
        })
    
    results["success"] = True
    results["message"] = "Evolution cycle completed"
    
    return results
