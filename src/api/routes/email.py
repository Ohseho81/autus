from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from api.email_service import email_service

router = APIRouter(prefix="/email", tags=["email"])

class EmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    html: bool = False

class AlertRequest(BaseModel):
    to: str
    title: str
    message: str

@router.post("/send")
async def send_email(data: EmailRequest):
    return email_service.send(data.to, data.subject, data.body, data.html)

@router.post("/alert")
async def send_alert(data: AlertRequest):
    return email_service.send_alert(data.to, data.title, data.message)

@router.get("/status")
async def email_status():
    return {"enabled": email_service.enabled}
