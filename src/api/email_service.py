import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
import os

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@autus-ai.com")
        self.enabled = bool(self.smtp_user and self.smtp_pass)

    def send(self, to: str, subject: str, body: str, html: bool = False) -> dict:
        if not self.enabled:
            return {"status": "disabled", "message": "SMTP not configured"}
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to
            
            content_type = "html" if html else "plain"
            msg.attach(MIMEText(body, content_type))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.sendmail(self.from_email, to, msg.as_string())
            
            return {"status": "sent", "to": to}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def send_alert(self, to: str, title: str, message: str) -> dict:
        html = f"""
        <html>
        <body style="font-family: Arial; padding: 20px;">
            <h2 style="color: #00d9ff;">🚨 AUTUS Alert</h2>
            <h3>{title}</h3>
            <p>{message}</p>
            <hr>
            <small>AUTUS - autus-ai.com</small>
        </body>
        </html>
        """
        return self.send(to, f"[AUTUS] {title}", html, html=True)

    def send_notification(self, to: str, event: str, data: dict) -> dict:
        html = f"""
        <html>
        <body style="font-family: Arial; padding: 20px;">
            <h2 style="color: #00d9ff;">📬 AUTUS Notification</h2>
            <p><strong>Event:</strong> {event}</p>
            <pre>{data}</pre>
            <hr>
            <small>AUTUS - autus-ai.com</small>
        </body>
        </html>
        """
        return self.send(to, f"[AUTUS] {event}", html, html=True)

email_service = EmailService()
