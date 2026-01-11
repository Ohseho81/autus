"""
═══════════════════════════════════════════════════════════════════════════════
🌍 AUTUS v2.5+ - Universal Work Taxonomy
═══════════════════════════════════════════════════════════════════════════════

지구상 모든 업무의 분류 및 처리 전략
- ELIMINATE: 삭제 (불필요한 업무)
- AUTOMATE: 자동화 (AI/시스템 대체)
- PARALLELIZE: 병렬화 (분산/크라우드)
- HUMANIZE: 인간 고유 (창조/판단/감정)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 처리 전략
# ═══════════════════════════════════════════════════════════════════════════════

WorkStrategy = Literal['ELIMINATE', 'AUTOMATE', 'PARALLELIZE', 'HUMANIZE']
AutomationLevel = Literal['full', 'assisted', 'augmented', 'manual']
WorkDomain = Literal['administrative', 'financial', 'operational', 'creative', 
                     'analytical', 'relational', 'physical']


@dataclass
class WorkCategory:
    """업무 카테고리 정의"""
    id: str
    domain: WorkDomain
    name: str
    name_ko: str
    description: str
    
    # 처리 전략
    primary_strategy: WorkStrategy
    automation_level: AutomationLevel
    
    # 노드 연결
    related_nodes: List[str] = field(default_factory=list)
    
    # 전략 상세 (0-1)
    elimination_potential: float = 0.0
    automation_potential: float = 0.0
    parallelization_potential: float = 0.0
    human_essential: float = 0.0
    
    # 구현
    current_tools: List[str] = field(default_factory=list)
    future_tools: List[str] = field(default_factory=list)
    timeline_years: int = 0


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 1. ADMINISTRATIVE (행정/관리)
# ═══════════════════════════════════════════════════════════════════════════════

ADMINISTRATIVE_WORK: List[WorkCategory] = [
    WorkCategory(
        id='admin_filing', domain='administrative',
        name='Document Filing', name_ko='문서 정리/파일링',
        description='문서 분류, 보관, 검색',
        primary_strategy='ELIMINATE', automation_level='full',
        related_nodes=['n18'],
        elimination_potential=0.95, automation_potential=1.0,
        parallelization_potential=0.3, human_essential=0.05,
        current_tools=['Google Drive', 'Notion', 'Dropbox'],
        future_tools=['Auto-tagging AI', 'Semantic Search'],
        timeline_years=0,
    ),
    WorkCategory(
        id='admin_scheduling', domain='administrative',
        name='Meeting Scheduling', name_ko='일정 조율/회의 잡기',
        description='참석자 간 일정 조율, 회의실 예약',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n15', 'n18'],
        elimination_potential=0.7, automation_potential=1.0,
        parallelization_potential=0.2, human_essential=0.1,
        current_tools=['Calendly', 'x.ai', 'Google Calendar'],
        future_tools=['Context-aware scheduling AI'],
        timeline_years=0,
    ),
    WorkCategory(
        id='admin_email_triage', domain='administrative',
        name='Email Triage', name_ko='이메일 분류/응답',
        description='이메일 읽기, 분류, 기본 응답',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n18', 'n26'],
        elimination_potential=0.6, automation_potential=0.9,
        parallelization_potential=0.4, human_essential=0.2,
        current_tools=['Gmail filters', 'Superhuman', 'SaneBox'],
        future_tools=['Full email agent', 'Personality-mirrored replies'],
        timeline_years=1,
    ),
    WorkCategory(
        id='admin_data_entry', domain='administrative',
        name='Data Entry', name_ko='데이터 입력',
        description='수동 데이터 입력, 복사-붙여넣기',
        primary_strategy='ELIMINATE', automation_level='full',
        related_nodes=['n18'],
        elimination_potential=1.0, automation_potential=1.0,
        parallelization_potential=0.8, human_essential=0.0,
        current_tools=['Zapier', 'RPA tools', 'OCR'],
        future_tools=['Zero-entry systems'],
        timeline_years=0,
    ),
    WorkCategory(
        id='admin_reporting', domain='administrative',
        name='Status Reporting', name_ko='상태 보고/리포팅',
        description='정기 보고서 작성, 현황 업데이트',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n18', 'n17'],
        elimination_potential=0.8, automation_potential=1.0,
        parallelization_potential=0.5, human_essential=0.1,
        current_tools=['Dashboards', 'BI tools'],
        future_tools=['Auto-narrative generation'],
        timeline_years=0,
    ),
    WorkCategory(
        id='admin_approval', domain='administrative',
        name='Approval Processing', name_ko='승인/결재 처리',
        description='결재 라인 처리, 승인 대기',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n18', 'n16'],
        elimination_potential=0.7, automation_potential=0.85,
        parallelization_potential=0.6, human_essential=0.3,
        current_tools=['Workflow tools', 'DocuSign'],
        future_tools=['Smart contract approval', 'Risk-based auto-approve'],
        timeline_years=2,
    ),
    WorkCategory(
        id='admin_compliance', domain='administrative',
        name='Compliance Checking', name_ko='규정 준수 확인',
        description='법규/정책 준수 여부 확인',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n35'],
        elimination_potential=0.3, automation_potential=0.9,
        parallelization_potential=0.7, human_essential=0.2,
        current_tools=['Compliance software', 'Audit tools'],
        future_tools=['Real-time compliance AI'],
        timeline_years=2,
    ),
    WorkCategory(
        id='admin_inventory', domain='administrative',
        name='Inventory Management', name_ko='재고 관리',
        description='재고 파악, 발주, 추적',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n19', 'n20'],
        elimination_potential=0.5, automation_potential=1.0,
        parallelization_potential=0.4, human_essential=0.1,
        current_tools=['ERP', 'Inventory software'],
        future_tools=['Predictive inventory AI', 'Auto-reorder'],
        timeline_years=1,
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 2. FINANCIAL (금융/회계)
# ═══════════════════════════════════════════════════════════════════════════════

FINANCIAL_WORK: List[WorkCategory] = [
    WorkCategory(
        id='fin_bookkeeping', domain='financial',
        name='Bookkeeping', name_ko='장부 기록',
        description='거래 기록, 분개, 원장 관리',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n01', 'n02', 'n03'],
        elimination_potential=0.3, automation_potential=1.0,
        parallelization_potential=0.5, human_essential=0.05,
        current_tools=['QuickBooks', 'Xero', 'Wave'],
        future_tools=['Zero-touch accounting'],
        timeline_years=0,
    ),
    WorkCategory(
        id='fin_invoicing', domain='financial',
        name='Invoicing', name_ko='청구서 발행',
        description='인보이스 생성, 발송, 추적',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n02', 'n04'],
        elimination_potential=0.5, automation_potential=1.0,
        parallelization_potential=0.3, human_essential=0.05,
        current_tools=['Stripe', 'FreshBooks', 'Invoice Ninja'],
        future_tools=['Instant settlement', 'Smart contracts'],
        timeline_years=0,
    ),
    WorkCategory(
        id='fin_expense', domain='financial',
        name='Expense Management', name_ko='경비 관리',
        description='영수증 처리, 경비 보고, 정산',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n03'],
        elimination_potential=0.7, automation_potential=1.0,
        parallelization_potential=0.4, human_essential=0.1,
        current_tools=['Expensify', 'Ramp', 'Brex'],
        future_tools=['Auto-categorization', 'Receipt-less tracking'],
        timeline_years=0,
    ),
    WorkCategory(
        id='fin_payroll', domain='financial',
        name='Payroll Processing', name_ko='급여 처리',
        description='급여 계산, 세금 공제, 지급',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n01', 'n03'],
        elimination_potential=0.4, automation_potential=1.0,
        parallelization_potential=0.6, human_essential=0.1,
        current_tools=['Gusto', 'ADP', 'Rippling'],
        future_tools=['Real-time payroll', 'Smart tax optimization'],
        timeline_years=0,
    ),
    WorkCategory(
        id='fin_tax', domain='financial',
        name='Tax Preparation', name_ko='세금 신고',
        description='세금 계산, 신고서 작성, 제출',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n01', 'n03', 'n35'],
        elimination_potential=0.3, automation_potential=0.9,
        parallelization_potential=0.5, human_essential=0.2,
        current_tools=['TurboTax', 'H&R Block', 'TaxJar'],
        future_tools=['Continuous tax filing', 'Zero-form taxation'],
        timeline_years=3,
    ),
    WorkCategory(
        id='fin_budgeting', domain='financial',
        name='Budgeting', name_ko='예산 편성',
        description='예산 계획, 배분, 모니터링',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n03', 'n05'],
        elimination_potential=0.2, automation_potential=0.85,
        parallelization_potential=0.4, human_essential=0.3,
        current_tools=['Adaptive Insights', 'Anaplan'],
        future_tools=['AI-driven budget optimization'],
        timeline_years=2,
    ),
    WorkCategory(
        id='fin_investment', domain='financial',
        name='Investment Management', name_ko='투자 관리',
        description='포트폴리오 구성, 리밸런싱, 모니터링',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n01', 'n06'],
        elimination_potential=0.1, automation_potential=0.85,
        parallelization_potential=0.3, human_essential=0.3,
        current_tools=['Wealthfront', 'Betterment', 'Robo-advisors'],
        future_tools=['Causal portfolio AI', 'Predictive allocation'],
        timeline_years=2,
    ),
    WorkCategory(
        id='fin_audit', domain='financial',
        name='Financial Audit', name_ko='재무 감사',
        description='재무제표 검증, 내부 통제 확인',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n01', 'n35'],
        elimination_potential=0.2, automation_potential=0.8,
        parallelization_potential=0.6, human_essential=0.3,
        current_tools=['Audit software', 'Data analytics'],
        future_tools=['Continuous audit AI', 'Anomaly detection'],
        timeline_years=3,
    ),
    WorkCategory(
        id='fin_collection', domain='financial',
        name='Collections', name_ko='채권 추심',
        description='미수금 추적, 독촉, 회수',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n04', 'n26'],
        elimination_potential=0.3, automation_potential=0.8,
        parallelization_potential=0.7, human_essential=0.3,
        current_tools=['Collection software', 'Automated reminders'],
        future_tools=['AI negotiation', 'Predictive default'],
        timeline_years=2,
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 3. OPERATIONAL (운영/생산)
# ═══════════════════════════════════════════════════════════════════════════════

OPERATIONAL_WORK: List[WorkCategory] = [
    WorkCategory(
        id='ops_manufacturing', domain='operational',
        name='Manufacturing', name_ko='제조/생산',
        description='제품 생산, 조립, 품질 관리',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n19', 'n20'],
        elimination_potential=0.2, automation_potential=0.85,
        parallelization_potential=0.6, human_essential=0.2,
        current_tools=['Robotics', 'IoT', 'MES'],
        future_tools=['Lights-out manufacturing', 'Self-repairing systems'],
        timeline_years=5,
    ),
    WorkCategory(
        id='ops_logistics', domain='operational',
        name='Logistics', name_ko='물류/배송',
        description='운송, 배송, 추적',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n19', 'n21'],
        elimination_potential=0.3, automation_potential=0.9,
        parallelization_potential=0.8, human_essential=0.2,
        current_tools=['Fleet management', 'Route optimization'],
        future_tools=['Autonomous vehicles', 'Drone delivery'],
        timeline_years=5,
    ),
    WorkCategory(
        id='ops_quality', domain='operational',
        name='Quality Control', name_ko='품질 관리',
        description='품질 검사, 불량 감지, 개선',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n19', 'n20'],
        elimination_potential=0.3, automation_potential=0.95,
        parallelization_potential=0.5, human_essential=0.15,
        current_tools=['Vision AI', 'Statistical QC'],
        future_tools=['Predictive quality', 'Self-correcting systems'],
        timeline_years=2,
    ),
    WorkCategory(
        id='ops_maintenance', domain='operational',
        name='Maintenance', name_ko='유지보수',
        description='설비 점검, 수리, 예방 정비',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n19', 'n20'],
        elimination_potential=0.2, automation_potential=0.8,
        parallelization_potential=0.6, human_essential=0.3,
        current_tools=['CMMS', 'Predictive maintenance'],
        future_tools=['Self-healing systems', 'Robotic repair'],
        timeline_years=5,
    ),
    WorkCategory(
        id='ops_procurement', domain='operational',
        name='Procurement', name_ko='구매/조달',
        description='공급업체 선정, 발주, 계약',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n03', 'n19'],
        elimination_potential=0.4, automation_potential=0.85,
        parallelization_potential=0.7, human_essential=0.25,
        current_tools=['Procurement software', 'E-sourcing'],
        future_tools=['AI vendor selection', 'Auto-negotiation'],
        timeline_years=3,
    ),
    WorkCategory(
        id='ops_customer_service', domain='operational',
        name='Customer Service', name_ko='고객 서비스',
        description='문의 응대, 불만 처리, 지원',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n23', 'n24', 'n25'],
        elimination_potential=0.3, automation_potential=0.85,
        parallelization_potential=0.9, human_essential=0.25,
        current_tools=['Chatbots', 'Zendesk', 'Intercom'],
        future_tools=['Empathetic AI', 'Proactive service'],
        timeline_years=2,
    ),
    WorkCategory(
        id='ops_project_mgmt', domain='operational',
        name='Project Management', name_ko='프로젝트 관리',
        description='일정, 자원, 위험 관리',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n15', 'n16', 'n17', 'n18'],
        elimination_potential=0.3, automation_potential=0.75,
        parallelization_potential=0.5, human_essential=0.35,
        current_tools=['Jira', 'Asana', 'Monday'],
        future_tools=['AI PM', 'Autonomous task allocation'],
        timeline_years=3,
    ),
    WorkCategory(
        id='ops_monitoring', domain='operational',
        name='System Monitoring', name_ko='시스템 모니터링',
        description='시스템 상태 감시, 알림, 대응',
        primary_strategy='AUTOMATE', automation_level='full',
        related_nodes=['n17', 'n19'],
        elimination_potential=0.4, automation_potential=1.0,
        parallelization_potential=0.7, human_essential=0.1,
        current_tools=['Datadog', 'New Relic', 'PagerDuty'],
        future_tools=['Self-healing infrastructure', 'Predictive ops'],
        timeline_years=1,
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 4. CREATIVE (창작/디자인)
# ═══════════════════════════════════════════════════════════════════════════════

CREATIVE_WORK: List[WorkCategory] = [
    WorkCategory(
        id='creative_writing', domain='creative',
        name='Content Writing', name_ko='콘텐츠 작성',
        description='블로그, 기사, 카피 작성',
        primary_strategy='PARALLELIZE', automation_level='augmented',
        related_nodes=['n17', 'n18'],
        elimination_potential=0.2, automation_potential=0.7,
        parallelization_potential=0.8, human_essential=0.4,
        current_tools=['ChatGPT', 'Jasper', 'Copy.ai'],
        future_tools=['Voice-authentic AI', 'Context-aware generation'],
        timeline_years=2,
    ),
    WorkCategory(
        id='creative_design', domain='creative',
        name='Graphic Design', name_ko='그래픽 디자인',
        description='UI/UX, 브랜딩, 시각 디자인',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n17'],
        elimination_potential=0.1, automation_potential=0.6,
        parallelization_potential=0.7, human_essential=0.5,
        current_tools=['Figma', 'Canva', 'Midjourney'],
        future_tools=['Intent-to-design AI', 'Brand-consistent generation'],
        timeline_years=3,
    ),
    WorkCategory(
        id='creative_video', domain='creative',
        name='Video Production', name_ko='영상 제작',
        description='촬영, 편집, 후반 작업',
        primary_strategy='PARALLELIZE', automation_level='augmented',
        related_nodes=['n17', 'n18'],
        elimination_potential=0.15, automation_potential=0.65,
        parallelization_potential=0.8, human_essential=0.45,
        current_tools=['Premiere', 'Descript', 'Runway'],
        future_tools=['Script-to-video AI', 'Auto-editing'],
        timeline_years=3,
    ),
    WorkCategory(
        id='creative_music', domain='creative',
        name='Music Production', name_ko='음악 제작',
        description='작곡, 편곡, 믹싱',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n17'],
        elimination_potential=0.1, automation_potential=0.5,
        parallelization_potential=0.6, human_essential=0.6,
        current_tools=['AIVA', 'Suno', 'Splice'],
        future_tools=['Emotion-driven composition', 'Style transfer'],
        timeline_years=4,
    ),
    WorkCategory(
        id='creative_strategy', domain='creative',
        name='Creative Strategy', name_ko='크리에이티브 전략',
        description='캠페인 기획, 브랜드 전략',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n17', 'n29'],
        elimination_potential=0.1, automation_potential=0.4,
        parallelization_potential=0.5, human_essential=0.7,
        current_tools=['Strategy frameworks', 'AI insights'],
        future_tools=['Predictive campaign AI', 'Culture trend analysis'],
        timeline_years=5,
    ),
    WorkCategory(
        id='creative_innovation', domain='creative',
        name='Innovation/Invention', name_ko='혁신/발명',
        description='신제품 개발, 특허, R&D',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n17'],
        elimination_potential=0.05, automation_potential=0.3,
        parallelization_potential=0.6, human_essential=0.8,
        current_tools=['Ideation tools', 'Patent databases'],
        future_tools=['Scientific AI', 'Cross-domain synthesis'],
        timeline_years=10,
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 5. ANALYTICAL (분석/연구)
# ═══════════════════════════════════════════════════════════════════════════════

ANALYTICAL_WORK: List[WorkCategory] = [
    WorkCategory(
        id='anal_data_analysis', domain='analytical',
        name='Data Analysis', name_ko='데이터 분석',
        description='데이터 수집, 처리, 시각화',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n17', 'n18'],
        elimination_potential=0.2, automation_potential=0.9,
        parallelization_potential=0.7, human_essential=0.2,
        current_tools=['Python', 'Tableau', 'Power BI'],
        future_tools=['Natural language to insight', 'Auto-analysis'],
        timeline_years=1,
    ),
    WorkCategory(
        id='anal_market_research', domain='analytical',
        name='Market Research', name_ko='시장 조사',
        description='시장 분석, 경쟁사 분석, 트렌드',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n33', 'n29'],
        elimination_potential=0.3, automation_potential=0.85,
        parallelization_potential=0.8, human_essential=0.25,
        current_tools=['Statista', 'SimilarWeb', 'Crunchbase'],
        future_tools=['Real-time market AI', 'Predictive trends'],
        timeline_years=2,
    ),
    WorkCategory(
        id='anal_financial_modeling', domain='analytical',
        name='Financial Modeling', name_ko='재무 모델링',
        description='재무 예측, 시나리오 분석, 밸류에이션',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n01', 'n05', 'n06'],
        elimination_potential=0.2, automation_potential=0.8,
        parallelization_potential=0.5, human_essential=0.3,
        current_tools=['Excel', 'Python', 'Causal'],
        future_tools=['AI-driven forecasting', 'Scenario simulation'],
        timeline_years=2,
    ),
    WorkCategory(
        id='anal_scientific_research', domain='analytical',
        name='Scientific Research', name_ko='과학 연구',
        description='가설 설정, 실험, 논문 작성',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n17'],
        elimination_potential=0.1, automation_potential=0.5,
        parallelization_potential=0.7, human_essential=0.6,
        current_tools=['Lab automation', 'Literature review AI'],
        future_tools=['Hypothesis generation AI', 'Auto-experimentation'],
        timeline_years=7,
    ),
    WorkCategory(
        id='anal_legal_research', domain='analytical',
        name='Legal Research', name_ko='법률 조사',
        description='판례 조사, 법률 검토, 계약 분석',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n35'],
        elimination_potential=0.3, automation_potential=0.85,
        parallelization_potential=0.6, human_essential=0.25,
        current_tools=['Westlaw', 'LexisNexis', 'Harvey AI'],
        future_tools=['Case prediction AI', 'Contract intelligence'],
        timeline_years=2,
    ),
    WorkCategory(
        id='anal_risk_assessment', domain='analytical',
        name='Risk Assessment', name_ko='위험 평가',
        description='리스크 식별, 평가, 대응 계획',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n05', 'n35', 'n36'],
        elimination_potential=0.2, automation_potential=0.8,
        parallelization_potential=0.6, human_essential=0.3,
        current_tools=['Risk management software', 'Monte Carlo'],
        future_tools=['Predictive risk AI', 'Real-time monitoring'],
        timeline_years=2,
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 6. RELATIONAL (관계/소통)
# ═══════════════════════════════════════════════════════════════════════════════

RELATIONAL_WORK: List[WorkCategory] = [
    WorkCategory(
        id='rel_sales', domain='relational',
        name='Sales', name_ko='영업/판매',
        description='고객 발굴, 상담, 계약 체결',
        primary_strategy='PARALLELIZE', automation_level='augmented',
        related_nodes=['n02', 'n23', 'n26'],
        elimination_potential=0.2, automation_potential=0.6,
        parallelization_potential=0.8, human_essential=0.5,
        current_tools=['Salesforce', 'HubSpot', 'Gong'],
        future_tools=['AI sales agent', 'Predictive lead scoring'],
        timeline_years=3,
    ),
    WorkCategory(
        id='rel_negotiation', domain='relational',
        name='Negotiation', name_ko='협상',
        description='조건 협상, 갈등 해결, 합의 도출',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n26', 'n27'],
        elimination_potential=0.1, automation_potential=0.4,
        parallelization_potential=0.3, human_essential=0.7,
        current_tools=['Negotiation frameworks', 'AI simulation'],
        future_tools=['Negotiation AI', 'Optimal outcome prediction'],
        timeline_years=5,
    ),
    WorkCategory(
        id='rel_networking', domain='relational',
        name='Networking', name_ko='네트워킹',
        description='관계 구축, 인맥 관리, 소개',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n26', 'n27', 'n28'],
        elimination_potential=0.3, automation_potential=0.5,
        parallelization_potential=0.7, human_essential=0.6,
        current_tools=['LinkedIn', 'CRM', 'Event apps'],
        future_tools=['Relationship AI', 'Optimal connection matching'],
        timeline_years=4,
    ),
    WorkCategory(
        id='rel_mentoring', domain='relational',
        name='Mentoring/Coaching', name_ko='멘토링/코칭',
        description='지도, 피드백, 성장 지원',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n26', 'n27'],
        elimination_potential=0.1, automation_potential=0.4,
        parallelization_potential=0.6, human_essential=0.7,
        current_tools=['Coaching platforms', 'AI tutors'],
        future_tools=['Personalized AI coach', 'Growth trajectory AI'],
        timeline_years=4,
    ),
    WorkCategory(
        id='rel_leadership', domain='relational',
        name='Leadership', name_ko='리더십/팀 관리',
        description='비전 제시, 동기 부여, 의사결정',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n26', 'n27', 'n28'],
        elimination_potential=0.05, automation_potential=0.3,
        parallelization_potential=0.4, human_essential=0.8,
        current_tools=['Leadership tools', 'Team analytics'],
        future_tools=['Decision support AI', 'Team optimization'],
        timeline_years=7,
    ),
    WorkCategory(
        id='rel_therapy', domain='relational',
        name='Therapy/Counseling', name_ko='상담/치료',
        description='심리 상담, 코칭, 위기 개입',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n10', 'n26'],
        elimination_potential=0.05, automation_potential=0.3,
        parallelization_potential=0.5, human_essential=0.85,
        current_tools=['Telehealth', 'Mental health apps'],
        future_tools=['AI therapy support', 'Crisis detection'],
        timeline_years=8,
    ),
    WorkCategory(
        id='rel_hr', domain='relational',
        name='HR/Recruitment', name_ko='인사/채용',
        description='채용, 평가, 문화 관리',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n26', 'n27'],
        elimination_potential=0.4, automation_potential=0.7,
        parallelization_potential=0.7, human_essential=0.4,
        current_tools=['ATS', 'HR software', 'LinkedIn'],
        future_tools=['AI recruiter', 'Culture fit prediction'],
        timeline_years=3,
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 7. PHYSICAL (물리적 노동)
# ═══════════════════════════════════════════════════════════════════════════════

PHYSICAL_WORK: List[WorkCategory] = [
    WorkCategory(
        id='phys_construction', domain='physical',
        name='Construction', name_ko='건설/공사',
        description='건물, 인프라 건설',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n19'],
        elimination_potential=0.1, automation_potential=0.6,
        parallelization_potential=0.7, human_essential=0.5,
        current_tools=['BIM', 'Robotics', 'Drones'],
        future_tools=['3D printing', 'Autonomous construction'],
        timeline_years=10,
    ),
    WorkCategory(
        id='phys_agriculture', domain='physical',
        name='Agriculture', name_ko='농업',
        description='재배, 수확, 관리',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n19'],
        elimination_potential=0.2, automation_potential=0.8,
        parallelization_potential=0.6, human_essential=0.3,
        current_tools=['Precision farming', 'Drones', 'Sensors'],
        future_tools=['Autonomous farming', 'Vertical farms'],
        timeline_years=5,
    ),
    WorkCategory(
        id='phys_delivery', domain='physical',
        name='Delivery', name_ko='배달',
        description='물품 운반, 배송',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n21'],
        elimination_potential=0.3, automation_potential=0.85,
        parallelization_potential=0.9, human_essential=0.2,
        current_tools=['Route optimization', 'Tracking'],
        future_tools=['Autonomous vehicles', 'Drones'],
        timeline_years=5,
    ),
    WorkCategory(
        id='phys_cleaning', domain='physical',
        name='Cleaning', name_ko='청소/위생',
        description='청소, 세탁, 위생 관리',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n19'],
        elimination_potential=0.2, automation_potential=0.8,
        parallelization_potential=0.8, human_essential=0.25,
        current_tools=['Robot vacuums', 'Commercial cleaners'],
        future_tools=['Full robotic cleaning', 'Self-cleaning surfaces'],
        timeline_years=5,
    ),
    WorkCategory(
        id='phys_healthcare', domain='physical',
        name='Healthcare', name_ko='의료/돌봄',
        description='진료, 수술, 환자 돌봄',
        primary_strategy='HUMANIZE', automation_level='augmented',
        related_nodes=['n09', 'n10', 'n11'],
        elimination_potential=0.05, automation_potential=0.5,
        parallelization_potential=0.5, human_essential=0.7,
        current_tools=['Surgical robots', 'Diagnostics AI'],
        future_tools=['Remote surgery', 'AI diagnosis'],
        timeline_years=10,
    ),
    WorkCategory(
        id='phys_security', domain='physical',
        name='Security', name_ko='보안/경비',
        description='감시, 순찰, 보호',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n35', 'n36'],
        elimination_potential=0.3, automation_potential=0.8,
        parallelization_potential=0.7, human_essential=0.3,
        current_tools=['Cameras', 'Drones', 'Access control'],
        future_tools=['Autonomous patrol', 'Predictive security'],
        timeline_years=5,
    ),
    WorkCategory(
        id='phys_food_service', domain='physical',
        name='Food Service', name_ko='식품 서비스',
        description='조리, 서빙, 식품 준비',
        primary_strategy='AUTOMATE', automation_level='assisted',
        related_nodes=['n14'],
        elimination_potential=0.2, automation_potential=0.7,
        parallelization_potential=0.6, human_essential=0.4,
        current_tools=['Kitchen automation', 'Serving robots'],
        future_tools=['Robotic kitchens', 'Personalized nutrition'],
        timeline_years=7,
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 전체 카테고리 통합
# ═══════════════════════════════════════════════════════════════════════════════

ALL_WORK_CATEGORIES: List[WorkCategory] = (
    ADMINISTRATIVE_WORK +
    FINANCIAL_WORK +
    OPERATIONAL_WORK +
    CREATIVE_WORK +
    ANALYTICAL_WORK +
    RELATIONAL_WORK +
    PHYSICAL_WORK
)


def get_work_taxonomy_stats() -> Dict:
    """업무 분류 통계"""
    by_strategy = {
        'ELIMINATE': len([c for c in ALL_WORK_CATEGORIES if c.primary_strategy == 'ELIMINATE']),
        'AUTOMATE': len([c for c in ALL_WORK_CATEGORIES if c.primary_strategy == 'AUTOMATE']),
        'PARALLELIZE': len([c for c in ALL_WORK_CATEGORIES if c.primary_strategy == 'PARALLELIZE']),
        'HUMANIZE': len([c for c in ALL_WORK_CATEGORIES if c.primary_strategy == 'HUMANIZE']),
    }
    
    by_domain = {
        'administrative': len(ADMINISTRATIVE_WORK),
        'financial': len(FINANCIAL_WORK),
        'operational': len(OPERATIONAL_WORK),
        'creative': len(CREATIVE_WORK),
        'analytical': len(ANALYTICAL_WORK),
        'relational': len(RELATIONAL_WORK),
        'physical': len(PHYSICAL_WORK),
    }
    
    return {
        'total': len(ALL_WORK_CATEGORIES),
        'by_strategy': by_strategy,
        'by_domain': by_domain,
    }


WORK_TAXONOMY_STATS = get_work_taxonomy_stats()
