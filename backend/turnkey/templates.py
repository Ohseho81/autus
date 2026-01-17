"""
AUTUS Turnkey Solution Templates
산업별 턴키 솔루션 템플릿
"""

from .models import (
    TriggerType,
    ChainResult,
    ChainAction,
    TriggerChain,
    TurnkeyFramework,
)
from .builder import TurnkeyBuilder, quick_chain, quick_task


# =============================================================================
# 산업별 템플릿 정의
# =============================================================================

INDUSTRY_TEMPLATES = {
    "교육": {
        "core_triggers": ["결제", "수업"],
        "eliminated_count": 40,
        "description": "결제+수업 → 전체 학사/행정/CS 자동화",
        "departments": ["재무팀", "학사팀", "행정팀", "교사", "CS팀", "영업팀"],
    },
    "의료": {
        "core_triggers": ["예약", "진료"],
        "eliminated_count": 35,
        "description": "예약+진료 → 전체 접수/차트/청구/안내 자동화",
        "departments": ["접수", "간호", "의사", "원무", "보험", "CS"],
    },
    "물류": {
        "core_triggers": ["주문", "배송"],
        "eliminated_count": 45,
        "description": "주문+배송 → 전체 재고/출고/운송/정산 자동화",
        "departments": ["주문팀", "재고팀", "출고팀", "배송팀", "정산팀", "CS팀"],
    },
    "호텔": {
        "core_triggers": ["예약", "체크인"],
        "eliminated_count": 30,
        "description": "예약+체크인 → 전체 객실/청소/식음/정산 자동화",
        "departments": ["예약팀", "프론트", "객실팀", "식음료", "정산팀"],
    },
    "제조": {
        "core_triggers": ["수주", "생산"],
        "eliminated_count": 50,
        "description": "수주+생산 → 전체 자재/공정/품질/출하 자동화",
        "departments": ["영업팀", "자재팀", "생산팀", "품질팀", "출하팀", "정산팀"],
    },
    "유통": {
        "core_triggers": ["발주", "판매"],
        "eliminated_count": 40,
        "description": "발주+판매 → 전체 재고/가격/진열/정산 자동화",
        "departments": ["바이어", "재고팀", "매장", "MD", "정산팀"],
    },
    "서비스": {
        "core_triggers": ["계약", "서비스"],
        "eliminated_count": 35,
        "description": "계약+서비스 → 전체 일정/수행/보고/청구 자동화",
        "departments": ["영업팀", "PM", "수행팀", "QA", "정산팀", "CS팀"],
    },
}


# =============================================================================
# 교육 서비스업 턴키 솔루션
# =============================================================================

