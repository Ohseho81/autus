"""
Shopify Webhook Handler
주문/환불/고객 이벤트 처리
"""

from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
import hmac
import hashlib
import base64
import os

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()

SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET", "")


def verify_shopify_webhook(data: bytes, hmac_header: str) -> bool:
    """Shopify HMAC 검증"""
    if not SHOPIFY_API_SECRET:
        return True  # 개발 환경
    
    digest = hmac.new(
        SHOPIFY_API_SECRET.encode('utf-8'),
        data,
        hashlib.sha256
    ).digest()
    computed_hmac = base64.b64encode(digest).decode()
    
    return hmac.compare_digest(computed_hmac, hmac_header)


@router.post("/shopify")
async def shopify_webhook(
    request: Request,
    x_shopify_hmac_sha256: Optional[str] = Header(None),
    x_shopify_topic: Optional[str] = Header(None)
):
    """
    Shopify Webhook 처리
    
    지원 이벤트:
    - orders/create, orders/paid → inflow
    - orders/cancelled, refunds/create → outflow
    - customers/create → node_create
    """
    payload = await request.body()
    
    # HMAC 검증
    if x_shopify_hmac_sha256 and not verify_shopify_webhook(payload, x_shopify_hmac_sha256):
        raise HTTPException(status_code=401, detail="Invalid HMAC")
    
    import json
    data = json.loads(payload)
    topic = x_shopify_topic or ""
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_shopify(data, topic)
    
    if not cleaned.get("node_id"):
        # 게스트 주문 처리
        cleaned["node_id"] = f"shopify_guest_{data.get('id', 'unknown')}"
    
    # 토픽별 처리
    if topic in ["orders/create", "orders/paid"]:
        # Inflow: 주문 생성/결제
        neo4j_client.upsert_node(cleaned["node_id"], "shopify")
        neo4j_client.create_motion(
            source_id=cleaned["node_id"],
            target_id="owner",
            amount=cleaned["value"],
            direction="inflow"
        )
        neo4j_client.recalculate_value(cleaned["node_id"])
        
        return {
            "received": True,
            "action": "inflow_created",
            "node_id": cleaned["node_id"],
            "amount": cleaned["value"],
            "topic": topic
        }
    
    elif topic in ["orders/cancelled", "refunds/create"]:
        # Outflow: 취소/환불
        neo4j_client.create_motion(
            source_id="owner",
            target_id=cleaned["node_id"],
            amount=cleaned["value"],
            direction="outflow"
        )
        neo4j_client.recalculate_value(cleaned["node_id"])
        
        return {
            "received": True,
            "action": "outflow_created",
            "node_id": cleaned["node_id"],
            "amount": cleaned["value"],
            "topic": topic
        }
    
    elif topic == "customers/create":
        # 노드 생성
        neo4j_client.upsert_node(cleaned["node_id"], "shopify")
        
        return {
            "received": True,
            "action": "node_created",
            "node_id": cleaned["node_id"]
        }
    
    return {"received": True, "action": "ignored", "topic": topic}



"""
Shopify Webhook Handler
주문/환불/고객 이벤트 처리
"""

from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
import hmac
import hashlib
import base64
import os

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()

SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET", "")


def verify_shopify_webhook(data: bytes, hmac_header: str) -> bool:
    """Shopify HMAC 검증"""
    if not SHOPIFY_API_SECRET:
        return True  # 개발 환경
    
    digest = hmac.new(
        SHOPIFY_API_SECRET.encode('utf-8'),
        data,
        hashlib.sha256
    ).digest()
    computed_hmac = base64.b64encode(digest).decode()
    
    return hmac.compare_digest(computed_hmac, hmac_header)


@router.post("/shopify")
async def shopify_webhook(
    request: Request,
    x_shopify_hmac_sha256: Optional[str] = Header(None),
    x_shopify_topic: Optional[str] = Header(None)
):
    """
    Shopify Webhook 처리
    
    지원 이벤트:
    - orders/create, orders/paid → inflow
    - orders/cancelled, refunds/create → outflow
    - customers/create → node_create
    """
    payload = await request.body()
    
    # HMAC 검증
    if x_shopify_hmac_sha256 and not verify_shopify_webhook(payload, x_shopify_hmac_sha256):
        raise HTTPException(status_code=401, detail="Invalid HMAC")
    
    import json
    data = json.loads(payload)
    topic = x_shopify_topic or ""
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_shopify(data, topic)
    
    if not cleaned.get("node_id"):
        # 게스트 주문 처리
        cleaned["node_id"] = f"shopify_guest_{data.get('id', 'unknown')}"
    
    # 토픽별 처리
    if topic in ["orders/create", "orders/paid"]:
        # Inflow: 주문 생성/결제
        neo4j_client.upsert_node(cleaned["node_id"], "shopify")
        neo4j_client.create_motion(
            source_id=cleaned["node_id"],
            target_id="owner",
            amount=cleaned["value"],
            direction="inflow"
        )
        neo4j_client.recalculate_value(cleaned["node_id"])
        
        return {
            "received": True,
            "action": "inflow_created",
            "node_id": cleaned["node_id"],
            "amount": cleaned["value"],
            "topic": topic
        }
    
    elif topic in ["orders/cancelled", "refunds/create"]:
        # Outflow: 취소/환불
        neo4j_client.create_motion(
            source_id="owner",
            target_id=cleaned["node_id"],
            amount=cleaned["value"],
            direction="outflow"
        )
        neo4j_client.recalculate_value(cleaned["node_id"])
        
        return {
            "received": True,
            "action": "outflow_created",
            "node_id": cleaned["node_id"],
            "amount": cleaned["value"],
            "topic": topic
        }
    
    elif topic == "customers/create":
        # 노드 생성
        neo4j_client.upsert_node(cleaned["node_id"], "shopify")
        
        return {
            "received": True,
            "action": "node_created",
            "node_id": cleaned["node_id"]
        }
    
    return {"received": True, "action": "ignored", "topic": topic}









