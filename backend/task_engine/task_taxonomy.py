"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 업무 분류 체계 (5차 분류 + 글로벌 표준)
Task Taxonomy System with 5-Level Classification
═══════════════════════════════════════════════════════════════════════════════

분류 체계:
  L1: 대분류 (Domain)           - 8개
  L2: 중분류 (Category)         - 32개
  L3: 소분류 (Subcategory)      - 128개
  L4: 세분류 (Task Type)        - 512개
  L5: 상세분류 (Variant)        - 2048개

글로벌 표준 매핑:
  - ISIC (국제표준산업분류)
  - ISCO (국제표준직업분류)
  - APQC Process Framework
  - ITIL / COBIT
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from pydantic import BaseModel, Field
import json

# ═══════════════════════════════════════════════════════════════════════════════
# L1: 대분류 (8개 도메인)
# ═══════════════════════════════════════════════════════════════════════════════

class TaskDomain(str, Enum):
    """L1 대분류 - 8개 도메인"""
    FINANCE = "FINANCE"           # 재무/회계
    HR = "HR"                     # 인사/노무
    SALES = "SALES"               # 영업/고객
    OPERATIONS = "OPERATIONS"     # 운영/생산
    IT = "IT"                     # IT/기술
    LEGAL = "LEGAL"               # 법무/컴플라이언스
    STRATEGY = "STRATEGY"         # 전략/기획
    ADMIN = "ADMIN"               # 총무/행정


# ═══════════════════════════════════════════════════════════════════════════════
# 5차 분류 체계 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TaxonomyNode:
    """분류 노드"""
    code: str                     # 분류 코드
    level: int                    # 1-5
    name_ko: str
    name_en: str
    description: str = ""
    
    parent_code: Optional[str] = None
    children: List[str] = field(default_factory=list)
    
    # 글로벌 표준 매핑
    isic_code: Optional[str] = None      # 국제표준산업분류
    isco_code: Optional[str] = None      # 국제표준직업분류
    apqc_code: Optional[str] = None      # APQC 프로세스 프레임워크
    
    # K/I/r 기본값
    default_k: float = 1.0
    default_i: float = 0.0
    default_r: float = 0.0
    
    # 메타데이터
    automation_potential: int = 50       # 자동화 가능성 (0-100)
    complexity: int = 3                  # 복잡도 (1-5)
    frequency: str = "monthly"           # daily, weekly, monthly, quarterly, yearly, ad-hoc


# ═══════════════════════════════════════════════════════════════════════════════
# 5차 분류 전체 정의
# ═══════════════════════════════════════════════════════════════════════════════