def create_education_turnkey() -> TurnkeyFramework:
    """교육 서비스업 턴키 솔루션"""
    
    builder = TurnkeyBuilder(
        industry="교육 서비스업",
        solution_name="EduOS - 교육 운영 시스템"
    )
    
    # Stage 1: 수집
    legacy_tasks = [
        # 수납/재무
        quick_task("L001", "수납확인", "재무팀", 10, 5000, 0.02),
        quick_task("L002", "수납입력", "재무팀", 5, 2500, 0.05),
        quick_task("L003", "영수증발행", "재무팀", 3, 1500, 0.01),
        quick_task("L004", "세금계산서발행", "재무팀", 5, 2500, 0.02),
        quick_task("L005", "미수금관리", "재무팀", 15, 7500, 0.05),
        quick_task("L006", "환불처리", "재무팀", 20, 10000, 0.03),
        
        # 학사/스케줄
        quick_task("L007", "반배정", "학사팀", 15, 7500, 0.08),
        quick_task("L008", "시간표작성", "학사팀", 20, 10000, 0.10),
        quick_task("L009", "강의실배정", "학사팀", 10, 5000, 0.05),
        quick_task("L010", "강사배정", "학사팀", 10, 5000, 0.05),
        quick_task("L011", "보강관리", "학사팀", 15, 7500, 0.08),
        quick_task("L012", "휴강관리", "학사팀", 10, 5000, 0.05),
        
        # 출결/행정
        quick_task("L013", "출석부생성", "행정팀", 15, 7500, 0.03),
        quick_task("L014", "출석호명", "교사", 5, 2500, 0.02),
        quick_task("L015", "출석입력", "교사", 3, 1500, 0.05),
        quick_task("L016", "결석연락", "행정팀", 10, 5000, 0.03),
        quick_task("L017", "출결통계", "행정팀", 20, 10000, 0.05),
        
        # 교육/기록
        quick_task("L018", "수업일지작성", "교사", 15, 7500, 0.05),
        quick_task("L019", "진도체크", "교사", 5, 2500, 0.03),
        quick_task("L020", "생활기록부작성", "교사", 30, 15000, 0.05),
        quick_task("L021", "발달기록작성", "교사", 20, 10000, 0.08),
        quick_task("L022", "평가채점", "교사", 20, 10000, 0.05),
        quick_task("L023", "성적입력", "행정팀", 10, 5000, 0.08),
        quick_task("L024", "성적표발행", "행정팀", 15, 7500, 0.03),
        
        # 학부모 커뮤니케이션
        quick_task("L025", "알림장작성", "교사", 10, 5000, 0.05),
        quick_task("L026", "리포트작성", "교사", 20, 10000, 0.08),
        quick_task("L027", "학부모상담", "교사", 30, 15000, 0.05),
        quick_task("L028", "상담기록작성", "교사", 10, 5000, 0.05),
        quick_task("L029", "SMS발송", "행정팀", 5, 2500, 0.02),
        quick_task("L030", "공지발송", "행정팀", 10, 5000, 0.03),
        
        # CS/영업
        quick_task("L031", "문의응대", "CS팀", 10, 5000, 0.03),
        quick_task("L032", "상담예약", "CS팀", 5, 2500, 0.02),
        quick_task("L033", "체험수업안내", "영업팀", 15, 7500, 0.05),
        quick_task("L034", "등록안내", "영업팀", 20, 10000, 0.05),
        quick_task("L035", "CRM입력", "영업팀", 10, 5000, 0.10),
        quick_task("L036", "만족도조사", "CS팀", 15, 7500, 0.05),
        quick_task("L037", "재등록안내", "영업팀", 15, 7500, 0.05),
        quick_task("L038", "이탈방지", "CS팀", 20, 10000, 0.08),
        
        # 강사관리
        quick_task("L039", "강사평가", "학사팀", 20, 10000, 0.05),
        quick_task("L040", "강사급여계산", "재무팀", 30, 15000, 0.03),
    ]
    
    legacy_flows = [
        {
            "name": "신규등록 프로세스",
            "steps": ["문의응대", "상담예약", "체험수업안내", "등록안내", 
                     "수납확인", "수납입력", "영수증발행", "반배정", 
                     "시간표작성", "강의실배정", "강사배정", "출석부생성",
                     "생활기록부작성", "CRM입력", "알림장작성"],
            "duration_total": 180,
            "handoffs": 6
        },
        {
            "name": "일일 수업 프로세스",
            "steps": ["출석호명", "출석입력", "수업일지작성", "진도체크", "발달기록작성"],
            "duration_total": 48,
            "handoffs": 0
        },
        {
            "name": "월간 보고 프로세스",
            "steps": ["출결통계", "성적입력", "성적표발행", "리포트작성", 
                     "학부모상담", "상담기록작성"],
            "duration_total": 105,
            "handoffs": 2
        }
    ]
    
    builder.collect_legacy_tasks(legacy_tasks)
    builder.collect_legacy_flows(legacy_flows)
    
    # Stage 2: 재정의
    builder.define_core_triggers([TriggerType.PAYMENT, TriggerType.SERVICE])
    
    # 결제 트리거 체인
    payment_chain = TriggerChain(
        trigger_type=TriggerType.PAYMENT,
        trigger_name="결제 완료",
        trigger_description="수강료 결제 시 전체 등록 프로세스 자동 완료",
        actions=[
            ChainAction("P01", "수납/증빙 자동처리", ChainResult.RECORD,
                       outputs=["수납내역", "영수증", "세금계산서"],
                       absorbed_tasks=["수납확인", "수납입력", "영수증발행", "세금계산서발행"]),
            
            ChainAction("P02", "스케줄 자동생성", ChainResult.SCHEDULE,
                       outputs=["개인시간표", "강사시간표", "강의실배정"],
                       absorbed_tasks=["반배정", "시간표작성", "강의실배정", "강사배정"]),
            
            ChainAction("P03", "학습환경 자동구축", ChainResult.PROVISION,
                       outputs=["출석부", "생활기록부", "학습카드"],
                       absorbed_tasks=["출석부생성", "생활기록부작성"]),
            
            ChainAction("P04", "온보딩 자동발송", ChainResult.NOTIFICATION,
                       outputs=["환영메시지", "앱초대", "오리엔테이션"],
                       absorbed_tasks=["등록안내", "알림장작성"]),
            
            ChainAction("P05", "CRM 자동연동", ChainResult.INTEGRATION,
                       outputs=["고객프로필", "구매이력", "세그먼트"],
                       absorbed_tasks=["CRM입력"]),
            
            ChainAction("P06", "CS 자동예약", ChainResult.SCHEDULE,
                       outputs=["만족도조사일정", "재등록알림일정"],
                       condition="결제+7일",
                       absorbed_tasks=["만족도조사", "재등록안내"]),
        ]
    )
    
    # 수업 트리거 체인
    class_chain = TriggerChain(
        trigger_type=TriggerType.SERVICE,
        trigger_name="수업 수행",
        trigger_description="수업 시작 시 전체 기록/분석 자동 완료",
        actions=[
            ChainAction("C01", "출결 자동처리", ChainResult.RECORD,
                       outputs=["실시간출석", "지각알림", "결석알림"],
                       absorbed_tasks=["출석호명", "출석입력", "결석연락", "출결통계"]),
            
            ChainAction("C02", "수업기록 자동화", ChainResult.RECORD,
                       outputs=["수업일지", "진도기록", "교안이력"],
                       absorbed_tasks=["수업일지작성", "진도체크"]),
            
            ChainAction("C03", "학습데이터 자동수집", ChainResult.ANALYSIS,
                       outputs=["이해도분석", "참여도분석", "성취도추적"],
                       absorbed_tasks=["평가채점", "성적입력", "성적표발행"]),
            
            ChainAction("C04", "발달기록 자동갱신", ChainResult.RECORD,
                       outputs=["발달추이", "역량그래프", "성장예측"],
                       absorbed_tasks=["발달기록작성"]),
            
            ChainAction("C05", "학부모리포트 자동발송", ChainResult.NOTIFICATION,
                       outputs=["일일리포트", "주간리포트", "월간리포트"],
                       absorbed_tasks=["알림장작성", "리포트작성", "SMS발송"]),
            
            ChainAction("C06", "AI학습분석", ChainResult.ANALYSIS,
                       outputs=["맞춤학습경로", "취약점분석", "성취예측"],
                       absorbed_tasks=[]),  # 신규 추가 가치
            
            ChainAction("C07", "강사피드백 자동수집", ChainResult.RECORD,
                       outputs=["수업품질분석", "강사평가"],
                       absorbed_tasks=["강사평가"]),
        ]
    )
    
    builder.define_trigger_chain(payment_chain)
    builder.define_trigger_chain(class_chain)
    builder.map_tasks_to_chains()
    
    # Stage 3: 자동화
    builder.implement_automation()
    
    # Stage 4: 삭제화
    builder.eliminate_tasks()
    
    builder.define_final_outputs(
        outputs=[
            "완전 자동화된 수납/증빙 시스템",
            "AI 최적화 스케줄링",
            "실시간 출결 대시보드",
            "자동 생성 학습기록",
            "실시간 학부모 리포팅",
            "통합 CRM 프로필",
            "자동 강사 평가 시스템",
        ],
        added_value=[
            "AI 기반 개인 맞춤 학습 경로",
            "예측 기반 성취도 분석",
            "이탈 예측 및 자동 개입",
            "동료 비교 벤치마킹",
            "최적 학습 시간대 분석",
            "장기 성장 예측 모델",
        ]
    )
    
    return builder.build()


