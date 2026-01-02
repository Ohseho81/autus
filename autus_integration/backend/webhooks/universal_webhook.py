"""
Universal Webhook Handler
SaaS 자동 감지 + Zero Meaning 정제
"""

from fastapi import APIRouter, Request, Header
from typing import Optional, Dict, Any

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()


def detect_source(headers: Dict, body: Dict) -> str:
    """
    요청 소스 자동 감지
    
    감지 순서:
    1. 헤더 기반 (서명)
    2. 페이로드 구조 기반
    """
    # 헤더 기반 감지
    if headers.get("stripe-signature"):
        return "stripe"
    if headers.get("x-shopify-hmac-sha256"):
        return "shopify"
    if headers.get("x-quickbooks-signature"):
        return "quickbooks"
    if headers.get("x-toss-signature"):
        return "toss"
    
    # 페이로드 구조 기반 감지
    if body.get("livemode") is not None or body.get("type", "").startswith("payment"):
        return "stripe"
    if body.get("admin_graphql_api_id"):
        return "shopify"
    if body.get("realmId"):
        return "quickbooks"
    if body.get("paymentKey") or body.get("orderId"):
        return "toss"
    
    return "unknown"


def detect_flow_type(body: Dict) -> str:
    """
    이벤트 타입 → 흐름 타입
    """
    event = (
        body.get("type", "") or 
        body.get("topic", "") or 
        body.get("eventType", "")
    ).lower()
    
    # Outflow 키워드
    if any(kw in event for kw in ["refund", "cancel", "dispute", "chargeback"]):
        return "outflow"
    
    # Inflow 키워드
    if any(kw in event for kw in ["succeeded", "paid", "create", "complete", "done"]):
        return "inflow"
    
    # 기본값
    return "inflow"


@router.post("/universal")
async def universal_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    x_shopify_hmac_sha256: Optional[str] = Header(None),
    x_quickbooks_signature: Optional[str] = Header(None)
):
    """
    범용 Webhook 엔드포인트
    
    모든 SaaS Webhook을 하나의 엔드포인트로 처리
    자동 감지 → Zero Meaning → 노드/모션 생성
    """
    import json
    payload = await request.body()
    body = json.loads(payload)
    
    # 헤더 수집
    headers = {
        "stripe-signature": stripe_signature,
        "x-shopify-hmac-sha256": x_shopify_hmac_sha256,
        "x-quickbooks-signature": x_quickbooks_signature
    }
    
    # 소스 자동 감지
    source = detect_source(headers, body)
    
    # 흐름 타입 감지
    flow_type = detect_flow_type(body)
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_universal(body, source)
    
    if not cleaned.get("node_id"):
        return {
            "received": True,
            "action": "skipped",
            "reason": "no_node_id",
            "detected_source": source
        }
    
    # 노드 생성/업데이트
    neo4j_client.upsert_node(cleaned["node_id"], source)
    
    # 모션 생성
    if flow_type == "inflow":
        neo4j_client.create_motion(
            source_id=cleaned["node_id"],
            target_id="owner",
            amount=cleaned["value"],
            direction="inflow"
        )
    else:
        neo4j_client.create_motion(
            source_id="owner",
            target_id=cleaned["node_id"],
            amount=cleaned["value"],
            direction="outflow"
        )
    
    # 가치 재계산
    neo4j_client.recalculate_value(cleaned["node_id"])
    
    return {
        "received": True,
        "action": f"{flow_type}_created",
        "node_id": cleaned["node_id"],
        "amount": cleaned["value"],
        "detected_source": source,
        "flow_type": flow_type
    }



"""
Universal Webhook Handler
SaaS 자동 감지 + Zero Meaning 정제
"""

from fastapi import APIRouter, Request, Header
from typing import Optional, Dict, Any

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()


def detect_source(headers: Dict, body: Dict) -> str:
    """
    요청 소스 자동 감지
    
    감지 순서:
    1. 헤더 기반 (서명)
    2. 페이로드 구조 기반
    """
    # 헤더 기반 감지
    if headers.get("stripe-signature"):
        return "stripe"
    if headers.get("x-shopify-hmac-sha256"):
        return "shopify"
    if headers.get("x-quickbooks-signature"):
        return "quickbooks"
    if headers.get("x-toss-signature"):
        return "toss"
    
    # 페이로드 구조 기반 감지
    if body.get("livemode") is not None or body.get("type", "").startswith("payment"):
        return "stripe"
    if body.get("admin_graphql_api_id"):
        return "shopify"
    if body.get("realmId"):
        return "quickbooks"
    if body.get("paymentKey") or body.get("orderId"):
        return "toss"
    
    return "unknown"


def detect_flow_type(body: Dict) -> str:
    """
    이벤트 타입 → 흐름 타입
    """
    event = (
        body.get("type", "") or 
        body.get("topic", "") or 
        body.get("eventType", "")
    ).lower()
    
    # Outflow 키워드
    if any(kw in event for kw in ["refund", "cancel", "dispute", "chargeback"]):
        return "outflow"
    
    # Inflow 키워드
    if any(kw in event for kw in ["succeeded", "paid", "create", "complete", "done"]):
        return "inflow"
    
    # 기본값
    return "inflow"


@router.post("/universal")
async def universal_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    x_shopify_hmac_sha256: Optional[str] = Header(None),
    x_quickbooks_signature: Optional[str] = Header(None)
):
    """
    범용 Webhook 엔드포인트
    
    모든 SaaS Webhook을 하나의 엔드포인트로 처리
    자동 감지 → Zero Meaning → 노드/모션 생성
    """
    import json
    payload = await request.body()
    body = json.loads(payload)
    
    # 헤더 수집
    headers = {
        "stripe-signature": stripe_signature,
        "x-shopify-hmac-sha256": x_shopify_hmac_sha256,
        "x-quickbooks-signature": x_quickbooks_signature
    }
    
    # 소스 자동 감지
    source = detect_source(headers, body)
    
    # 흐름 타입 감지
    flow_type = detect_flow_type(body)
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_universal(body, source)
    
    if not cleaned.get("node_id"):
        return {
            "received": True,
            "action": "skipped",
            "reason": "no_node_id",
            "detected_source": source
        }
    
    # 노드 생성/업데이트
    neo4j_client.upsert_node(cleaned["node_id"], source)
    
    # 모션 생성
    if flow_type == "inflow":
        neo4j_client.create_motion(
            source_id=cleaned["node_id"],
            target_id="owner",
            amount=cleaned["value"],
            direction="inflow"
        )
    else:
        neo4j_client.create_motion(
            source_id="owner",
            target_id=cleaned["node_id"],
            amount=cleaned["value"],
            direction="outflow"
        )
    
    # 가치 재계산
    neo4j_client.recalculate_value(cleaned["node_id"])
    
    return {
        "received": True,
        "action": f"{flow_type}_created",
        "node_id": cleaned["node_id"],
        "amount": cleaned["value"],
        "detected_source": source,
        "flow_type": flow_type
    }








