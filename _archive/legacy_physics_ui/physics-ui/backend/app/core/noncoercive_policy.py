"""
Non-coercive Alignment Policy Gate
- validate_noncoercive_payload: payload 검증
- 금지: 추천/지시/보상/순위/진단/치료/위협/설명 구조
- 금지: name/entity_type/amount/currency/from/to/edges/links 필드
"""

from typing import Any


class NonCoercivePolicyError(Exception):
    """Policy violation error"""
    pass


# 금지 키 목록
BANNED_KEYS = frozenset([
    "name", "entity_name", "entity_type", "type_name",
    "amount", "currency", "money", "cost", "price",
    "from", "to", "source", "target", "origin_name", "dest_name",
    "edges", "links", "connections", "relationships",
    "reason", "explanation", "description", "narrative",
    "recommendation", "advice", "suggestion", "instruction",
    "reward", "penalty", "score", "rank", "ranking",
    "diagnosis", "treatment", "prescription",
    "warning", "threat", "alert_message",
    "category_name", "tag_name",
])

# 금지 텍스트 패턴 (값에서 검사)
BANNED_TEXT_PATTERNS = [
    "you should", "you must", "i recommend", "i suggest",
    "this is good", "this is bad", "danger", "warning:",
    "because", "therefore", "thus", "hence",
]


def _check_dict(d: dict, path: str = "") -> None:
    """Recursively check dict for banned keys and patterns"""
    for key, value in d.items():
        current_path = f"{path}.{key}" if path else key
        
        # Check key
        key_lower = key.lower()
        if key_lower in BANNED_KEYS:
            raise NonCoercivePolicyError(
                f"Banned key '{key}' at path '{current_path}'"
            )
        
        # Check value
        if isinstance(value, str):
            value_lower = value.lower()
            for pattern in BANNED_TEXT_PATTERNS:
                if pattern in value_lower:
                    raise NonCoercivePolicyError(
                        f"Banned text pattern '{pattern}' in value at '{current_path}'"
                    )
        elif isinstance(value, dict):
            _check_dict(value, current_path)
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    _check_dict(item, f"{current_path}[{i}]")
                elif isinstance(item, str):
                    item_lower = item.lower()
                    for pattern in BANNED_TEXT_PATTERNS:
                        if pattern in item_lower:
                            raise NonCoercivePolicyError(
                                f"Banned text pattern '{pattern}' in list at '{current_path}[{i}]'"
                            )


def validate_noncoercive_payload(payload: dict) -> None:
    """
    Validate payload against non-coercive policy.
    Raises NonCoercivePolicyError if violation found.
    """
    _check_dict(payload)