# =============================================================================
# 의료 서비스업 턴키 솔루션
# =============================================================================

def create_medical_turnkey() -> TurnkeyFramework:
    """의료 서비스업 턴키 솔루션"""
    
    builder = TurnkeyBuilder(
        industry="의료 서비스업",
        solution_name="MedOS - 의료 운영 시스템"
    )
    
    legacy_tasks = [
        # 접수/원무
        quick_task("M001", "예약접수", "접수", 5, 2500, 0.02),
        quick_task("M002", "환자등록", "접수", 10, 5000, 0.03),
        quick_task("M003", "보험확인", "원무", 5, 2500, 0.05),
        quick_task("M004", "수납처리", "원무", 5, 2500, 0.02),
        quick_task("M005", "영수증발행", "원무", 3, 1500, 0.01),
        
        # 진료
        quick_task("M006", "차트준비", "간호", 5, 2500, 0.03),
        quick_task("M007", "바이탈측정", "간호", 10, 5000, 0.02),
        quick_task("M008", "차트기록", "의사", 10, 5000, 0.05),
        quick_task("M009", "처방입력", "의사", 5, 2500, 0.03),
        quick_task("M010", "검사오더", "의사", 5, 2500, 0.03),
        
        # 청구/보험
        quick_task("M011", "진료비계산", "원무", 10, 5000, 0.05),
        quick_task("M012", "보험청구", "보험", 20, 10000, 0.08),
        quick_task("M013", "실손청구", "보험", 15, 7500, 0.05),
        
        # 안내/CS
        quick_task("M014", "예약안내", "CS", 5, 2500, 0.02),
        quick_task("M015", "복약안내", "간호", 10, 5000, 0.03),
        quick_task("M016", "재진안내", "CS", 5, 2500, 0.02),
    ]
    
    builder.collect_legacy_tasks(legacy_tasks)
    builder.define_core_triggers([TriggerType.RESERVATION, TriggerType.SERVICE])
    
    # 예약 트리거
    reservation_chain = TriggerChain(
        trigger_type=TriggerType.RESERVATION,
        trigger_name="예약 완료",
        actions=[
            ChainAction("R01", "환자정보 자동등록", ChainResult.RECORD,
                       outputs=["환자카드", "보험정보"],
                       absorbed_tasks=["환자등록", "보험확인"]),
            ChainAction("R02", "차트 자동준비", ChainResult.PROVISION,
                       outputs=["전자차트", "과거이력"],
                       absorbed_tasks=["차트준비"]),
            ChainAction("R03", "예약알림 발송", ChainResult.NOTIFICATION,
                       outputs=["예약확인SMS", "내원안내"],
                       absorbed_tasks=["예약안내"]),
        ]
    )
    
    # 진료 트리거
    service_chain = TriggerChain(
        trigger_type=TriggerType.SERVICE,
        trigger_name="진료 수행",
        actions=[
            ChainAction("S01", "바이탈 자동기록", ChainResult.RECORD,
                       outputs=["바이탈데이터", "건강추이"],
                       absorbed_tasks=["바이탈측정", "차트기록"]),
            ChainAction("S02", "처방 자동처리", ChainResult.RECORD,
                       outputs=["처방전", "검사오더"],
                       absorbed_tasks=["처방입력", "검사오더"]),
            ChainAction("S03", "수납/청구 자동화", ChainResult.PAYMENT,
                       outputs=["진료비명세서", "영수증", "보험청구서"],
                       absorbed_tasks=["진료비계산", "수납처리", "영수증발행", "보험청구"]),
            ChainAction("S04", "복약/재진 안내", ChainResult.NOTIFICATION,
                       outputs=["복약안내", "재진예약알림"],
                       absorbed_tasks=["복약안내", "재진안내"]),
        ]
    )
    
    builder.define_trigger_chain(reservation_chain)
    builder.define_trigger_chain(service_chain)
    builder.map_tasks_to_chains()
    builder.implement_automation()
    builder.eliminate_tasks()
    
    builder.define_final_outputs(
        outputs=[
            "원스톱 예약-접수-진료-수납",
            "자동 보험청구 시스템",
            "실시간 진료 대시보드",
            "통합 환자 건강기록",
        ],
        added_value=[
            "AI 기반 진단 보조",
            "예측 기반 재진 알림",
            "환자 건강 트렌드 분석",
        ]
    )
    
    return builder.build()


