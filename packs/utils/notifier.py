from jinja2 import Environment, FileSystemLoader
import datetime
import os

class Notifier:
    def __init__(self, template_dir="templates") -> None:
        self.env = Environment(loader=FileSystemLoader(template_dir))

    def render(self, template_name, context):
        template = self.env.get_template(template_name)
        return template.render(**context)

    def send_email(self, to, subject, body):
        # 실제 이메일 발송 대신 콘솔 출력 (샘플)
        print(f"[EMAIL] To: {to}\nSubject: {subject}\n{body}")

    def notify(self, user_name, alert_type, alert_detail):
        context = {
            "user_name": user_name,
            "alert_type": alert_type,
            "alert_detail": alert_detail,
            "timestamp": datetime.datetime.now().isoformat()
        }
        body = self.render("alert_email.j2", context)
        self.send_email(to=f"{user_name}@example.com", subject=f"[AUTUS] {alert_type} 알림", body=body)

global_notifier = Notifier()
