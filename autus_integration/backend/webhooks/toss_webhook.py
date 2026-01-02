"""
토스페이먼츠 Webhook Handler
가상계좌 입금 처리 (수수료 0%)
"""

from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
import os

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()

TOSS_SECRET_KEY = os.getenv("TOSS_SECRET_KEY", "")


@router.post("/toss")
async def toss_webhook(request: Request):
    """
    토스페이먼츠 Webhook 처리 (수수료 0%)
    
    지원 이벤트:
    - 가상계좌 입금 완료 (DONE)
    - 결제 성공
    - 환불
    
    수수료 절약:
    - 카드 3% → 가상계좌 0%
    - 월 1억 기준: 연 3,600만원 절약
    """
    import json
    payload = await request.body()
    data = json.loads(payload)
    
    # 상태 확인
    status = data.get("status", "")
    
    if status != "DONE":
        return {
            "received": True,
            "action": "skipped",
            "reason": f"status_not_done: {status}"
        }
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_toss(data)
    
    if not cleaned.get("node_id"):
        return {"received": True, "action": "skipped", "reason": "no_node_id"}
    
    # 수수료 계산 (절약액)
    amount = cleaned["value"]
    card_fee = amount * 0.03  # 카드 수수료 3%
    actual_fee = 0  # 가상계좌 수수료 0%
    fee_saved = card_fee - actual_fee
    
    # 노드 생성/업데이트
    neo4j_client.upsert_node(cleaned["node_id"], "toss_va")
    
    # Inflow 모션 생성 (수수료 0%)
    neo4j_client.create_motion(
        source_id=cleaned["node_id"],
        target_id="owner",
        amount=amount,
        direction="inflow",
        fee=0  # 수수료 0%!
    )
    
    # 가치 재계산
    neo4j_client.recalculate_value(cleaned["node_id"])
    
    return {
        "received": True,
        "action": "inflow_created",
        "node_id": cleaned["node_id"],
        "amount": amount,
        "method": "virtual_account",
        "fee": 0,
        "fee_saved": fee_saved,
        "message": f"₩{int(fee_saved):,} 절약 (카드 대비)"
    }


@router.post("/toss/card")
async def toss_card_webhook(request: Request):
    """
    토스 카드 결제 (수수료 있음 - 참고용)
    가상계좌 사용 권장
    """
    import json
    payload = await request.body()
    data = json.loads(payload)
    
    if data.get("status") != "DONE":
        return {"received": True, "action": "skipped"}
    
    cleaned = zero_meaning.cleanse_toss(data)
    amount = cleaned["value"]
    
    # 카드 수수료
    card_fee = amount * 0.025  # 토스 카드 수수료 2.5%
    
    neo4j_client.upsert_node(cleaned["node_id"], "toss_card")
    neo4j_client.create_motion(
        source_id=cleaned["node_id"],
        target_id="owner",
        amount=amount,
        direction="inflow",
        fee=card_fee
    )
    neo4j_client.recalculate_value(cleaned["node_id"])
    
    return {
        "received": True,
        "action": "inflow_created",
        "node_id": cleaned["node_id"],
        "amount": amount,
        "method": "card",
        "fee": card_fee,
        "recommendation": "가상계좌 사용 시 수수료 0%!"
    }



"""
토스페이먼츠 Webhook Handler
가상계좌 입금 처리 (수수료 0%)
"""

from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
import os

from integrations.zero_meaning import ZeroMeaning
from integrations.neo4j_client import neo4j_client

router = APIRouter()
zero_meaning = ZeroMeaning()

TOSS_SECRET_KEY = os.getenv("TOSS_SECRET_KEY", "")


@router.post("/toss")
async def toss_webhook(request: Request):
    """
    토스페이먼츠 Webhook 처리 (수수료 0%)
    
    지원 이벤트:
    - 가상계좌 입금 완료 (DONE)
    - 결제 성공
    - 환불
    
    수수료 절약:
    - 카드 3% → 가상계좌 0%
    - 월 1억 기준: 연 3,600만원 절약
    """
    import json
    payload = await request.body()
    data = json.loads(payload)
    
    # 상태 확인
    status = data.get("status", "")
    
    if status != "DONE":
        return {
            "received": True,
            "action": "skipped",
            "reason": f"status_not_done: {status}"
        }
    
    # Zero Meaning 정제
    cleaned = zero_meaning.cleanse_toss(data)
    
    if not cleaned.get("node_id"):
        return {"received": True, "action": "skipped", "reason": "no_node_id"}
    
    # 수수료 계산 (절약액)
    amount = cleaned["value"]
    card_fee = amount * 0.03  # 카드 수수료 3%
    actual_fee = 0  # 가상계좌 수수료 0%
    fee_saved = card_fee - actual_fee
    
    # 노드 생성/업데이트
    neo4j_client.upsert_node(cleaned["node_id"], "toss_va")
    
    # Inflow 모션 생성 (수수료 0%)
    neo4j_client.create_motion(
        source_id=cleaned["node_id"],
        target_id="owner",
        amount=amount,
        direction="inflow",
        fee=0  # 수수료 0%!
    )
    
    # 가치 재계산
    neo4j_client.recalculate_value(cleaned["node_id"])
    
    return {
        "received": True,
        "action": "inflow_created",
        "node_id": cleaned["node_id"],
        "amount": amount,
        "method": "virtual_account",
        "fee": 0,
        "fee_saved": fee_saved,
        "message": f"₩{int(fee_saved):,} 절약 (카드 대비)"
    }


@router.post("/toss/card")
async def toss_card_webhook(request: Request):
    """
    토스 카드 결제 (수수료 있음 - 참고용)
    가상계좌 사용 권장
    """
    import json
    payload = await request.body()
    data = json.loads(payload)
    
    if data.get("status") != "DONE":
        return {"received": True, "action": "skipped"}
    
    cleaned = zero_meaning.cleanse_toss(data)
    amount = cleaned["value"]
    
    # 카드 수수료
    card_fee = amount * 0.025  # 토스 카드 수수료 2.5%
    
    neo4j_client.upsert_node(cleaned["node_id"], "toss_card")
    neo4j_client.create_motion(
        source_id=cleaned["node_id"],
        target_id="owner",
        amount=amount,
        direction="inflow",
        fee=card_fee
    )
    neo4j_client.recalculate_value(cleaned["node_id"])
    
    return {
        "received": True,
        "action": "inflow_created",
        "node_id": cleaned["node_id"],
        "amount": amount,
        "method": "card",
        "fee": card_fee,
        "recommendation": "가상계좌 사용 시 수수료 0%!"
    }









