"""
Arbutus Edge API Server
=======================

백만 건 처리 → 이상 징후 추출 → 헥사곤 맵 API
"""

from fastapi import APIRouter, HTTPException, WebSocket
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import json
import time
import os
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from edge.kernel import (
    ArbutusEdgeKernel, TableSchema, FieldSchema, DataType,
    generate_test_logs
)
from edge.hexagon_map import HexagonMapEngine, HexPhysics


# ============================================================
# Router & Global State
# ============================================================

router = APIRouter(prefix="/api/edge", tags=["edge"])

# 전역 엔진 (실제로는 lifespan에서 관리)
_kernel: Optional[ArbutusEdgeKernel] = None
_hex_engine: Optional[HexagonMapEngine] = None
_last_result: Optional[Dict] = None


def get_kernel() -> ArbutusEdgeKernel:
    """커널 인스턴스 가져오기"""
    global _kernel
    if _kernel is None:
        _kernel = ArbutusEdgeKernel(max_workers=4)
    return _kernel


def get_hex_engine() -> HexagonMapEngine:
    """헥사곤 엔진 인스턴스 가져오기"""
    global _hex_engine
    if _hex_engine is None:
        _hex_engine = HexagonMapEngine(radius=200)
    return _hex_engine


# ============================================================
# API Models
# ============================================================

class ProcessRequest(BaseModel):
    """처리 요청"""
    record_count: int = Field(100000, ge=1000, le=10000000)
    anomaly_rate: float = Field(0.01, ge=0.001, le=0.1)


class AuditFunctionRequest(BaseModel):
    """감사 함수 요청"""
    function: str
    field: str
    params: Dict[str, Any] = {}


# ============================================================
# Endpoints
# ============================================================

@router.get("/")
async def edge_root():
    """Edge API 정보"""
    return {
        "name": "Arbutus Edge API",
        "version": "1.0.0",
        "capabilities": [
            "million_record_processing",
            "200+_audit_functions",
            "hexagon_visualization",
            "realtime_streaming"
        ]
    }


@router.get("/health")
async def health():
    """헬스 체크"""
    kernel = get_kernel()
    return {
        "status": "healthy",
        "kernel_tables": list(kernel.tables.keys()),
        "last_metrics": kernel.get_metrics()
    }


@router.post("/process")
async def process_logs(req: ProcessRequest):
    """
    대량 로그 처리 및 이상 탐지
    
    1. 로그 생성/로드
    2. 이상 탐지 (DUPLICATES, OUTLIERS, BENFORD)
    3. 헥사곤 맵 매핑
    """
    global _last_result
    
    kernel = get_kernel()
    hex_engine = get_hex_engine()
    
    start_time = time.perf_counter()
    kernel.metrics.start()
    
    # 스키마 정의
    schema = TableSchema(
        name="logs",
        fields=[
            FieldSchema("id", DataType.INTEGER, primary_key=True),
            FieldSchema("timestamp", DataType.DATETIME),
            FieldSchema("category", DataType.STRING, indexed=True),
            FieldSchema("vendor", DataType.STRING, indexed=True),
            FieldSchema("department", DataType.STRING),
            FieldSchema("amount", DataType.CURRENCY),
            FieldSchema("invoice_num", DataType.STRING),
            FieldSchema("approved", DataType.BOOLEAN),
            FieldSchema("flags", DataType.STRING),
        ]
    )
    
    # 기존 테이블 제거
    if "logs" in kernel.tables:
        del kernel.tables["logs"]
    
    kernel.create_table("logs", schema)
    
    # 데이터 생성 및 로드
    logs = generate_test_logs(req.record_count)
    load_result = kernel.load_data("logs", logs)
    
    # 이상 탐지
    duplicates = kernel.execute("DUPLICATES", "logs", fields=["vendor", "amount"])
    outliers = kernel.execute("OUTLIERS", "logs", field="amount", method="zscore", threshold=3.0)
    benford = kernel.execute("BENFORD", "logs", field="amount")
    
    # 헥사곤 매핑
    hex_engine.reset()
    viz_data = hex_engine.process_kernel_results(
        duplicates=duplicates,
        outliers=outliers,
        benford=benford
    )
    
    total_time = time.perf_counter() - start_time
    
    _last_result = {
        "processing": {
            "record_count": req.record_count,
            "load_throughput": load_result["throughput"],
            "total_time_sec": round(total_time, 2),
            "overall_throughput": round(req.record_count / total_time, 0)
        },
        "anomalies": {
            "duplicates": len(duplicates),
            "outliers": len(outliers),
            "benford_conformity": benford["conformity"],
            "total": viz_data["stats"]["total"]
        },
        "kernel_metrics": kernel.get_metrics(),
        "visualization": viz_data
    }
    
    return _last_result


@router.get("/hexagon")
async def get_hexagon_data():
    """헥사곤 맵 시각화 데이터"""
    if not _last_result:
        return {"error": "No data processed yet. Call POST /api/edge/process first."}
    
    return _last_result.get("visualization", {})


@router.get("/stats")
async def get_stats():
    """처리 통계"""
    if not _last_result:
        return {"error": "No data processed yet"}
    
    return {
        "processing": _last_result["processing"],
        "anomalies": _last_result["anomalies"],
        "kernel_metrics": _last_result["kernel_metrics"]
    }


@router.get("/heatmap")
async def get_heatmap(resolution: int = 30):
    """히트맵 데이터"""
    hex_engine = get_hex_engine()
    if not hex_engine.all_anomalies:
        return {"error": "No anomalies to visualize"}
    
    heatmap = hex_engine.get_heatmap_data(resolution)
    return {
        "resolution": resolution,
        "data": heatmap
    }


@router.get("/functions")
async def list_functions():
    """사용 가능한 감사 함수 목록"""
    return {
        "data_combination": ["JOIN", "RELATE"],
        "classification": ["CLASSIFY", "STRATIFY", "AGE"],
        "anomaly_detection": ["DUPLICATES", "GAPS", "OUTLIERS", "BENFORD"],
        "statistics": ["STATISTICS", "SUMMARIZE"],
        "sampling": ["SAMPLE"],
        "verification": ["VERIFY", "CROSS_VALIDATE"]
    }


@router.post("/execute")
async def execute_function(req: AuditFunctionRequest):
    """개별 감사 함수 실행"""
    kernel = get_kernel()
    
    if "logs" not in kernel.tables:
        raise HTTPException(400, "No data loaded. Call POST /api/edge/process first.")
    
    try:
        result = kernel.execute(req.function, "logs", field=req.field, **req.params)
        return {
            "function": req.function,
            "field": req.field,
            "result": result,
            "metrics": kernel.get_metrics()["operations"][-1] if kernel.get_metrics()["operations"] else None
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get("/stream/anomalies")
async def stream_anomalies():
    """이상 징후 스트림 (SSE)"""
    hex_engine = get_hex_engine()
    
    async def generate():
        if not hex_engine.all_anomalies:
            yield f"data: {json.dumps({'error': 'No anomalies'})}\n\n"
            return
        
        for i, anomaly in enumerate(hex_engine.all_anomalies):
            data = anomaly.to_dict()
            data["index"] = i
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(0.01)  # 10ms 간격
        
        yield f"data: {json.dumps({'done': True, 'total': len(hex_engine.all_anomalies)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

