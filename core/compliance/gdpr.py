import logging
from core.utils.privacy import mask_pii

class GDPRCompliance:
    """GDPR/개인정보보호 자동화 체크 및 마스킹 지원"""
    def __init__(self):
        self.logger = logging.getLogger("gdpr")

    def check_minimal_collection(self, data):
        # 최소 수집 원칙: 불필요한 필드 경고
        required = {k: v for k, v in data.items() if v}
        if len(required) < len(data):
            self.logger.warning("[GDPR] 불필요한 개인정보 수집 감지: %s", set(data) - set(required))
        return required

    def mask_all_pii(self, data):
        # dict 내 모든 값 마스킹
        return {k: mask_pii(str(v)) for k, v in data.items()}

    def log_access(self, user, action, field):
        self.logger.info(f"[GDPR] {user} {action} {field}")
