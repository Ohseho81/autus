"""
AUTUS Role 정의
===============

내부 역할 (Control Roles):
- EXECUTOR: 실행 품질 책임, 자동화 높음
- OPERATOR: 흐름 안정 책임, 조율/배치 권한
- DECIDER: 비가역 결과 100% 책임, 승인/보류/거부 권한
"""

from enum import Enum


class Role(str, Enum):
    EXECUTOR = "executor"
    OPERATOR = "operator"
    DECIDER = "decider"
