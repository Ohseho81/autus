"""
Google Sheets 설정
"""

# 시트 이름 매핑
SHEET_NAMES = {
    "persons": "인력",
    "finance": "재정",
    "partners": "파트너",
    "issues": "이슈",
    "dashboard": "대시보드"
}

# 물리량 계산 상수
PHYSICS_CONSTANTS = {
    "output_per_person": 5_000_000,      # 재학생 1인당 가치
    "quality_per_employed": 1_000_000,   # 취업자 1인당 가치
    "shock_per_dropout": 20_000_000,     # 이탈자 1인당 손실
    "friction_per_issue": 500_000,       # 이슈 1건당 비용
    "cohesion_per_partner": 10_000_000,  # 파트너 1개당 가치
}

# GATE 임계값
GATE_THRESHOLDS = {
    "green_max_risk": 30,
    "amber_max_risk": 60,
    # 그 이상은 RED
}

# 상태 매핑 (한글 → 영문)
STATUS_MAP = {
    "persons": {
        "재학중": "active",
        "인턴중": "intern",
        "취업": "employed",
        "이탈": "dropout",
        "대기": "waiting",
        "졸업": "graduated"
    },
    "partners": {
        "활성": "active",
        "협의중": "negotiating",
        "종료": "ended"
    },
    "issues": {
        "신규": "new",
        "진행중": "in_progress",
        "해결": "resolved",
        "미해결": "unresolved"
    }
}
