"""
Stripe Webhook Handler
결제/환불/구독 이벤트 처리
"""

from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
import stripe
import os

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()

# Stripe 설정
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """
    Stripe Webhook 처리
    
    지원 이벤트:
    - payment_intent.succeeded → inflow
    - charge.refunded → outflow
    - customer.created → node_create
    - invoice.paid → inflow (구독)
    """
    payload = await request.body()
    
    # 서명 검증 (프로덕션)
    if WEBHOOK_SECRET and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # 개발 환경
        import json
        event = json.loads(payload)
    
    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_stripe(data_object, event_type)
    
    if not cleaned.get("node_id"):
        return {"received": True, "action": "skipped", "reason": "no_node_id"}
    
    # 이벤트 타입별 처리
    if event_type in ["payment_intent.succeeded", "invoice.paid"]:
        # Inflow: 결제 성공
        neo4j_client.upsert_node(cleaned["node_id"], "stripe")
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
            "amount": cleaned["value"]
        }
    
    elif event_type in ["charge.refunded", "charge.dispute.created"]:
        # Outflow: 환불/분쟁
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
            "amount": cleaned["value"]
        }
    
    elif event_type == "customer.created":
        # 노드 생성만
        neo4j_client.upsert_node(cleaned["node_id"], "stripe")
        
        return {
            "received": True,
            "action": "node_created",
            "node_id": cleaned["node_id"]
        }
    
    return {"received": True, "action": "ignored", "event_type": event_type}



"""
Stripe Webhook Handler
결제/환불/구독 이벤트 처리
"""

from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
import stripe
import os

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()

# Stripe 설정
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    """
    Stripe Webhook 처리
    
    지원 이벤트:
    - payment_intent.succeeded → inflow
    - charge.refunded → outflow
    - customer.created → node_create
    - invoice.paid → inflow (구독)
    """
    payload = await request.body()
    
    # 서명 검증 (프로덕션)
    if WEBHOOK_SECRET and stripe_signature:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # 개발 환경
        import json
        event = json.loads(payload)
    
    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_stripe(data_object, event_type)
    
    if not cleaned.get("node_id"):
        return {"received": True, "action": "skipped", "reason": "no_node_id"}
    
    # 이벤트 타입별 처리
    if event_type in ["payment_intent.succeeded", "invoice.paid"]:
        # Inflow: 결제 성공
        neo4j_client.upsert_node(cleaned["node_id"], "stripe")
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
            "amount": cleaned["value"]
        }
    
    elif event_type in ["charge.refunded", "charge.dispute.created"]:
        # Outflow: 환불/분쟁
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
            "amount": cleaned["value"]
        }
    
    elif event_type == "customer.created":
        # 노드 생성만
        neo4j_client.upsert_node(cleaned["node_id"], "stripe")
        
        return {
            "received": True,
            "action": "node_created",
            "node_id": cleaned["node_id"]
        }
    
    return {"received": True, "action": "ignored", "event_type": event_type}








