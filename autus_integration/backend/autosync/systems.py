# backend/autosync/systems.py
# 지원 시스템 정의 (30+ SaaS/ERP/CRM)

from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum


class SystemCategory(Enum):
    """시스템 카테고리"""
    PAYMENT = "payment"
    EDUCATION_ERP = "education_erp"
    CRM = "crm"
    BOOKING = "booking"
    POS = "pos"
    ACCOUNTING = "accounting"
    MEMBERSHIP = "membership"


@dataclass
class SystemConfig:
    """시스템 설정"""
    id: str
    name: str
    category: SystemCategory
    webhook_support: bool
    api_support: bool
    detection_domains: List[str]
    detection_cookies: List[str]
    id_fields: List[str]
    amount_fields: List[str]
    time_fields: List[str]


# 지원 시스템 목록
SUPPORTED_SYSTEMS: Dict[str, SystemConfig] = {
    # ═══════════════════════════════════════
    # 결제 시스템
    # ═══════════════════════════════════════
    "stripe": SystemConfig(
        id="stripe",
        name="Stripe",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["stripe.com", "dashboard.stripe.com"],
        detection_cookies=["__stripe_mid", "__stripe_sid"],
        id_fields=["customer", "customer_id", "id"],
        amount_fields=["amount", "amount_paid", "total"],
        time_fields=["created", "created_at"]
    ),
    "toss": SystemConfig(
        id="toss",
        name="토스페이먼츠",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["tosspayments.com", "pay.toss.im"],
        detection_cookies=["toss_session"],
        id_fields=["orderId", "customerId", "paymentKey"],
        amount_fields=["totalAmount", "amount"],
        time_fields=["approvedAt", "requestedAt"]
    ),
    "kakaopay": SystemConfig(
        id="kakaopay",
        name="카카오페이",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["pg.kakao.com", "pay.kakao.com"],
        detection_cookies=["_kawlt", "_kahai"],
        id_fields=["partner_user_id", "tid"],
        amount_fields=["total_amount", "amount"],
        time_fields=["approved_at", "created_at"]
    ),
    "shopify": SystemConfig(
        id="shopify",
        name="Shopify",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["shopify.com", "myshopify.com"],
        detection_cookies=["_shopify_s", "_shopify_y"],
        id_fields=["customer.id", "id", "order_id"],
        amount_fields=["total_price", "subtotal_price", "amount"],
        time_fields=["created_at", "updated_at"]
    ),
    
    # ═══════════════════════════════════════
    # 교육 ERP
    # ═══════════════════════════════════════
    "hiclass": SystemConfig(
        id="hiclass",
        name="하이클래스",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=False,
        api_support=True,
        detection_domains=["hiclass.net"],
        detection_cookies=["HICLASS_SESSION"],
        id_fields=["student_id", "member_id"],
        amount_fields=["tuition", "payment_amount"],
        time_fields=["payment_date", "created_at"]
    ),
    "class101": SystemConfig(
        id="class101",
        name="클래스101",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=True,
        api_support=True,
        detection_domains=["class101.net"],
        detection_cookies=["class101_token"],
        id_fields=["user_id", "student_id"],
        amount_fields=["price", "total_price"],
        time_fields=["purchased_at", "created_at"]
    ),
    "academyplus": SystemConfig(
        id="academyplus",
        name="아카데미플러스",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=False,
        api_support=True,
        detection_domains=["academyplus.co.kr"],
        detection_cookies=["AP_SESSION"],
        id_fields=["student_no", "member_no"],
        amount_fields=["수납금액", "결제금액"],
        time_fields=["수납일", "등록일"]
    ),
    "classmate": SystemConfig(
        id="classmate",
        name="클래스메이트",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=False,
        api_support=True,
        detection_domains=["classmate.co.kr"],
        detection_cookies=["CM_TOKEN"],
        id_fields=["학생ID", "회원번호"],
        amount_fields=["수강료", "결제금액"],
        time_fields=["결제일시", "등록일시"]
    ),
    
    # ═══════════════════════════════════════
    # CRM
    # ═══════════════════════════════════════
    "hubspot": SystemConfig(
        id="hubspot",
        name="HubSpot",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["hubspot.com", "app.hubspot.com"],
        detection_cookies=["hubspotutk", "__hstc"],
        id_fields=["vid", "contact_id", "deal_id"],
        amount_fields=["amount", "deal_value", "revenue"],
        time_fields=["createdate", "lastmodifieddate"]
    ),
    "salesforce": SystemConfig(
        id="salesforce",
        name="Salesforce",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["salesforce.com", "lightning.force.com"],
        detection_cookies=["sfdc_lv", "BrowserId"],
        id_fields=["Id", "AccountId", "ContactId"],
        amount_fields=["Amount", "TotalPrice", "AnnualRevenue"],
        time_fields=["CreatedDate", "LastModifiedDate"]
    ),
    "zoho": SystemConfig(
        id="zoho",
        name="Zoho CRM",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["zoho.com", "crm.zoho.com"],
        detection_cookies=["JSESSIONID", "zoho_token"],
        id_fields=["id", "Contact_Name.id", "Account_Name.id"],
        amount_fields=["Amount", "Grand_Total"],
        time_fields=["Created_Time", "Modified_Time"]
    ),
    "pipedrive": SystemConfig(
        id="pipedrive",
        name="Pipedrive",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["pipedrive.com"],
        detection_cookies=["pipe_session"],
        id_fields=["id", "person_id", "org_id"],
        amount_fields=["value", "deal_value"],
        time_fields=["add_time", "update_time"]
    ),
    
    # ═══════════════════════════════════════
    # 예약
    # ═══════════════════════════════════════
    "naver_booking": SystemConfig(
        id="naver_booking",
        name="네이버예약",
        category=SystemCategory.BOOKING,
        webhook_support=True,
        api_support=True,
        detection_domains=["booking.naver.com", "partner.booking.naver.com"],
        detection_cookies=["NID_SES", "NID_AUT"],
        id_fields=["bookingId", "userId"],
        amount_fields=["totalPrice", "paymentAmount"],
        time_fields=["bookingDate", "createdAt"]
    ),
    "table_manager": SystemConfig(
        id="table_manager",
        name="테이블매니저",
        category=SystemCategory.BOOKING,
        webhook_support=True,
        api_support=True,
        detection_domains=["tablemanager.io"],
        detection_cookies=["TM_SESSION"],
        id_fields=["reservation_id", "customer_id"],
        amount_fields=["total_amount", "deposit"],
        time_fields=["reservation_time", "created_at"]
    ),
    
    # ═══════════════════════════════════════
    # POS
    # ═══════════════════════════════════════
    "toss_pos": SystemConfig(
        id="toss_pos",
        name="토스 POS",
        category=SystemCategory.POS,
        webhook_support=True,
        api_support=True,
        detection_domains=["pos.toss.im"],
        detection_cookies=["toss_pos_session"],
        id_fields=["orderId", "customerId"],
        amount_fields=["totalAmount", "paidAmount"],
        time_fields=["orderTime", "paidAt"]
    ),
    "baemin_pos": SystemConfig(
        id="baemin_pos",
        name="배민포스",
        category=SystemCategory.POS,
        webhook_support=False,
        api_support=True,
        detection_domains=["self.baemin.com", "ceo.baemin.com"],
        detection_cookies=["BAEMIN_CEO"],
        id_fields=["orderNo", "shopId"],
        amount_fields=["orderAmount", "totalPrice"],
        time_fields=["orderDateTime", "createdAt"]
    ),
    
    # ═══════════════════════════════════════
    # 회계
    # ═══════════════════════════════════════
    "quickbooks": SystemConfig(
        id="quickbooks",
        name="QuickBooks",
        category=SystemCategory.ACCOUNTING,
        webhook_support=True,
        api_support=True,
        detection_domains=["quickbooks.intuit.com", "qbo.intuit.com"],
        detection_cookies=["qbo_session"],
        id_fields=["Id", "CustomerRef.value", "VendorRef.value"],
        amount_fields=["TotalAmt", "Amount", "Balance"],
        time_fields=["TxnDate", "MetaData.CreateTime"]
    ),
    "xero": SystemConfig(
        id="xero",
        name="Xero",
        category=SystemCategory.ACCOUNTING,
        webhook_support=True,
        api_support=True,
        detection_domains=["xero.com", "go.xero.com"],
        detection_cookies=["xero_session"],
        id_fields=["ContactID", "InvoiceID"],
        amount_fields=["Total", "AmountDue", "AmountPaid"],
        time_fields=["DateString", "UpdatedDateUTC"]
    ),
    
    # ═══════════════════════════════════════
    # 회원 관리
    # ═══════════════════════════════════════
    "gym_system": SystemConfig(
        id="gym_system",
        name="짐앤짐",
        category=SystemCategory.MEMBERSHIP,
        webhook_support=False,
        api_support=True,
        detection_domains=["gymngym.co.kr"],
        detection_cookies=["GYM_SESSION"],
        id_fields=["member_id", "회원번호"],
        amount_fields=["회비", "결제금액", "수납액"],
        time_fields=["등록일", "결제일"]
    ),
}


