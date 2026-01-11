"""
AUTUS Viewport API - 뷰포트/섹터 기반 노드/모션 데이터
"""

from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import math
import random

router = APIRouter(prefix="/api/viewport", tags=["Viewport"])

# ═══════════════════════════════════════════════════════════════════════════
# Data Models
# ═══════════════════════════════════════════════════════════════════════════

class ViewportBounds(BaseModel):
    sw_lat: float  # 남서쪽 위도
    sw_lng: float  # 남서쪽 경도
    ne_lat: float  # 북동쪽 위도
    ne_lng: float  # 북동쪽 경도

class ViewportNode(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    value: float
    ki_score: float
    rank: str
    type: str
    sector: str
    active: bool = True

class ViewportMotion(BaseModel):
    id: str
    source_id: str
    target_id: str
    source_lat: float
    source_lng: float
    target_lat: float
    target_lng: float
    amount: float
    flow_type: str
    active: bool = True

# ═══════════════════════════════════════════════════════════════════════════
# Scale Level Data
# ═══════════════════════════════════════════════════════════════════════════

# L0: 글로벌 (줌 1-3) - 12개 주요 국가 + M2C/ROI 데이터
GLOBAL_NODES = [
    {"id": "USA", "name": "United States", "lat": 38.0, "lng": -97.0, "value": 25e12, "ki": 0.95, "rank": "Sovereign", "type": "nation", "sector": "Americas", "m2c": 2.4, "roi": 85},
    {"id": "CHN", "name": "China", "lat": 35.0, "lng": 105.0, "value": 18e12, "ki": 0.92, "rank": "Sovereign", "type": "nation", "sector": "Asia", "m2c": 2.1, "roi": 72},
    {"id": "JPN", "name": "Japan", "lat": 36.0, "lng": 138.0, "value": 4.9e12, "ki": 0.85, "rank": "Archon", "type": "nation", "sector": "Asia", "m2c": 1.9, "roi": 65},
    {"id": "DEU", "name": "Germany", "lat": 51.0, "lng": 10.0, "value": 4.3e12, "ki": 0.82, "rank": "Archon", "type": "nation", "sector": "Europe", "m2c": 1.8, "roi": 58},
    {"id": "GBR", "name": "United Kingdom", "lat": 54.0, "lng": -2.0, "value": 3.1e12, "ki": 0.78, "rank": "Archon", "type": "nation", "sector": "Europe", "m2c": 1.6, "roi": 52},
    {"id": "FRA", "name": "France", "lat": 46.0, "lng": 2.0, "value": 2.9e12, "ki": 0.75, "rank": "Validator", "type": "nation", "sector": "Europe", "m2c": 1.5, "roi": 45},
    {"id": "KOR", "name": "South Korea", "lat": 36.5, "lng": 127.5, "value": 1.8e12, "ki": 0.72, "rank": "Validator", "type": "nation", "sector": "Asia", "m2c": 2.2, "roi": 78},
    {"id": "IND", "name": "India", "lat": 20.0, "lng": 77.0, "value": 3.5e12, "ki": 0.70, "rank": "Validator", "type": "nation", "sector": "Asia", "m2c": 1.3, "roi": 38},
    {"id": "BRA", "name": "Brazil", "lat": -14.0, "lng": -51.0, "value": 2.1e12, "ki": 0.65, "rank": "Operator", "type": "nation", "sector": "Americas", "m2c": 1.1, "roi": 28},
    {"id": "RUS", "name": "Russia", "lat": 60.0, "lng": 100.0, "value": 1.8e12, "ki": 0.60, "rank": "Operator", "type": "nation", "sector": "Europe", "m2c": 0.9, "roi": 15},
    {"id": "AUS", "name": "Australia", "lat": -25.0, "lng": 135.0, "value": 1.6e12, "ki": 0.58, "rank": "Operator", "type": "nation", "sector": "Oceania", "m2c": 1.7, "roi": 55},
    {"id": "CAN", "name": "Canada", "lat": 56.0, "lng": -106.0, "value": 2.0e12, "ki": 0.62, "rank": "Operator", "type": "nation", "sector": "Americas", "m2c": 1.4, "roi": 42},
]

# L1: 국가 (줌 4-6)
NATIONAL_NODES = [
    {"id": "n_korea", "name": "대한민국", "lat": 37.5, "lng": 127, "value": 1.8e12, "ki": 0.85, "rank": "Archon", "type": "country", "sector": "asia"},
    {"id": "n_japan", "name": "일본", "lat": 36, "lng": 138, "value": 4.2e12, "ki": 0.88, "rank": "Archon", "type": "country", "sector": "asia"},
    {"id": "n_china", "name": "중국", "lat": 35, "lng": 105, "value": 17e12, "ki": 0.93, "rank": "Sovereign", "type": "country", "sector": "asia"},
    {"id": "n_usa", "name": "미국", "lat": 38, "lng": -97, "value": 25e12, "ki": 0.95, "rank": "Sovereign", "type": "country", "sector": "namerica"},
]

# L2: 광역 (줌 7-9)
REGIONAL_NODES = [
    {"id": "r_seoul", "name": "서울특별시", "lat": 37.55, "lng": 127.0, "value": 450e9, "ki": 0.80, "rank": "Validator", "type": "city", "sector": "korea"},
    {"id": "r_gyeonggi", "name": "경기도", "lat": 37.4, "lng": 127.5, "value": 320e9, "ki": 0.75, "rank": "Validator", "type": "province", "sector": "korea"},
    {"id": "r_busan", "name": "부산광역시", "lat": 35.18, "lng": 129.07, "value": 95e9, "ki": 0.68, "rank": "Operator", "type": "city", "sector": "korea"},
    {"id": "r_incheon", "name": "인천광역시", "lat": 37.45, "lng": 126.7, "value": 85e9, "ki": 0.65, "rank": "Operator", "type": "city", "sector": "korea"},
]

# L3: 구/군 (줌 10-13)
DISTRICT_NODES = [
    {"id": "d_gangnam", "name": "강남구", "lat": 37.4947, "lng": 127.0573, "value": 85e9, "ki": 0.78, "rank": "Validator", "type": "district", "sector": "seoul"},
    {"id": "d_seocho", "name": "서초구", "lat": 37.4837, "lng": 127.0324, "value": 52e9, "ki": 0.72, "rank": "Operator", "type": "district", "sector": "seoul"},
    {"id": "d_songpa", "name": "송파구", "lat": 37.5048, "lng": 127.1144, "value": 48e9, "ki": 0.70, "rank": "Operator", "type": "district", "sector": "seoul"},
    {"id": "d_mapo", "name": "마포구", "lat": 37.5571, "lng": 126.9046, "value": 32e9, "ki": 0.65, "rank": "Operator", "type": "district", "sector": "seoul"},
    {"id": "d_jongno", "name": "종로구", "lat": 37.5735, "lng": 126.9790, "value": 42e9, "ki": 0.68, "rank": "Operator", "type": "district", "sector": "seoul"},
]

# L4: 동/블록 (줌 14+)
BLOCK_NODES = [
    {"id": "b_daechi", "name": "대치동", "lat": 37.4947, "lng": 127.0573, "value": 12.5e9, "ki": 0.65, "rank": "Operator", "type": "block", "sector": "gangnam"},
    {"id": "b_samsung", "name": "삼성동", "lat": 37.5088, "lng": 127.0632, "value": 8.7e9, "ki": 0.58, "rank": "Terminal", "type": "block", "sector": "gangnam"},
    {"id": "b_yeoksam", "name": "역삼동", "lat": 37.4995, "lng": 127.0365, "value": 6.3e9, "ki": 0.52, "rank": "Terminal", "type": "block", "sector": "gangnam"},
    {"id": "b_cheongdam", "name": "청담동", "lat": 37.5198, "lng": 127.0474, "value": 5.1e9, "ki": 0.48, "rank": "Terminal", "type": "block", "sector": "gangnam"},
    {"id": "b_nonhyeon", "name": "논현동", "lat": 37.5108, "lng": 127.0252, "value": 4.2e9, "ki": 0.45, "rank": "Terminal", "type": "block", "sector": "gangnam"},
    {"id": "b_apgujeong", "name": "압구정동", "lat": 37.5269, "lng": 127.0283, "value": 3.8e9, "ki": 0.42, "rank": "Terminal", "type": "block", "sector": "gangnam"},
    {"id": "b_sinsa", "name": "신사동", "lat": 37.5166, "lng": 127.0198, "value": 5.5e9, "ki": 0.50, "rank": "Terminal", "type": "block", "sector": "gangnam"},
    {"id": "b_dogok", "name": "도곡동", "lat": 37.4891, "lng": 127.0456, "value": 4.1e9, "ki": 0.44, "rank": "Terminal", "type": "block", "sector": "gangnam"},
]

# 모션/흐름 데이터 - 12개 국가 간 무역
GLOBAL_MOTIONS = [
    {"from": "USA", "to": "CHN", "amount": 150e9, "type": "trade"},
    {"from": "CHN", "to": "USA", "amount": 120e9, "type": "trade"},
    {"from": "USA", "to": "DEU", "amount": 85e9, "type": "trade"},
    {"from": "DEU", "to": "CHN", "amount": 95e9, "type": "trade"},
    {"from": "JPN", "to": "USA", "amount": 75e9, "type": "trade"},
    {"from": "KOR", "to": "CHN", "amount": 60e9, "type": "trade"},
    {"from": "GBR", "to": "USA", "amount": 55e9, "type": "trade"},
    {"from": "FRA", "to": "DEU", "amount": 45e9, "type": "trade"},
    {"from": "IND", "to": "USA", "amount": 40e9, "type": "trade"},
    {"from": "AUS", "to": "CHN", "amount": 35e9, "type": "commodity"},
    {"from": "BRA", "to": "CHN", "amount": 30e9, "type": "commodity"},
    {"from": "CAN", "to": "USA", "amount": 65e9, "type": "trade"},
]

NATIONAL_MOTIONS = [
    {"from": "n_korea", "to": "n_japan", "amount": 85e9, "type": "trade"},
    {"from": "n_korea", "to": "n_china", "amount": 142e9, "type": "trade"},
    {"from": "n_korea", "to": "n_usa", "amount": 95e9, "type": "investment"},
    {"from": "n_china", "to": "n_usa", "amount": 550e9, "type": "trade"},
]

REGIONAL_MOTIONS = [
    {"from": "r_seoul", "to": "r_gyeonggi", "amount": 25e9, "type": "transfer"},
    {"from": "r_seoul", "to": "r_busan", "amount": 8e9, "type": "investment"},
    {"from": "r_seoul", "to": "r_incheon", "amount": 12e9, "type": "trade"},
]

DISTRICT_MOTIONS = [
    {"from": "d_gangnam", "to": "d_seocho", "amount": 5.2e9, "type": "transfer"},
    {"from": "d_gangnam", "to": "d_songpa", "amount": 3.8e9, "type": "payment"},
    {"from": "d_mapo", "to": "d_jongno", "amount": 2.1e9, "type": "trade"},
]

BLOCK_MOTIONS = [
    {"from": "b_daechi", "to": "b_samsung", "amount": 2.5e6, "type": "payment"},
    {"from": "b_daechi", "to": "b_yeoksam", "amount": 1.8e6, "type": "transfer"},
    {"from": "b_daechi", "to": "b_dogok", "amount": 1.2e6, "type": "revenue"},
    {"from": "b_samsung", "to": "b_cheongdam", "amount": 3.2e6, "type": "payment"},
    {"from": "b_samsung", "to": "b_apgujeong", "amount": 0.9e6, "type": "transfer"},
    {"from": "b_yeoksam", "to": "b_nonhyeon", "amount": 2.1e6, "type": "payment"},
    {"from": "b_yeoksam", "to": "b_sinsa", "amount": 1.5e6, "type": "transfer"},
    {"from": "b_cheongdam", "to": "b_apgujeong", "amount": 2.8e6, "type": "revenue"},
    {"from": "b_cheongdam", "to": "b_sinsa", "amount": 1.1e6, "type": "payment"},
    {"from": "b_nonhyeon", "to": "b_sinsa", "amount": 1.9e6, "type": "transfer"},
    {"from": "b_apgujeong", "to": "b_sinsa", "amount": 1.6e6, "type": "payment"},
]

# ═══════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════

def get_scale_level(zoom: float) -> str:
    """줌 레벨에 따른 스케일 레벨"""
    if zoom < 4:
        return "L0"  # Global
    elif zoom < 7:
        return "L1"  # National
    elif zoom < 10:
        return "L2"  # Regional
    elif zoom < 14:
        return "L3"  # District
    else:
        return "L4"  # Block

def is_in_viewport(lat: float, lng: float, bounds: ViewportBounds) -> bool:
    """노드가 뷰포트 내에 있는지 확인"""
    return (bounds.sw_lat <= lat <= bounds.ne_lat and 
            bounds.sw_lng <= lng <= bounds.ne_lng)

def get_nodes_for_level(level: str) -> List[Dict]:
    """레벨에 맞는 노드 데이터"""
    if level == "L0":
        return GLOBAL_NODES
    elif level == "L1":
        return NATIONAL_NODES
    elif level == "L2":
        return REGIONAL_NODES
    elif level == "L3":
        return DISTRICT_NODES
    else:
        return BLOCK_NODES

def get_motions_for_level(level: str) -> List[Dict]:
    """레벨에 맞는 모션 데이터"""
    if level == "L0":
        return GLOBAL_MOTIONS
    elif level == "L1":
        return NATIONAL_MOTIONS
    elif level == "L2":
        return REGIONAL_MOTIONS
    elif level == "L3":
        return DISTRICT_MOTIONS
    else:
        return BLOCK_MOTIONS

def build_motion_with_coords(motion: Dict, nodes: List[Dict]) -> Optional[Dict]:
    """모션에 좌표 추가"""
    node_map = {n["id"]: n for n in nodes}
    source = node_map.get(motion["from"])
    target = node_map.get(motion["to"])
    
    if not source or not target:
        return None
    
    return {
        "id": f"{motion['from']}_{motion['to']}",
        "source_id": motion["from"],
        "target_id": motion["to"],
        "source_lat": source["lat"],
        "source_lng": source["lng"],
        "target_lat": target["lat"],
        "target_lng": target["lng"],
        "amount": motion["amount"],
        "flow_type": motion["type"],
        "active": True,
    }

# ═══════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/data")
async def get_viewport_data(
    zoom: float = Query(..., description="현재 줌 레벨"),
    sw_lat: float = Query(..., description="남서쪽 위도"),
    sw_lng: float = Query(..., description="남서쪽 경도"),
    ne_lat: float = Query(..., description="북동쪽 위도"),
    ne_lng: float = Query(..., description="북동쪽 경도"),
):
    """
    현재 뷰포트와 줌 레벨에 맞는 노드와 모션 반환
    
    줌인하면 해당 섹터의 노드와 모션만 활성화됨
    """
    bounds = ViewportBounds(sw_lat=sw_lat, sw_lng=sw_lng, ne_lat=ne_lat, ne_lng=ne_lng)
    level = get_scale_level(zoom)
    
    # 레벨에 맞는 노드 가져오기
    all_nodes = get_nodes_for_level(level)
    
    # 뷰포트 내 노드 필터링
    viewport_nodes = []
    for node in all_nodes:
        in_viewport = is_in_viewport(node["lat"], node["lng"], bounds)
        viewport_nodes.append({
            **node,
            "ki_score": node["ki"],
            "active": in_viewport,
        })
    
    # 레벨에 맞는 모션 가져오기
    all_motions = get_motions_for_level(level)
    
    # 모션에 좌표 추가 및 활성화 상태 설정
    viewport_motions = []
    active_node_ids = {n["id"] for n in viewport_nodes if n["active"]}
    
    for motion in all_motions:
        motion_data = build_motion_with_coords(motion, all_nodes)
        if motion_data:
            # 양쪽 노드가 모두 뷰포트 내에 있으면 활성화
            is_active = (motion["from"] in active_node_ids and 
                        motion["to"] in active_node_ids)
            motion_data["active"] = is_active
            viewport_motions.append(motion_data)
    
    return {
        "level": level,
        "zoom": zoom,
        "bounds": {
            "sw": [sw_lat, sw_lng],
            "ne": [ne_lat, ne_lng],
        },
        "nodes": {
            "total": len(viewport_nodes),
            "active": sum(1 for n in viewport_nodes if n["active"]),
            "data": viewport_nodes,
        },
        "motions": {
            "total": len(viewport_motions),
            "active": sum(1 for m in viewport_motions if m["active"]),
            "data": viewport_motions,
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

@router.get("/sector/{sector_id}")
async def get_sector_data(
    sector_id: str,
    zoom: float = Query(12, description="줌 레벨"),
):
    """특정 섹터의 데이터 반환"""
    level = get_scale_level(zoom)
    all_nodes = get_nodes_for_level(level)
    
    # 섹터에 속한 노드 필터링
    sector_nodes = [n for n in all_nodes if n.get("sector") == sector_id]
    
    # 해당 노드들 사이의 모션
    all_motions = get_motions_for_level(level)
    node_ids = {n["id"] for n in sector_nodes}
    
    sector_motions = []
    for motion in all_motions:
        if motion["from"] in node_ids or motion["to"] in node_ids:
            motion_data = build_motion_with_coords(motion, all_nodes)
            if motion_data:
                sector_motions.append(motion_data)
    
    return {
        "sector": sector_id,
        "level": level,
        "nodes": sector_nodes,
        "motions": sector_motions,
    }

@router.get("/levels")
async def get_scale_levels():
    """스케일 레벨 정보"""
    return {
        "levels": [
            {"id": "L0", "name": "Global", "zoom_range": [1, 3], "description": "대륙/글로벌"},
            {"id": "L1", "name": "National", "zoom_range": [4, 6], "description": "국가"},
            {"id": "L2", "name": "Regional", "zoom_range": [7, 9], "description": "광역시/도"},
            {"id": "L3", "name": "District", "zoom_range": [10, 13], "description": "구/군"},
            {"id": "L4", "name": "Block", "zoom_range": [14, 22], "description": "동/블록"},
        ],
    }

@router.get("/stats")
async def get_viewport_stats(
    zoom: float = Query(10),
):
    """현재 줌 레벨의 통계"""
    level = get_scale_level(zoom)
    nodes = get_nodes_for_level(level)
    motions = get_motions_for_level(level)
    
    total_value = sum(n["value"] for n in nodes)
    total_flow = sum(m["amount"] for m in motions)
    
    return {
        "level": level,
        "zoom": zoom,
        "node_count": len(nodes),
        "motion_count": len(motions),
        "total_value": total_value,
        "total_flow": total_flow,
        "avg_ki": sum(n["ki"] for n in nodes) / len(nodes) if nodes else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Cluster/Sector Boundaries
# ═══════════════════════════════════════════════════════════════════════════

# 섹터별 경계 폴리곤 정의
SECTOR_BOUNDARIES = {
    # L0: 글로벌 - 대륙 경계
    "global": {
        "asia": {
            "name": "Asia Pacific",
            "color": [0, 200, 255, 60],
            "border_color": [0, 200, 255, 150],
            "polygon": [[0, 60], [60, 60], [60, 180], [0, 180], [-20, 140], [-20, 100]],
            "center": [30, 105],
        },
        "europe": {
            "name": "Europe",
            "color": [255, 165, 0, 60],
            "border_color": [255, 165, 0, 150],
            "polygon": [[35, -10], [70, -10], [70, 60], [35, 60]],
            "center": [50, 10],
        },
        "namerica": {
            "name": "North America",
            "color": [0, 255, 128, 60],
            "border_color": [0, 255, 128, 150],
            "polygon": [[15, -170], [70, -170], [70, -50], [15, -50]],
            "center": [40, -100],
        },
    },
    # L1: 국가 - 아시아 국가 경계
    "asia": {
        "korea": {
            "name": "대한민국",
            "color": [138, 43, 226, 60],
            "border_color": [138, 43, 226, 150],
            "polygon": [[33, 124], [43, 124], [43, 132], [33, 132]],
            "center": [37.5, 127],
        },
        "japan": {
            "name": "일본",
            "color": [255, 99, 71, 60],
            "border_color": [255, 99, 71, 150],
            "polygon": [[30, 128], [46, 128], [46, 146], [30, 146]],
            "center": [36, 138],
        },
        "china": {
            "name": "중국",
            "color": [255, 215, 0, 60],
            "border_color": [255, 215, 0, 150],
            "polygon": [[18, 73], [54, 73], [54, 135], [18, 135]],
            "center": [35, 105],
        },
    },
    # L2: 광역 - 한국 광역시/도 경계
    "korea": {
        "seoul": {
            "name": "서울특별시",
            "color": [0, 191, 255, 80],
            "border_color": [0, 191, 255, 200],
            "polygon": [[37.42, 126.76], [37.42, 127.18], [37.70, 127.18], [37.70, 126.76]],
            "center": [37.55, 127.0],
        },
        "gyeonggi": {
            "name": "경기도",
            "color": [50, 205, 50, 60],
            "border_color": [50, 205, 50, 150],
            "polygon": [[36.9, 126.3], [36.9, 127.9], [38.3, 127.9], [38.3, 126.3]],
            "center": [37.4, 127.5],
        },
        "busan": {
            "name": "부산광역시",
            "color": [255, 105, 180, 60],
            "border_color": [255, 105, 180, 150],
            "polygon": [[34.9, 128.8], [34.9, 129.3], [35.4, 129.3], [35.4, 128.8]],
            "center": [35.18, 129.07],
        },
    },
    # L3: 구/군 - 서울 구 경계
    "seoul": {
        "gangnam": {
            "name": "강남구",
            "color": [255, 215, 0, 80],
            "border_color": [255, 215, 0, 200],
            "polygon": [[37.46, 127.01], [37.46, 127.11], [37.53, 127.11], [37.53, 127.01]],
            "center": [37.4947, 127.0573],
        },
        "seocho": {
            "name": "서초구",
            "color": [138, 43, 226, 60],
            "border_color": [138, 43, 226, 150],
            "polygon": [[37.44, 126.95], [37.44, 127.05], [37.51, 127.05], [37.51, 126.95]],
            "center": [37.4837, 127.0324],
        },
        "songpa": {
            "name": "송파구",
            "color": [0, 206, 209, 60],
            "border_color": [0, 206, 209, 150],
            "polygon": [[37.47, 127.08], [37.47, 127.15], [37.54, 127.15], [37.54, 127.08]],
            "center": [37.5048, 127.1144],
        },
        "mapo": {
            "name": "마포구",
            "color": [255, 127, 80, 60],
            "border_color": [255, 127, 80, 150],
            "polygon": [[37.53, 126.87], [37.53, 126.95], [37.58, 126.95], [37.58, 126.87]],
            "center": [37.5571, 126.9046],
        },
    },
    # L4: 블록 - 강남구 동 경계
    "gangnam": {
        "daechi": {
            "name": "대치동",
            "color": [255, 99, 71, 80],
            "border_color": [255, 99, 71, 200],
            "polygon": [[37.49, 127.05], [37.49, 127.065], [37.505, 127.065], [37.505, 127.05]],
            "center": [37.4947, 127.0573],
        },
        "samsung": {
            "name": "삼성동",
            "color": [30, 144, 255, 80],
            "border_color": [30, 144, 255, 200],
            "polygon": [[37.505, 127.055], [37.505, 127.075], [37.515, 127.075], [37.515, 127.055]],
            "center": [37.5088, 127.0632],
        },
        "yeoksam": {
            "name": "역삼동",
            "color": [50, 205, 50, 80],
            "border_color": [50, 205, 50, 200],
            "polygon": [[37.495, 127.025], [37.495, 127.045], [37.51, 127.045], [37.51, 127.025]],
            "center": [37.4995, 127.0365],
        },
        "cheongdam": {
            "name": "청담동",
            "color": [255, 215, 0, 80],
            "border_color": [255, 215, 0, 200],
            "polygon": [[37.515, 127.04], [37.515, 127.055], [37.525, 127.055], [37.525, 127.04]],
            "center": [37.5198, 127.0474],
        },
        "nonhyeon": {
            "name": "논현동",
            "color": [255, 20, 147, 80],
            "border_color": [255, 20, 147, 200],
            "polygon": [[37.505, 127.02], [37.505, 127.035], [37.515, 127.035], [37.515, 127.02]],
            "center": [37.5108, 127.0252],
        },
        "apgujeong": {
            "name": "압구정동",
            "color": [148, 0, 211, 80],
            "border_color": [148, 0, 211, 200],
            "polygon": [[37.52, 127.02], [37.52, 127.035], [37.53, 127.035], [37.53, 127.02]],
            "center": [37.5269, 127.0283],
        },
        "sinsa": {
            "name": "신사동",
            "color": [0, 255, 127, 80],
            "border_color": [0, 255, 127, 200],
            "polygon": [[37.51, 127.01], [37.51, 127.025], [37.52, 127.025], [37.52, 127.01]],
            "center": [37.5166, 127.0198],
        },
        "dogok": {
            "name": "도곡동",
            "color": [70, 130, 180, 80],
            "border_color": [70, 130, 180, 200],
            "polygon": [[37.48, 127.04], [37.48, 127.055], [37.495, 127.055], [37.495, 127.04]],
            "center": [37.4891, 127.0456],
        },
    },
}

def get_sector_parent(level: str) -> str:
    """레벨에 따른 상위 섹터 ID"""
    level_parents = {
        "L0": "global",
        "L1": "asia",
        "L2": "korea",
        "L3": "seoul",
        "L4": "gangnam",
    }
    return level_parents.get(level, "global")


@router.get("/clusters")
async def get_clusters(
    zoom: float = Query(..., description="현재 줌 레벨"),
    sw_lat: float = Query(-90),
    sw_lng: float = Query(-180),
    ne_lat: float = Query(90),
    ne_lng: float = Query(180),
):
    """
    현재 줌 레벨에 맞는 클러스터/섹터 경계 반환
    """
    level = get_scale_level(zoom)
    parent_sector = get_sector_parent(level)
    
    boundaries = SECTOR_BOUNDARIES.get(parent_sector, {})
    bounds = ViewportBounds(sw_lat=sw_lat, sw_lng=sw_lng, ne_lat=ne_lat, ne_lng=ne_lng)
    
    # 뷰포트 내 클러스터만 반환
    clusters = []
    for sector_id, sector_data in boundaries.items():
        center = sector_data["center"]
        if is_in_viewport(center[0], center[1], bounds):
            # 노드 통계 계산
            all_nodes = get_nodes_for_level(level)
            sector_nodes = [n for n in all_nodes if n.get("sector") == sector_id]
            
            clusters.append({
                "id": sector_id,
                "name": sector_data["name"],
                "polygon": sector_data["polygon"],
                "center": center,
                "color": sector_data["color"],
                "border_color": sector_data["border_color"],
                "active": True,
                "stats": {
                    "node_count": len(sector_nodes),
                    "total_value": sum(n["value"] for n in sector_nodes),
                    "avg_ki": sum(n["ki"] for n in sector_nodes) / len(sector_nodes) if sector_nodes else 0,
                },
            })
    
    return {
        "level": level,
        "parent_sector": parent_sector,
        "clusters": clusters,
        "total": len(clusters),
    }


@router.get("/cluster/{cluster_id}")
async def get_cluster_detail(
    cluster_id: str,
    zoom: float = Query(10),
):
    """특정 클러스터의 상세 정보"""
    level = get_scale_level(zoom)
    parent_sector = get_sector_parent(level)
    
    boundaries = SECTOR_BOUNDARIES.get(parent_sector, {})
    cluster_data = boundaries.get(cluster_id)
    
    if not cluster_data:
        return {"error": "Cluster not found"}
    
    # 해당 클러스터의 노드들
    all_nodes = get_nodes_for_level(level)
    cluster_nodes = [n for n in all_nodes if n.get("sector") == cluster_id]
    
    # 해당 클러스터 관련 모션
    all_motions = get_motions_for_level(level)
    node_ids = {n["id"] for n in cluster_nodes}
    cluster_motions = [m for m in all_motions if m["from"] in node_ids or m["to"] in node_ids]
    
    return {
        "id": cluster_id,
        "name": cluster_data["name"],
        "polygon": cluster_data["polygon"],
        "center": cluster_data["center"],
        "color": cluster_data["color"],
        "nodes": cluster_nodes,
        "motions": [build_motion_with_coords(m, all_nodes) for m in cluster_motions],
        "stats": {
            "node_count": len(cluster_nodes),
            "motion_count": len(cluster_motions),
            "total_value": sum(n["value"] for n in cluster_nodes),
            "total_flow": sum(m["amount"] for m in cluster_motions),
            "avg_ki": sum(n["ki"] for n in cluster_nodes) / len(cluster_nodes) if cluster_nodes else 0,
        },
    }