TAXONOMY_5LEVEL: Dict[str, TaxonomyNode] = {
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: FINANCE (재무/회계)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "FIN": TaxonomyNode(
        code="FIN", level=1, name_ko="재무/회계", name_en="Finance & Accounting",
        description="재무, 회계, 세무, 자금관리 전반",
        isic_code="K64", apqc_code="9.0",
        children=["FIN.AR", "FIN.AP", "FIN.GL", "FIN.TAX"],
    ),
    
    # L2: 재무 - 수금
    "FIN.AR": TaxonomyNode(
        code="FIN.AR", level=2, name_ko="매출채권/수금", name_en="Accounts Receivable",
        parent_code="FIN", apqc_code="9.1",
        children=["FIN.AR.INV", "FIN.AR.COL", "FIN.AR.REC", "FIN.AR.DIS"],
    ),
    
    # L3: 송장 관리
    "FIN.AR.INV": TaxonomyNode(
        code="FIN.AR.INV", level=3, name_ko="송장 관리", name_en="Invoice Management",
        parent_code="FIN.AR", apqc_code="9.1.1",
        children=["FIN.AR.INV.GEN", "FIN.AR.INV.VAL", "FIN.AR.INV.SEND", "FIN.AR.INV.ARC"],
    ),
    
    # L4: 송장 생성
    "FIN.AR.INV.GEN": TaxonomyNode(
        code="FIN.AR.INV.GEN", level=4, name_ko="송장 생성", name_en="Invoice Generation",
        parent_code="FIN.AR.INV", apqc_code="9.1.1.1",
        automation_potential=90, complexity=2,
        children=["FIN.AR.INV.GEN.STD", "FIN.AR.INV.GEN.REC", "FIN.AR.INV.GEN.PRO", "FIN.AR.INV.GEN.CRD"],
    ),
    
    # L5: 표준 송장 생성
    "FIN.AR.INV.GEN.STD": TaxonomyNode(
        code="FIN.AR.INV.GEN.STD", level=5, name_ko="표준 송장 생성", name_en="Standard Invoice Generation",
        parent_code="FIN.AR.INV.GEN",
        default_k=1.1, default_i=0.0, default_r=0.0,
        automation_potential=95, complexity=1, frequency="daily",
    ),
    "FIN.AR.INV.GEN.REC": TaxonomyNode(
        code="FIN.AR.INV.GEN.REC", level=5, name_ko="정기 송장 생성", name_en="Recurring Invoice Generation",
        parent_code="FIN.AR.INV.GEN",
        default_k=1.2, default_i=0.0, default_r=0.0,
        automation_potential=98, complexity=1, frequency="monthly",
    ),
    "FIN.AR.INV.GEN.PRO": TaxonomyNode(
        code="FIN.AR.INV.GEN.PRO", level=5, name_ko="프로포마 송장", name_en="Proforma Invoice",
        parent_code="FIN.AR.INV.GEN",
        default_k=0.9, default_i=0.1, default_r=0.0,
        automation_potential=80, complexity=2, frequency="ad-hoc",
    ),
    "FIN.AR.INV.GEN.CRD": TaxonomyNode(
        code="FIN.AR.INV.GEN.CRD", level=5, name_ko="크레딧 노트", name_en="Credit Note",
        parent_code="FIN.AR.INV.GEN",
        default_k=0.8, default_i=0.2, default_r=0.0,
        automation_potential=75, complexity=3, frequency="ad-hoc",
    ),
    
    # L4: 송장 검증
    "FIN.AR.INV.VAL": TaxonomyNode(
        code="FIN.AR.INV.VAL", level=4, name_ko="송장 검증", name_en="Invoice Validation",
        parent_code="FIN.AR.INV", apqc_code="9.1.1.2",
        automation_potential=85, complexity=2,
        children=["FIN.AR.INV.VAL.AMT", "FIN.AR.INV.VAL.QTY", "FIN.AR.INV.VAL.TAX", "FIN.AR.INV.VAL.3WAY"],
    ),
    
    # L5: 검증 상세
    "FIN.AR.INV.VAL.AMT": TaxonomyNode(
        code="FIN.AR.INV.VAL.AMT", level=5, name_ko="금액 검증", name_en="Amount Validation",
        parent_code="FIN.AR.INV.VAL",
        automation_potential=95, complexity=1,
    ),
    "FIN.AR.INV.VAL.QTY": TaxonomyNode(
        code="FIN.AR.INV.VAL.QTY", level=5, name_ko="수량 검증", name_en="Quantity Validation",
        parent_code="FIN.AR.INV.VAL",
        automation_potential=90, complexity=2,
    ),
    "FIN.AR.INV.VAL.TAX": TaxonomyNode(
        code="FIN.AR.INV.VAL.TAX", level=5, name_ko="세금 검증", name_en="Tax Validation",
        parent_code="FIN.AR.INV.VAL",
        automation_potential=85, complexity=3,
    ),
    "FIN.AR.INV.VAL.3WAY": TaxonomyNode(
        code="FIN.AR.INV.VAL.3WAY", level=5, name_ko="3-Way 매칭", name_en="3-Way Matching",
        parent_code="FIN.AR.INV.VAL",
        automation_potential=80, complexity=3,
    ),
    
    # L3: 수금 관리
    "FIN.AR.COL": TaxonomyNode(
        code="FIN.AR.COL", level=3, name_ko="수금 관리", name_en="Collection Management",
        parent_code="FIN.AR", apqc_code="9.1.2",
        children=["FIN.AR.COL.REM", "FIN.AR.COL.ESC", "FIN.AR.COL.NEG", "FIN.AR.COL.WO"],
    ),
    
    # L2: 재무 - 지급
    "FIN.AP": TaxonomyNode(
        code="FIN.AP", level=2, name_ko="매입채무/지급", name_en="Accounts Payable",
        parent_code="FIN", apqc_code="9.2",
        children=["FIN.AP.PO", "FIN.AP.PAY", "FIN.AP.REC"],
    ),
    
    # L2: 재무 - 총계정원장
    "FIN.GL": TaxonomyNode(
        code="FIN.GL", level=2, name_ko="총계정원장", name_en="General Ledger",
        parent_code="FIN", apqc_code="9.3",
        children=["FIN.GL.JE", "FIN.GL.CLOSE", "FIN.GL.RPT"],
    ),
    
    # L2: 재무 - 세무
    "FIN.TAX": TaxonomyNode(
        code="FIN.TAX", level=2, name_ko="세무", name_en="Tax",
        parent_code="FIN", apqc_code="9.4",
        children=["FIN.TAX.VAT", "FIN.TAX.CORP", "FIN.TAX.INTL"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: HR (인사/노무)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "HR": TaxonomyNode(
        code="HR", level=1, name_ko="인사/노무", name_en="Human Resources",
        description="채용, 급여, 교육, 성과관리 전반",
        isic_code="N78", isco_code="1212", apqc_code="6.0",
        children=["HR.REC", "HR.PAY", "HR.DEV", "HR.PERF"],
    ),
    
    # L2: HR - 채용
    "HR.REC": TaxonomyNode(
        code="HR.REC", level=2, name_ko="채용", name_en="Recruitment",
        parent_code="HR", apqc_code="6.1",
        children=["HR.REC.JOB", "HR.REC.SCRN", "HR.REC.INT", "HR.REC.OFFER"],
    ),
    
    # L3: 공고 관리
    "HR.REC.JOB": TaxonomyNode(
        code="HR.REC.JOB", level=3, name_ko="공고 관리", name_en="Job Posting",
        parent_code="HR.REC",
        children=["HR.REC.JOB.CREATE", "HR.REC.JOB.POST", "HR.REC.JOB.CLOSE"],
    ),
    
    # L4/L5: 공고 상세
    "HR.REC.JOB.CREATE": TaxonomyNode(
        code="HR.REC.JOB.CREATE", level=4, name_ko="공고 생성", name_en="Job Creation",
        parent_code="HR.REC.JOB",
        children=["HR.REC.JOB.CREATE.INT", "HR.REC.JOB.CREATE.EXT", "HR.REC.JOB.CREATE.EXEC"],
    ),
    "HR.REC.JOB.CREATE.INT": TaxonomyNode(
        code="HR.REC.JOB.CREATE.INT", level=5, name_ko="내부 공고", name_en="Internal Posting",
        parent_code="HR.REC.JOB.CREATE",
        automation_potential=80, complexity=2,
    ),
    "HR.REC.JOB.CREATE.EXT": TaxonomyNode(
        code="HR.REC.JOB.CREATE.EXT", level=5, name_ko="외부 공고", name_en="External Posting",
        parent_code="HR.REC.JOB.CREATE",
        automation_potential=75, complexity=3,
    ),
    
    # L3: 스크리닝
    "HR.REC.SCRN": TaxonomyNode(
        code="HR.REC.SCRN", level=3, name_ko="서류 심사", name_en="Screening",
        parent_code="HR.REC",
        children=["HR.REC.SCRN.AUTO", "HR.REC.SCRN.MANUAL", "HR.REC.SCRN.AI"],
    ),
    
    # L2: HR - 급여
    "HR.PAY": TaxonomyNode(
        code="HR.PAY", level=2, name_ko="급여", name_en="Payroll",
        parent_code="HR", apqc_code="6.2",
        children=["HR.PAY.CALC", "HR.PAY.PROC", "HR.PAY.TAX"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: SALES (영업/고객)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "SALES": TaxonomyNode(
        code="SALES", level=1, name_ko="영업/고객", name_en="Sales & Customer",
        description="영업, 마케팅, 고객관리 전반",
        isic_code="G47", apqc_code="3.0",
        children=["SALES.LEAD", "SALES.OPP", "SALES.CLOSE", "SALES.CS"],
    ),
    
    # L2: 리드 관리
    "SALES.LEAD": TaxonomyNode(
        code="SALES.LEAD", level=2, name_ko="리드 관리", name_en="Lead Management",
        parent_code="SALES", apqc_code="3.1",
        children=["SALES.LEAD.GEN", "SALES.LEAD.QUAL", "SALES.LEAD.NURTURE"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: OPERATIONS (운영/생산)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "OPS": TaxonomyNode(
        code="OPS", level=1, name_ko="운영/생산", name_en="Operations",
        description="생산, 물류, 품질관리 전반",
        isic_code="C10-33", apqc_code="4.0",
        children=["OPS.PROD", "OPS.SUPPLY", "OPS.QC", "OPS.MAINT"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: IT (IT/기술)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "IT": TaxonomyNode(
        code="IT", level=1, name_ko="IT/기술", name_en="IT & Technology",
        description="시스템, 인프라, 개발, 보안 전반",
        isic_code="J62", apqc_code="7.0",
        children=["IT.DEV", "IT.INFRA", "IT.SEC", "IT.SUPPORT"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: LEGAL (법무/컴플라이언스)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "LEGAL": TaxonomyNode(
        code="LEGAL", level=1, name_ko="법무/컴플라이언스", name_en="Legal & Compliance",
        description="계약, 규제, 지적재산권 전반",
        isic_code="M69", apqc_code="11.0",
        children=["LEGAL.CONTRACT", "LEGAL.COMP", "LEGAL.IP", "LEGAL.DISPUTE"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: STRATEGY (전략/기획)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "STRAT": TaxonomyNode(
        code="STRAT", level=1, name_ko="전략/기획", name_en="Strategy & Planning",
        description="전략수립, 사업개발, M&A 전반",
        apqc_code="1.0",
        children=["STRAT.PLAN", "STRAT.BD", "STRAT.MA"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # L1: ADMIN (총무/행정)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "ADMIN": TaxonomyNode(
        code="ADMIN", level=1, name_ko="총무/행정", name_en="Administration",
        description="시설, 자산, 일반행정 전반",
        isic_code="N82", apqc_code="12.0",
        children=["ADMIN.FAC", "ADMIN.ASSET", "ADMIN.DOC"],
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 글로벌 표준 매핑
# ═══════════════════════════════════════════════════════════════════════════════

GLOBAL_STANDARDS = {
    "ISIC": {
        "name": "International Standard Industrial Classification",
        "version": "Rev.4",
        "organization": "United Nations",
        "description": "국제표준산업분류",
    },
    "ISCO": {
        "name": "International Standard Classification of Occupations",
        "version": "ISCO-08",
        "organization": "ILO",
        "description": "국제표준직업분류",
    },
    "APQC": {
        "name": "APQC Process Classification Framework",
        "version": "7.3.0",
        "organization": "APQC",
        "description": "프로세스 분류 프레임워크",
    },
    "ITIL": {
        "name": "Information Technology Infrastructure Library",
        "version": "ITIL 4",
        "organization": "Axelos",
        "description": "IT 서비스 관리 프레임워크",
    },
    "COBIT": {
        "name": "Control Objectives for Information Technologies",
        "version": "COBIT 2019",
        "organization": "ISACA",
        "description": "IT 거버넌스 프레임워크",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# 분류 체계 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════

class TaxonomyManager:
    """분류 체계 관리자"""
    
    def __init__(self):
        self.taxonomy = TAXONOMY_5LEVEL
    
    def get_node(self, code: str) -> Optional[TaxonomyNode]:
        """노드 조회"""
        return self.taxonomy.get(code)
    
    def get_children(self, code: str) -> List[TaxonomyNode]:
        """자식 노드 조회"""
        node = self.get_node(code)
        if not node:
            return []
        return [self.taxonomy[c] for c in node.children if c in self.taxonomy]
    
    def get_ancestors(self, code: str) -> List[TaxonomyNode]:
        """조상 노드 조회"""
        ancestors = []
        node = self.get_node(code)
        while node and node.parent_code:
            parent = self.get_node(node.parent_code)
            if parent:
                ancestors.append(parent)
                node = parent
            else:
                break
        return ancestors
    
    def get_full_path(self, code: str) -> str:
        """전체 경로"""
        ancestors = self.get_ancestors(code)
        node = self.get_node(code)
        if not node:
            return ""
        
        path = [a.name_ko for a in reversed(ancestors)] + [node.name_ko]
        return " > ".join(path)
    
    def get_by_level(self, level: int) -> List[TaxonomyNode]:
        """레벨별 노드 조회"""
        return [n for n in self.taxonomy.values() if n.level == level]
    
    def search(self, keyword: str) -> List[TaxonomyNode]:
        """키워드 검색"""
        keyword_lower = keyword.lower()
        return [
            n for n in self.taxonomy.values()
            if keyword_lower in n.name_ko.lower() or keyword_lower in n.name_en.lower()
        ]
    
    def get_statistics(self) -> Dict[str, Any]:
        """분류 체계 통계"""
        by_level = {}
        for level in range(1, 6):
            nodes = self.get_by_level(level)
            by_level[f"L{level}"] = len(nodes)
        
        return {
            "total_nodes": len(self.taxonomy),
            "by_level": by_level,
            "l1_domains": [n.code for n in self.get_by_level(1)],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

_taxonomy_manager: Optional[TaxonomyManager] = None


def get_taxonomy_manager() -> TaxonomyManager:
    """분류 체계 관리자 싱글톤"""
    global _taxonomy_manager
    if _taxonomy_manager is None:
        _taxonomy_manager = TaxonomyManager()
    return _taxonomy_manager