def get_system_by_domain(domain: str) -> SystemConfig | None:
    """도메인으로 시스템 찾기"""
    for config in SUPPORTED_SYSTEMS.values():
        if any(d in domain for d in config.detection_domains):
            return config
    return None


def get_system_by_cookie(cookies: str) -> SystemConfig | None:
    """쿠키로 시스템 찾기"""
    for config in SUPPORTED_SYSTEMS.values():
        if any(c in cookies for c in config.detection_cookies):
            return config
    return None


def get_systems_by_category(category: SystemCategory) -> List[SystemConfig]:
    """카테고리별 시스템 목록"""
    return [s for s in SUPPORTED_SYSTEMS.values() if s.category == category]



# backend/autosync/systems.py
# 지원 시스템 정의 (30+ SaaS/ERP/CRM)

from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum


class SystemCategory(Enum):
    """시스템 카테고리"""
    PAYMENT = "payment"
    EDUCATION_ERP = "education_erp"
    CRM = "crm"
    BOOKING = "booking"
    POS = "pos"
    ACCOUNTING = "accounting"
    MEMBERSHIP = "membership"


@dataclass
class SystemConfig:
    """시스템 설정"""
    id: str
    name: str
    category: SystemCategory
    webhook_support: bool
    api_support: bool
    detection_domains: List[str]
    detection_cookies: List[str]
    id_fields: List[str]
    amount_fields: List[str]
    time_fields: List[str]


