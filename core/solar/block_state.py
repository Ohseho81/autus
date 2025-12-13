"""
Block State - 차단 상태 단일화
BLOCKED = (BOUNDARY OR GUARDRAIL) 단일 원인
"""
from enum import Enum
from dataclasses import dataclass
from typing import Optional

class BlockCause(str, Enum):
    NONE = "NONE"
    BOUNDARY = "BOUNDARY"
    GUARDRAIL = "GUARDRAIL"

class BlockCode(str, Enum):
    CLEAR = "CLEAR"
    # Boundary
    BND_VISA = "BND_VISA"
    BND_WORK_HOUR = "BND_WORK_HOUR"
    BND_ACADEMIC = "BND_ACADEMIC"
    BND_UNDEFINED = "BND_UNDEFINED"
    # Guardrail
    GRD_CRITICAL = "GRD_CRITICAL"
    GRD_DANGER = "GRD_DANGER"
    GRD_PRESSURE = "GRD_PRESSURE"

class BlockLevel(str, Enum):
    NONE = "NONE"
    SAFE_HOLD = "SAFE_HOLD"
    HARD_BLOCK = "HARD_BLOCK"

@dataclass
class BlockState:
    """차단 상태 (단일 원인)"""
    level: BlockLevel = BlockLevel.NONE
    cause: BlockCause = BlockCause.NONE
    code: BlockCode = BlockCode.CLEAR
    reason: str = ""
    unblock_condition: str = ""
    
    @property
    def is_blocked(self) -> bool:
        return self.level != BlockLevel.NONE
    
    def block_by_boundary(self, code: BlockCode, reason: str, unblock: str):
        """Boundary 차단"""
        self.level = BlockLevel.SAFE_HOLD
        self.cause = BlockCause.BOUNDARY
        self.code = code
        self.reason = reason
        self.unblock_condition = unblock
    
    def block_by_guardrail(self, code: BlockCode, reason: str, unblock: str):
        """Guardrail 차단"""
        self.level = BlockLevel.HARD_BLOCK
        self.cause = BlockCause.GUARDRAIL
        self.code = code
        self.reason = reason
        self.unblock_condition = unblock
    
    def unblock(self):
        """해제"""
        self.level = BlockLevel.NONE
        self.cause = BlockCause.NONE
        self.code = BlockCode.CLEAR
        self.reason = ""
        self.unblock_condition = ""
    
    def to_log(self) -> str:
        """로그용 단일 메시지"""
        if not self.is_blocked:
            return "OPERATIONAL"
        return f"{self.cause.value}:{self.code.value} - {self.reason}"
