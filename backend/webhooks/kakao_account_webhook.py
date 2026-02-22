"""
카카오 계정 상태 변경 웹훅 수신기

- User Unlinked (연결 해제): 사용자 개인정보 처리 누락 리스크 차단
- MVP: 200 OK 수신 성공 + payload 로그 저장
- 2단계: Secret 검증, DB 저장, 이벤트 분기
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("autus.webhooks.kakao")

router = APIRouter(prefix="/api/webhook/kakao", tags=["Kakao Account Webhook"])

# MVP: payload 로그 저장 경로 (2단계에서 DB로 전환)
WEBHOOK_LOG_DIR = Path(__file__).resolve().parents[2] / "autus_data" / "kakao_webhook"
WEBHOOK_LOG_DIR.mkdir(parents=True, exist_ok=True)


@router.post("")
async def kakao_account_webhook(request: Request) -> JSONResponse:
    """
    카카오 계정 상태 변경 웹훅 수신.

    - User Unlinked, User Linked 등
    - 즉시 200 OK (타임아웃/유실 방지)
    - payload 로그 저장 (MVP)
    """
    try:
        content_type = request.headers.get("content-type", "")

        if "application/json" in content_type:
            payload = await request.json()
        elif "application/secevent+jwt" in content_type or "application/jwt" in content_type:
            body = await request.body()
            payload = {"_raw": body.decode("utf-8", errors="replace"), "_format": "jwt"}
        else:
            body = await request.body()
            try:
                payload = json.loads(body.decode("utf-8", errors="replace"))
            except json.JSONDecodeError:
                payload = {"_raw": body.decode("utf-8", errors="replace")[:1000]}

        # 로그 출력
        logger.info("KAKAO_WEBHOOK_PAYLOAD: %s", payload)

        # MVP: 파일에 저장 (감사 추적)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        log_file = WEBHOOK_LOG_DIR / f"webhook_{timestamp}.json"
        try:
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump(
                    {"received_at": datetime.utcnow().isoformat(), "payload": payload},
                    f,
                    ensure_ascii=False,
                    indent=2,
                )
        except OSError as e:
            logger.warning("Failed to write webhook log file: %s", e)

        return JSONResponse({"ok": True, "received": True})

    except Exception as e:
        logger.exception("Kakao webhook error: %s", e)
        # 카카오 재시도 방지를 위해 200 반환 (MVP)
        return JSONResponse({"ok": False, "error": str(e)}, status_code=200)
