import yaml
import os

ROLES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../config/roles.yaml'))

class RBAC:
    def __init__(self):
        with open(ROLES_PATH, encoding='utf-8') as f:
            self.roles = yaml.safe_load(f)['roles']

    def has_permission(self, user_role, permission):
        return permission in self.roles.get(user_role, [])

# 샘플 사용자 DB (실제 환경에서는 DB/암호화 필요)
USERS = {
    'admin': {'password': 'adminpw', 'role': 'admin', '2fa': '123456'},
    'auditor': {'password': 'auditpw', 'role': 'auditor', '2fa': '654321'},
    'user': {'password': 'userpw', 'role': 'user', '2fa': '111111'},
}

def authenticate(username, password, otp=None):
    user = USERS.get(username)
    if not user or user['password'] != password:
        return False
    if otp and user.get('2fa') and user['2fa'] != otp:
        return False
    return user['role']
