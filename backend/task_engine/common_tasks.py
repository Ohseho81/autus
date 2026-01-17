"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS - 공통 엔진 50개 (Layer 1)
═══════════════════════════════════════════════════════════════════════════════

모든 업무의 기반이 되는 50개 공통 기능
카테고리: AUTH, NOTIFY, LOG, DATA, SCHEDULE, ENERGY
"""

from .models import TaskDefinition, TaskLayer, UserType

# ═══════════════════════════════════════════════════════════════════════════════
# 공통 엔진 50개 정의
# ═══════════════════════════════════════════════════════════════════════════════

COMMON_ENGINE_50: list[TaskDefinition] = [
    
    # ─────────────────────────────────────────────────────────────────────────
    # 인증 & 보안 (AUTH) - 8개
    # ─────────────────────────────────────────────────────────────────────────
    TaskDefinition(
        task_id="L1_AUTH_001",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="TOKEN",
        name_en="OAuth2 Token Issue",
        name_ko="OAuth2 토큰 발행",
        description="OAuth2 액세스 토큰 발행 및 갱신. K 낮으면 2FA 자동 추가.",
        base_k=1.2,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.5,
        external_tool="internal",
        api_endpoint="/api/auth/token"
    ),
    TaskDefinition(
        task_id="L1_AUTH_002",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="TOKEN",
        name_en="JWT Verification",
        name_ko="JWT 검증",
        description="JWT 토큰 유효성 검증",
        base_k=1.5,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.2,
        external_tool="internal",
        api_endpoint="/api/auth/verify"
    ),
    TaskDefinition(
        task_id="L1_AUTH_003",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="2FA",
        name_en="2FA Setup",
        name_ko="2단계 인증 설정",
        description="TOTP/SMS 기반 2FA 설정. 보안 강화로 K 상승.",
        base_k=1.0,
        base_i=0.1,
        base_r=0.0,
        automation_level=80,
        energy_cost=1.0,
        external_tool="internal",
        api_endpoint="/api/auth/2fa/setup"
    ),
    TaskDefinition(
        task_id="L1_AUTH_004",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="2FA",
        name_en="2FA Verify",
        name_ko="2단계 인증 검증",
        description="2FA 코드 검증",
        base_k=1.3,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.3,
        external_tool="internal",
        api_endpoint="/api/auth/2fa/verify"
    ),
    TaskDefinition(
        task_id="L1_AUTH_005",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="SESSION",
        name_en="Session Management",
        name_ko="세션 관리",
        description="사용자 세션 생성/종료/연장",
        base_k=1.1,
        base_i=0.0,
        base_r=0.0,
        automation_level=90,
        energy_cost=0.4,
        external_tool="redis"
    ),
    TaskDefinition(
        task_id="L1_AUTH_006",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="PERMISSION",
        name_en="Role Assignment",
        name_ko="역할 할당",
        description="RBAC 기반 역할 할당. 팀에서 I 상승.",
        base_k=0.9,
        base_i=0.2,
        base_r=0.0,
        automation_level=70,
        energy_cost=0.8,
        external_tool="internal",
        api_endpoint="/api/auth/roles"
    ),
    TaskDefinition(
        task_id="L1_AUTH_007",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="PERMISSION",
        name_en="Permission Check",
        name_ko="권한 검사",
        description="리소스 접근 권한 검사",
        base_k=1.4,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.2,
        external_tool="internal",
        api_endpoint="/api/auth/permissions"
    ),
    TaskDefinition(
        task_id="L1_AUTH_008",
        layer=TaskLayer.COMMON,
        category="AUTH",
        subcategory="AUDIT",
        name_en="Security Audit Log",
        name_ko="보안 감사 로그",
        description="보안 이벤트 감사 로깅",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.3,
        external_tool="internal",
        api_endpoint="/api/audit/security"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 알림 발송 (NOTIFY) - 10개
    # ─────────────────────────────────────────────────────────────────────────
    TaskDefinition(
        task_id="L1_NOTIFY_001",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="EMAIL",
        name_en="Email Send",
        name_ko="이메일 발송",
        description="트랜잭션 이메일 발송. I 음수 시 톤 완화.",
        base_k=0.8,
        base_i=0.1,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.6,
        external_tool="sendgrid",
        api_endpoint="https://api.sendgrid.com/v3/mail/send"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_002",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="EMAIL",
        name_en="Email Template Render",
        name_ko="이메일 템플릿 렌더링",
        description="동적 이메일 템플릿 생성",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=90,
        energy_cost=0.4,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_003",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="SMS",
        name_en="SMS Send",
        name_ko="SMS 발송",
        description="SMS/MMS 메시지 발송",
        base_k=0.7,
        base_i=0.0,
        base_r=0.0,
        automation_level=90,
        energy_cost=0.8,
        external_tool="twilio",
        api_endpoint="https://api.twilio.com/2010-04-01/Messages"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_004",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="PUSH",
        name_en="Push Notification",
        name_ko="푸시 알림",
        description="모바일/웹 푸시 알림. K 낮으면 빈도 자동 감소.",
        base_k=0.9,
        base_i=0.1,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.5,
        external_tool="firebase",
        api_endpoint="https://fcm.googleapis.com/fcm/send"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_005",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="SLACK",
        name_en="Slack Message",
        name_ko="Slack 메시지",
        description="Slack 채널/DM 메시지. I 기반 시너지 반영.",
        base_k=0.8,
        base_i=0.3,
        base_r=0.0,
        automation_level=90,
        energy_cost=0.4,
        external_tool="slack",
        api_endpoint="https://slack.com/api/chat.postMessage"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_006",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="SLACK",
        name_en="Slack Interactive",
        name_ko="Slack 인터랙티브",
        description="Slack 버튼/모달 응답",
        base_k=0.9,
        base_i=0.2,
        base_r=0.0,
        automation_level=85,
        energy_cost=0.5,
        external_tool="slack",
        api_endpoint="https://slack.com/api/views.open"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_007",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="WEBHOOK",
        name_en="Webhook Call",
        name_ko="웹훅 호출",
        description="외부 서비스 웹훅 트리거",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.3,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_008",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="IN_APP",
        name_en="In-App Notification",
        name_ko="인앱 알림",
        description="앱 내 알림 생성",
        base_k=1.1,
        base_i=0.1,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.3,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_009",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="BATCH",
        name_en="Batch Notification",
        name_ko="일괄 알림",
        description="대량 알림 일괄 발송. 에너지 효율 최적화.",
        base_k=0.6,
        base_i=0.0,
        base_r=0.0,
        automation_level=85,
        energy_cost=2.0,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_NOTIFY_010",
        layer=TaskLayer.COMMON,
        category="NOTIFY",
        subcategory="PREFERENCE",
        name_en="Notification Preference",
        name_ko="알림 설정 관리",
        description="사용자 알림 선호도 관리. 개인화 기반.",
        base_k=0.9,
        base_i=0.1,
        base_r=0.0,
        automation_level=70,
        energy_cost=0.5,
        external_tool="internal"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 로그 수집 (LOG) - 8개
    # ─────────────────────────────────────────────────────────────────────────
    TaskDefinition(
        task_id="L1_LOG_001",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="EVENT",
        name_en="Event Logging",
        name_ko="이벤트 로깅",
        description="비즈니스 이벤트 원천 로깅. r<0 시 자동 소멸 후보.",
        base_k=1.2,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.2,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_LOG_002",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="EVENT",
        name_en="Event Replay",
        name_ko="이벤트 재생",
        description="이벤트 소싱 재생",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=80,
        energy_cost=1.5,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_LOG_003",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="METRIC",
        name_en="Metric Collection",
        name_ko="메트릭 수집",
        description="시스템/비즈니스 메트릭 수집",
        base_k=1.1,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.3,
        external_tool="prometheus",
        api_endpoint="http://prometheus:9090/api/v1/write"
    ),
    TaskDefinition(
        task_id="L1_LOG_004",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="TRACE",
        name_en="Distributed Tracing",
        name_ko="분산 추적",
        description="요청 흐름 분산 추적",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.4,
        external_tool="jaeger",
        api_endpoint="http://jaeger:14268/api/traces"
    ),
    TaskDefinition(
        task_id="L1_LOG_005",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="ERROR",
        name_en="Error Capture",
        name_ko="에러 캡처",
        description="에러/예외 자동 캡처. K 유지에 필수.",
        base_k=1.3,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.3,
        external_tool="sentry",
        api_endpoint="https://sentry.io/api/"
    ),
    TaskDefinition(
        task_id="L1_LOG_006",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="AUDIT",
        name_en="Audit Trail",
        name_ko="감사 추적",
        description="변경 이력 감사 로그",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.3,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_LOG_007",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="ARCHIVE",
        name_en="Log Archive",
        name_ko="로그 아카이브",
        description="오래된 로그 아카이빙. 자연 쇠퇴 적용.",
        base_k=0.8,
        base_i=0.0,
        base_r=-0.01,  # 자연 쇠퇴
        automation_level=90,
        energy_cost=1.0,
        external_tool="databricks",
        api_endpoint="https://databricks.com/api/archive"
    ),
    TaskDefinition(
        task_id="L1_LOG_008",
        layer=TaskLayer.COMMON,
        category="LOG",
        subcategory="SEARCH",
        name_en="Log Search",
        name_ko="로그 검색",
        description="통합 로그 검색",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=85,
        energy_cost=0.6,
        external_tool="elasticsearch",
        api_endpoint="http://elasticsearch:9200/_search"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 데이터 저장 (DATA) - 10개
    # ─────────────────────────────────────────────────────────────────────────
    TaskDefinition(
        task_id="L1_DATA_001",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="CRUD",
        name_en="Data Create",
        name_ko="데이터 생성",
        description="엔티티 데이터 생성",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.5,
        external_tool="postgres"
    ),
    TaskDefinition(
        task_id="L1_DATA_002",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="CRUD",
        name_en="Data Read",
        name_ko="데이터 조회",
        description="엔티티 데이터 조회",
        base_k=1.2,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.2,
        external_tool="postgres"
    ),
    TaskDefinition(
        task_id="L1_DATA_003",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="CRUD",
        name_en="Data Update",
        name_ko="데이터 수정",
        description="엔티티 데이터 업데이트",
        base_k=0.9,
        base_i=0.0,
        base_r=0.0,
        automation_level=90,
        energy_cost=0.5,
        external_tool="postgres"
    ),
    TaskDefinition(
        task_id="L1_DATA_004",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="CRUD",
        name_en="Data Delete",
        name_ko="데이터 삭제",
        description="엔티티 데이터 삭제 (소프트). 자연 소멸.",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=85,
        energy_cost=0.4,
        external_tool="postgres"
    ),
    TaskDefinition(
        task_id="L1_DATA_005",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="CACHE",
        name_en="Cache Set",
        name_ko="캐시 저장",
        description="Redis 캐시 저장. K 향상.",
        base_k=1.3,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.1,
        external_tool="redis"
    ),
    TaskDefinition(
        task_id="L1_DATA_006",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="CACHE",
        name_en="Cache Invalidate",
        name_ko="캐시 무효화",
        description="Redis 캐시 무효화",
        base_k=1.2,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.1,
        external_tool="redis"
    ),
    TaskDefinition(
        task_id="L1_DATA_007",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="FILE",
        name_en="File Upload",
        name_ko="파일 업로드",
        description="S3/GCS 파일 업로드. 개인 타입은 K 기반 압축.",
        base_k=0.8,
        base_i=0.0,
        base_r=0.0,
        automation_level=90,
        energy_cost=1.0,
        external_tool="s3",
        api_endpoint="https://s3.amazonaws.com/"
    ),
    TaskDefinition(
        task_id="L1_DATA_008",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="FILE",
        name_en="File Download",
        name_ko="파일 다운로드",
        description="S3/GCS 파일 다운로드",
        base_k=0.9,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.8,
        external_tool="s3",
        api_endpoint="https://s3.amazonaws.com/"
    ),
    TaskDefinition(
        task_id="L1_DATA_009",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="SYNC",
        name_en="Data Sync",
        name_ko="데이터 동기화",
        description="외부 시스템 데이터 동기화. I 상승.",
        base_k=0.7,
        base_i=0.2,
        base_r=0.0,
        automation_level=80,
        energy_cost=1.5,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_DATA_010",
        layer=TaskLayer.COMMON,
        category="DATA",
        subcategory="BACKUP",
        name_en="Data Backup",
        name_ko="데이터 백업",
        description="자동 데이터 백업. 안정성 기여.",
        base_k=0.9,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=1.2,
        external_tool="databricks",
        api_endpoint="https://databricks.com/api/backup"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 스케줄링 (SCHEDULE) - 6개
    # ─────────────────────────────────────────────────────────────────────────
    TaskDefinition(
        task_id="L1_SCHED_001",
        layer=TaskLayer.COMMON,
        category="SCHEDULE",
        subcategory="CRON",
        name_en="Cron Job Create",
        name_ko="크론잡 생성",
        description="반복 작업 스케줄 생성",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=85,
        energy_cost=0.5,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_SCHED_002",
        layer=TaskLayer.COMMON,
        category="SCHEDULE",
        subcategory="CRON",
        name_en="Cron Job Execute",
        name_ko="크론잡 실행",
        description="스케줄된 작업 실행",
        base_k=1.1,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.6,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_SCHED_003",
        layer=TaskLayer.COMMON,
        category="SCHEDULE",
        subcategory="DELAY",
        name_en="Delayed Task",
        name_ko="지연 작업",
        description="특정 시간 후 작업 실행",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.3,
        external_tool="redis"
    ),
    TaskDefinition(
        task_id="L1_SCHED_004",
        layer=TaskLayer.COMMON,
        category="SCHEDULE",
        subcategory="QUEUE",
        name_en="Task Queue",
        name_ko="작업 큐",
        description="비동기 작업 큐 관리",
        base_k=1.1,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.4,
        external_tool="redis"
    ),
    TaskDefinition(
        task_id="L1_SCHED_005",
        layer=TaskLayer.COMMON,
        category="SCHEDULE",
        subcategory="WORKFLOW",
        name_en="Workflow Trigger",
        name_ko="워크플로 트리거",
        description="복합 워크플로 트리거. Databricks/외부 연동.",
        base_k=0.9,
        base_i=0.1,
        base_r=0.0,
        automation_level=80,
        energy_cost=1.0,
        external_tool="databricks",
        api_endpoint="https://databricks.com/api/jobs/run"
    ),
    TaskDefinition(
        task_id="L1_SCHED_006",
        layer=TaskLayer.COMMON,
        category="SCHEDULE",
        subcategory="RETRY",
        name_en="Retry Handler",
        name_ko="재시도 처리",
        description="실패 작업 자동 재시도. K 유지에 기여.",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.5,
        external_tool="internal"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 에너지 관리 (ENERGY) - 8개
    # ─────────────────────────────────────────────────────────────────────────
    TaskDefinition(
        task_id="L1_ENERGY_001",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="MEASURE",
        name_en="Energy Measure",
        name_ko="에너지 측정",
        description="업무별 에너지 소비 측정",
        base_k=1.0,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.1,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_ENERGY_002",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="BALANCE",
        name_en="Energy Balance Check",
        name_ko="에너지 균형 체크",
        description="K 상수 기반 에너지 균형 검사",
        base_k=1.2,
        base_i=0.0,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.2,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_ENERGY_003",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="OPTIMIZE",
        name_en="Energy Optimize",
        name_ko="에너지 최적화",
        description="K < 1 시 자동화 레벨 조정으로 최적화",
        base_k=0.9,
        base_i=0.0,
        base_r=0.0,
        automation_level=80,
        energy_cost=0.5,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_ENERGY_004",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="ALERT",
        name_en="Low Energy Alert",
        name_ko="저에너지 경고",
        description="K 임계값 도달 시 알림. 개인화 반영.",
        base_k=1.0,
        base_i=0.1,
        base_r=0.0,
        automation_level=90,
        energy_cost=0.2,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_ENERGY_005",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="DECAY",
        name_en="Decay Calculator",
        name_ko="쇠퇴 계산기",
        description="r 지수 기반 쇠퇴율 계산. 자연 소멸 로직.",
        base_k=1.1,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.1,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_ENERGY_006",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="GROWTH",
        name_en="Growth Calculator",
        name_ko="성장 계산기",
        description="r 지수 기반 성장율 계산. 지수 증폭 로직.",
        base_k=1.1,
        base_i=0.0,
        base_r=0.0,
        automation_level=100,
        energy_cost=0.1,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_ENERGY_007",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="SYNERGY",
        name_en="Synergy Calculator",
        name_ko="시너지 계산기",
        description="I 상수 기반 노드 간 시너지/갈등 계산",
        base_k=1.0,
        base_i=0.2,
        base_r=0.0,
        automation_level=95,
        energy_cost=0.2,
        external_tool="internal"
    ),
    TaskDefinition(
        task_id="L1_ENERGY_008",
        layer=TaskLayer.COMMON,
        category="ENERGY",
        subcategory="REPORT",
        name_en="Energy Report",
        name_ko="에너지 리포트",
        description="일/주/월 에너지 리포트 생성",
        base_k=0.8,
        base_i=0.0,
        base_r=0.0,
        automation_level=85,
        energy_cost=0.5,
        external_tool="internal"
    ),
]


# ═══════════════════════════════════════════════════════════════════════════════
# 카테고리별 조회 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_tasks_by_category(category: str) -> list[TaskDefinition]:
    """카테고리별 업무 조회"""
    return [t for t in COMMON_ENGINE_50 if t.category == category]


def get_tasks_by_user_type(user_type: UserType) -> list[TaskDefinition]:
    """사용자 타입별 활성 업무 조회"""
    return [t for t in COMMON_ENGINE_50 if user_type in t.enabled_types]


def get_high_energy_tasks() -> list[TaskDefinition]:
    """에너지 소비 높은 업무 (> 1.0)"""
    return [t for t in COMMON_ENGINE_50 if t.energy_cost > 1.0]


def get_decaying_tasks() -> list[TaskDefinition]:
    """쇠퇴 중인 업무 (base_r < 0)"""
    return [t for t in COMMON_ENGINE_50 if t.base_r < 0]


# 카테고리 요약
CATEGORY_SUMMARY = {
    "AUTH": {"count": 8, "avg_k": 1.175, "description": "인증 & 보안"},
    "NOTIFY": {"count": 10, "avg_k": 0.87, "description": "알림 발송"},
    "LOG": {"count": 8, "avg_k": 1.05, "description": "로그 수집"},
    "DATA": {"count": 10, "avg_k": 0.99, "description": "데이터 저장"},
    "SCHEDULE": {"count": 6, "avg_k": 1.02, "description": "스케줄링"},
    "ENERGY": {"count": 8, "avg_k": 1.01, "description": "에너지 관리"},
}