# =============================================================================
# 물류 서비스업 턴키 솔루션
# =============================================================================

def create_logistics_turnkey() -> TurnkeyFramework:
    """물류 서비스업 턴키 솔루션"""
    
    builder = TurnkeyBuilder(
        industry="물류 서비스업",
        solution_name="LogiOS - 물류 운영 시스템"
    )
    
    legacy_tasks = [
        # 주문
        quick_task("G001", "주문접수", "주문팀", 5, 2500, 0.02),
        quick_task("G002", "재고확인", "재고팀", 10, 5000, 0.05),
        quick_task("G003", "출고지시", "출고팀", 5, 2500, 0.03),
        quick_task("G004", "피킹", "출고팀", 15, 7500, 0.05),
        quick_task("G005", "패킹", "출고팀", 10, 5000, 0.03),
        quick_task("G006", "송장발행", "출고팀", 3, 1500, 0.02),
        
        # 배송
        quick_task("G007", "배차배정", "배송팀", 10, 5000, 0.05),
        quick_task("G008", "배송출발", "배송팀", 5, 2500, 0.02),
        quick_task("G009", "배송완료", "배송팀", 5, 2500, 0.03),
        quick_task("G010", "POD수집", "배송팀", 5, 2500, 0.05),
        
        # 정산
        quick_task("G011", "배송비정산", "정산팀", 15, 7500, 0.05),
        quick_task("G012", "대금청구", "정산팀", 10, 5000, 0.03),
    ]
    
    builder.collect_legacy_tasks(legacy_tasks)
    builder.define_core_triggers([TriggerType.ORDER, TriggerType.DELIVERY])
    
    # 주문 트리거
    order_chain = TriggerChain(
        trigger_type=TriggerType.ORDER,
        trigger_name="주문 접수",
        actions=[
            ChainAction("O01", "재고/출고 자동처리", ChainResult.PROVISION,
                       outputs=["재고차감", "출고지시서", "피킹리스트"],
                       absorbed_tasks=["재고확인", "출고지시", "피킹"]),
            ChainAction("O02", "포장/송장 자동화", ChainResult.RECORD,
                       outputs=["패킹완료", "운송장"],
                       absorbed_tasks=["패킹", "송장발행"]),
            ChainAction("O03", "배차 자동배정", ChainResult.SCHEDULE,
                       outputs=["배차스케줄", "최적경로"],
                       absorbed_tasks=["배차배정"]),
        ]
    )
    
    # 배송 트리거
    delivery_chain = TriggerChain(
        trigger_type=TriggerType.DELIVERY,
        trigger_name="배송 완료",
        actions=[
            ChainAction("D01", "POD 자동수집", ChainResult.RECORD,
                       outputs=["배송증명", "수령사인"],
                       absorbed_tasks=["배송완료", "POD수집"]),
            ChainAction("D02", "정산 자동처리", ChainResult.PAYMENT,
                       outputs=["배송비정산서", "청구서"],
                       absorbed_tasks=["배송비정산", "대금청구"]),
            ChainAction("D03", "배송알림 발송", ChainResult.NOTIFICATION,
                       outputs=["배송완료알림", "만족도조사"],
                       absorbed_tasks=[]),
        ]
    )
    
    builder.define_trigger_chain(order_chain)
    builder.define_trigger_chain(delivery_chain)
    builder.map_tasks_to_chains()
    builder.implement_automation()
    builder.eliminate_tasks()
    
    builder.define_final_outputs(
        outputs=[
            "원클릭 주문-출고-배송",
            "실시간 배송 추적",
            "자동 정산 시스템",
        ],
        added_value=[
            "AI 배차 최적화",
            "수요 예측 기반 재고 관리",
            "배송 SLA 예측",
        ]
    )
    
    return builder.build()
