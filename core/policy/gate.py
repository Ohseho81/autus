"""
Policy Gate - Raw 저장 차단, 허용 필드만 통과
"""
from typing import Dict, Any, Set
import json

ALLOWED_FIELDS: Set[str] = {
    "id", "value", "ts_norm", "conf", "shadow", "hash"
}

FORBIDDEN_FIELDS: Set[str] = {
    "raw", "original", "source", "password", "secret", "token"
}

class PolicyGate:
    def __init__(self):
        self.ttl_rules = {"default": 86400}  # 24시간
    
    def check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """정책 검사 - Raw 저장 시 예외 발생"""
        for key in data.keys():
            if key in FORBIDDEN_FIELDS:
                raise ValueError(f"POLICY VIOLATION: '{key}' field is forbidden")
            if key.startswith("raw_"):
                raise ValueError(f"POLICY VIOLATION: Raw data storage not allowed")
        return data
    
    def filter_allowed(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """허용 필드만 통과"""
        return {k: v for k, v in data.items() if k in ALLOWED_FIELDS}
    
    def enforce_ttl(self, data: Dict[str, Any], ttl_key: str = "default") -> Dict[str, Any]:
        """TTL 강제"""
        data["_ttl"] = self.ttl_rules.get(ttl_key, 86400)
        return data

gate = PolicyGate()