# 지원 시스템 목록
SUPPORTED_SYSTEMS: Dict[str, SystemConfig] = {
    # ═══════════════════════════════════════
    # 결제 시스템
    # ═══════════════════════════════════════
    "stripe": SystemConfig(
        id="stripe",
        name="Stripe",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["stripe.com", "dashboard.stripe.com"],
        detection_cookies=["__stripe_mid", "__stripe_sid"],
        id_fields=["customer", "customer_id", "id"],
        amount_fields=["amount", "amount_paid", "total"],
        time_fields=["created", "created_at"]
    ),
    "toss": SystemConfig(
        id="toss",
        name="토스페이먼츠",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["tosspayments.com", "pay.toss.im"],
        detection_cookies=["toss_session"],
        id_fields=["orderId", "customerId", "paymentKey"],
        amount_fields=["totalAmount", "amount"],
        time_fields=["approvedAt", "requestedAt"]
    ),
    "kakaopay": SystemConfig(
        id="kakaopay",
        name="카카오페이",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["pg.kakao.com", "pay.kakao.com"],
        detection_cookies=["_kawlt", "_kahai"],
        id_fields=["partner_user_id", "tid"],
        amount_fields=["total_amount", "amount"],
        time_fields=["approved_at", "created_at"]
    ),
    "shopify": SystemConfig(
        id="shopify",
        name="Shopify",
        category=SystemCategory.PAYMENT,
        webhook_support=True,
        api_support=True,
        detection_domains=["shopify.com", "myshopify.com"],
        detection_cookies=["_shopify_s", "_shopify_y"],
        id_fields=["customer.id", "id", "order_id"],
        amount_fields=["total_price", "subtotal_price", "amount"],
        time_fields=["created_at", "updated_at"]
    ),
    
    # ═══════════════════════════════════════
    # 교육 ERP
    # ═══════════════════════════════════════
    "hiclass": SystemConfig(
        id="hiclass",
        name="하이클래스",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=False,
        api_support=True,
        detection_domains=["hiclass.net"],
        detection_cookies=["HICLASS_SESSION"],
        id_fields=["student_id", "member_id"],
        amount_fields=["tuition", "payment_amount"],
        time_fields=["payment_date", "created_at"]
    ),
    "class101": SystemConfig(
        id="class101",
        name="클래스101",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=True,
        api_support=True,
        detection_domains=["class101.net"],
        detection_cookies=["class101_token"],
        id_fields=["user_id", "student_id"],
        amount_fields=["price", "total_price"],
        time_fields=["purchased_at", "created_at"]
    ),
    "academyplus": SystemConfig(
        id="academyplus",
        name="아카데미플러스",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=False,
        api_support=True,
        detection_domains=["academyplus.co.kr"],
        detection_cookies=["AP_SESSION"],
        id_fields=["student_no", "member_no"],
        amount_fields=["수납금액", "결제금액"],
        time_fields=["수납일", "등록일"]
    ),
    "classmate": SystemConfig(
        id="classmate",
        name="클래스메이트",
        category=SystemCategory.EDUCATION_ERP,
        webhook_support=False,
        api_support=True,
        detection_domains=["classmate.co.kr"],
        detection_cookies=["CM_TOKEN"],
        id_fields=["학생ID", "회원번호"],
        amount_fields=["수강료", "결제금액"],
        time_fields=["결제일시", "등록일시"]
    ),
    
    # ═══════════════════════════════════════
    # CRM
    # ═══════════════════════════════════════
    "hubspot": SystemConfig(
        id="hubspot",
        name="HubSpot",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["hubspot.com", "app.hubspot.com"],
        detection_cookies=["hubspotutk", "__hstc"],
        id_fields=["vid", "contact_id", "deal_id"],
        amount_fields=["amount", "deal_value", "revenue"],
        time_fields=["createdate", "lastmodifieddate"]
    ),
    "salesforce": SystemConfig(
        id="salesforce",
        name="Salesforce",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["salesforce.com", "lightning.force.com"],
        detection_cookies=["sfdc_lv", "BrowserId"],
        id_fields=["Id", "AccountId", "ContactId"],
        amount_fields=["Amount", "TotalPrice", "AnnualRevenue"],
        time_fields=["CreatedDate", "LastModifiedDate"]
    ),
    "zoho": SystemConfig(
        id="zoho",
        name="Zoho CRM",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["zoho.com", "crm.zoho.com"],
        detection_cookies=["JSESSIONID", "zoho_token"],
        id_fields=["id", "Contact_Name.id", "Account_Name.id"],
        amount_fields=["Amount", "Grand_Total"],
        time_fields=["Created_Time", "Modified_Time"]
    ),
    "pipedrive": SystemConfig(
        id="pipedrive",
        name="Pipedrive",
        category=SystemCategory.CRM,
        webhook_support=True,
        api_support=True,
        detection_domains=["pipedrive.com"],
        detection_cookies=["pipe_session"],
        id_fields=["id", "person_id", "org_id"],
        amount_fields=["value", "deal_value"],
        time_fields=["add_time", "update_time"]
    ),
    
    # ═══════════════════════════════════════
    # 예약
    # ═══════════════════════════════════════
    "naver_booking": SystemConfig(
        id="naver_booking",
        name="네이버예약",
        category=SystemCategory.BOOKING,
        webhook_support=True,
        api_support=True,
        detection_domains=["booking.naver.com", "partner.booking.naver.com"],
        detection_cookies=["NID_SES", "NID_AUT"],
        id_fields=["bookingId", "userId"],
        amount_fields=["totalPrice", "paymentAmount"],
        time_fields=["bookingDate", "createdAt"]
    ),
    "table_manager": SystemConfig(
        id="table_manager",
        name="테이블매니저",
        category=SystemCategory.BOOKING,
        webhook_support=True,
        api_support=True,
        detection_domains=["tablemanager.io"],
        detection_cookies=["TM_SESSION"],
        id_fields=["reservation_id", "customer_id"],
        amount_fields=["total_amount", "deposit"],
        time_fields=["reservation_time", "created_at"]
    ),
    
    # ═══════════════════════════════════════
    # POS
    # ═══════════════════════════════════════
    "toss_pos": SystemConfig(
        id="toss_pos",
        name="토스 POS",
        category=SystemCategory.POS,
        webhook_support=True,
        api_support=True,
        detection_domains=["pos.toss.im"],
        detection_cookies=["toss_pos_session"],
        id_fields=["orderId", "customerId"],
        amount_fields=["totalAmount", "paidAmount"],
        time_fields=["orderTime", "paidAt"]
    ),
    "baemin_pos": SystemConfig(
        id="baemin_pos",
        name="배민포스",
        category=SystemCategory.POS,
        webhook_support=False,
        api_support=True,
        detection_domains=["self.baemin.com", "ceo.baemin.com"],
        detection_cookies=["BAEMIN_CEO"],
        id_fields=["orderNo", "shopId"],
        amount_fields=["orderAmount", "totalPrice"],
        time_fields=["orderDateTime", "createdAt"]
    ),
    
    # ═══════════════════════════════════════
    # 회계
    # ═══════════════════════════════════════
    "quickbooks": SystemConfig(
        id="quickbooks",
        name="QuickBooks",
        category=SystemCategory.ACCOUNTING,
        webhook_support=True,
        api_support=True,
        detection_domains=["quickbooks.intuit.com", "qbo.intuit.com"],
        detection_cookies=["qbo_session"],
        id_fields=["Id", "CustomerRef.value", "VendorRef.value"],
        amount_fields=["TotalAmt", "Amount", "Balance"],
        time_fields=["TxnDate", "MetaData.CreateTime"]
    ),
    "xero": SystemConfig(
        id="xero",
        name="Xero",
        category=SystemCategory.ACCOUNTING,
        webhook_support=True,
        api_support=True,
        detection_domains=["xero.com", "go.xero.com"],
        detection_cookies=["xero_session"],
        id_fields=["ContactID", "InvoiceID"],
        amount_fields=["Total", "AmountDue", "AmountPaid"],
        time_fields=["DateString", "UpdatedDateUTC"]
    ),
    
    # ═══════════════════════════════════════
    # 회원 관리
    # ═══════════════════════════════════════
    "gym_system": SystemConfig(
        id="gym_system",
        name="짐앤짐",
        category=SystemCategory.MEMBERSHIP,
        webhook_support=False,
        api_support=True,
        detection_domains=["gymngym.co.kr"],
        detection_cookies=["GYM_SESSION"],
        id_fields=["member_id", "회원번호"],
        amount_fields=["회비", "결제금액", "수납액"],
        time_fields=["등록일", "결제일"]
    ),
}


def get_system_by_domain(domain: str) -> SystemConfig | None:
    """도메인으로 시스템 찾기"""
    for config in SUPPORTED_SYSTEMS.values():
        if any(d in domain for d in config.detection_domains):
            return config
    return None


def get_system_by_cookie(cookies: str) -> SystemConfig | None:
    """쿠키로 시스템 찾기"""
    for config in SUPPORTED_SYSTEMS.values():
        if any(c in cookies for c in config.detection_cookies):
            return config
    return None


def get_systems_by_category(category: SystemCategory) -> List[SystemConfig]:
    """카테고리별 시스템 목록"""
    return [s for s in SUPPORTED_SYSTEMS.values() if s.category == category]








