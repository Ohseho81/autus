"""
Motion Taxonomy v0.1 - 표준 동작 정의서
========================================
아우투스가 처리할 10대 핵심 동작
이 동작 ID는 시스템의 모든 라우팅과 로그의 기준
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Any

class MotionType(str, Enum):
    """10대 핵심 동작 타입"""
    M01_REPORT = "M01"      # 보고
    M02_SEND = "M02"        # 송부
    M03_DRAFT = "M03"       # 기안
    M04_SPEND = "M04"       # 지출
    M05_CONTRACT = "M05"    # 계약
    M06_NOTIFY = "M06"      # 공문
    M07_HR = "M07"          # 인사
    M08_BUY = "M08"         # 구매
    M09_EDIT_DATA = "M09"   # 수정
    M10_AUTH = "M10"        # 위임

@dataclass
class MotionDefinition:
    """동작 정의"""
    motion_id: str
    name_ko: str
    name_en: str
    description: str
    required_inputs: List[str]
    proof_pack_output: str
    risk_level: int  # 1-5

# 동작 레지스트리
MOTION_REGISTRY: Dict[str, MotionDefinition] = {
    "M01": MotionDefinition(
        motion_id="M01",
        name_ko="보고",
        name_en="REPORT",
        description="상급자에게 정보/현황 보고",
        required_inputs=["summary", "raw_data"],
        proof_pack_output="View_Log",
        risk_level=1
    ),
    "M02": MotionDefinition(
        motion_id="M02",
        name_ko="송부",
        name_en="SEND",
        description="외부 조직에 문서/파일 발송",
        required_inputs=["recipient", "document"],
        proof_pack_output="Transmission_Receipt",
        risk_level=2
    ),
    "M03": MotionDefinition(
        motion_id="M03",
        name_ko="기안",
        name_en="DRAFT",
        description="승인 프로세스 시작 (결재 상신)",
        required_inputs=["draft_document", "supporting_docs"],
        proof_pack_output="Approval_Chain_Log",
        risk_level=3
    ),
    "M04": MotionDefinition(
        motion_id="M04",
        name_ko="지출",
        name_en="SPEND",
        description="자금 집행 및 비용 청구",
        required_inputs=["receipt", "purpose"],
        proof_pack_output="Ledger_Transaction",
        risk_level=4
    ),
    "M05": MotionDefinition(
        motion_id="M05",
        name_ko="계약",
        name_en="CONTRACT",
        description="법적 구속력 생성 (서명)",
        required_inputs=["contract_draft", "counterparty_info"],
        proof_pack_output="Signed_Contract_PDF",
        risk_level=5
    ),
    "M06": MotionDefinition(
        motion_id="M06",
        name_ko="공문",
        name_en="NOTIFY",
        description="다수에게 공식 알림/공고",
        required_inputs=["recipient_list", "notice_content"],
        proof_pack_output="Distribution_List",
        risk_level=2
    ),
    "M07": MotionDefinition(
        motion_id="M07",
        name_ko="인사",
        name_en="HR",
        description="채용, 평가, 근태, 발령",
        required_inputs=["evaluation_form", "attendance_record"],
        proof_pack_output="HR_Action_Record",
        risk_level=4
    ),
    "M08": MotionDefinition(
        motion_id="M08",
        name_ko="구매",
        name_en="BUY",
        description="물품/서비스 조달 요청",
        required_inputs=["quote", "item_list"],
        proof_pack_output="Purchase_Order",
        risk_level=3
    ),
    "M09": MotionDefinition(
        motion_id="M09",
        name_ko="수정",
        name_en="EDIT_DATA",
        description="DB나 중요 기록 변경",
        required_inputs=["before_value", "after_value", "reason"],
        proof_pack_output="Change_Audit_Log",
        risk_level=4
    ),
    "M10": MotionDefinition(
        motion_id="M10",
        name_ko="위임",
        name_en="AUTH",
        description="내 권한을 타인에게 부여",
        required_inputs=["delegation_period", "delegate_entity"],
        proof_pack_output="Mandate_Certificate",
        risk_level=5
    ),
}

def get_motion(motion_id: str) -> MotionDefinition:
    """동작 정의 조회"""
    return MOTION_REGISTRY.get(motion_id)

def validate_inputs(motion_id: str, inputs: Dict[str, Any]) -> tuple[bool, List[str]]:
    """필수 입력 검증"""
    motion = MOTION_REGISTRY.get(motion_id)
    if not motion:
        return False, [f"Unknown motion: {motion_id}"]
    
    missing = []
    for required in motion.required_inputs:
        if required not in inputs or not inputs[required]:
            missing.append(required)
    
    return len(missing) == 0, missing
