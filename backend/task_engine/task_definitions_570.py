"""
AUTUS 570개 업무 정의
8그룹 × 타입별 전체 업무 목록

구조:
- 그룹 1: 고반복 정형 (85개)
- 그룹 2: 반구조화 문서 (70개)
- 그룹 3: 승인 워크플로 (85개)
- 그룹 4: 고객·영업 (60개)
- 그룹 5: 재무·회계 (55개)
- 그룹 6: HR·인사 (60개)
- 그룹 7: IT·운영 (55개)
- 그룹 8: 전략·판단 (100개)
Total: 570개
"""

TASK_DEFINITIONS = {
    # ==========================================================================
    # 그룹 1: 고반복 정형 데이터 처리 (85개)
    # ==========================================================================
    "GROUP_1_HIGH_REPEAT_STRUCTURED": {
        "group_name": "고반복_정형",
        "group_name_en": "High Repeat Structured",
        "layer": "엣지커넥터",
        "task_count": 85,
        "tasks": [
            # 송장/인보이스 (15개)
            {"id": "G1_001", "name": "송장 처리", "name_en": "Invoice Processing", "types": ["단순전달", "검증형", "다중승인"]},
            {"id": "G1_002", "name": "송장 생성", "name_en": "Invoice Generation", "types": ["정기", "수시", "프로포마"]},
            {"id": "G1_003", "name": "송장 매칭", "name_en": "Invoice Matching", "types": ["2way", "3way", "4way"]},
            {"id": "G1_004", "name": "송장 검증", "name_en": "Invoice Validation", "types": ["금액", "수량", "세금"]},
            {"id": "G1_005", "name": "송장 아카이빙", "name_en": "Invoice Archiving", "types": ["자동", "수동", "법적보관"]},
            {"id": "G1_006", "name": "크레딧노트 처리", "name_en": "Credit Note Processing", "types": ["전액", "부분", "조건부"]},
            {"id": "G1_007", "name": "디빗노트 처리", "name_en": "Debit Note Processing", "types": ["추가청구", "조정", "페널티"]},
            {"id": "G1_008", "name": "송장 분쟁 처리", "name_en": "Invoice Dispute Handling", "types": ["금액", "품질", "납기"]},
            {"id": "G1_009", "name": "전자세금계산서 발행", "name_en": "E-Tax Invoice Issuance", "types": ["즉시", "배치", "수정"]},
            {"id": "G1_010", "name": "전자세금계산서 수신", "name_en": "E-Tax Invoice Reception", "types": ["자동", "수동확인", "반려"]},
            {"id": "G1_011", "name": "인보이스 번역", "name_en": "Invoice Translation", "types": ["자동", "검수", "공증"]},
            {"id": "G1_012", "name": "인보이스 통화변환", "name_en": "Invoice Currency Conversion", "types": ["실시간", "고정", "헤지"]},
            {"id": "G1_013", "name": "인보이스 분할", "name_en": "Invoice Splitting", "types": ["부서별", "프로젝트별", "비용항목별"]},
            {"id": "G1_014", "name": "인보이스 병합", "name_en": "Invoice Consolidation", "types": ["공급자별", "기간별", "프로젝트별"]},
            {"id": "G1_015", "name": "반복 인보이스 설정", "name_en": "Recurring Invoice Setup", "types": ["월간", "분기", "연간"]},
            
            # 데이터 입력/추출 (20개)
            {"id": "G1_016", "name": "데이터 입력", "name_en": "Data Entry", "types": ["수동", "반자동", "검증포함"]},
            {"id": "G1_017", "name": "데이터 추출", "name_en": "Data Extraction", "types": ["정형", "반정형", "API"]},
            {"id": "G1_018", "name": "데이터 정제", "name_en": "Data Cleansing", "types": ["중복제거", "형식통일", "결측처리"]},
            {"id": "G1_019", "name": "데이터 검증", "name_en": "Data Validation", "types": ["형식", "범위", "참조무결성"]},
            {"id": "G1_020", "name": "데이터 변환", "name_en": "Data Transformation", "types": ["포맷", "인코딩", "구조"]},
            {"id": "G1_021", "name": "데이터 매핑", "name_en": "Data Mapping", "types": ["필드", "코드", "계층"]},
            {"id": "G1_022", "name": "데이터 병합", "name_en": "Data Merging", "types": ["소스통합", "버전병합", "충돌해결"]},
            {"id": "G1_023", "name": "데이터 분할", "name_en": "Data Splitting", "types": ["조건별", "크기별", "배치별"]},
            {"id": "G1_024", "name": "데이터 마이그레이션", "name_en": "Data Migration", "types": ["일회성", "점진적", "실시간"]},
            {"id": "G1_025", "name": "데이터 백업", "name_en": "Data Backup", "types": ["전체", "증분", "차등"]},
            {"id": "G1_026", "name": "데이터 복원", "name_en": "Data Restoration", "types": ["전체", "부분", "시점"]},
            {"id": "G1_027", "name": "데이터 암호화", "name_en": "Data Encryption", "types": ["저장시", "전송시", "필드레벨"]},
            {"id": "G1_028", "name": "데이터 마스킹", "name_en": "Data Masking", "types": ["정적", "동적", "토큰화"]},
            {"id": "G1_029", "name": "데이터 품질 체크", "name_en": "Data Quality Check", "types": ["완전성", "정확성", "일관성"]},
            {"id": "G1_030", "name": "마스터 데이터 관리", "name_en": "Master Data Management", "types": ["생성", "변경", "폐기"]},
            {"id": "G1_031", "name": "참조 데이터 관리", "name_en": "Reference Data Management", "types": ["코드", "분류", "매핑"]},
            {"id": "G1_032", "name": "메타데이터 관리", "name_en": "Metadata Management", "types": ["기술적", "비즈니스", "운영"]},
            {"id": "G1_033", "name": "데이터 카탈로그 업데이트", "name_en": "Data Catalog Update", "types": ["자동", "수동", "승인"]},
            {"id": "G1_034", "name": "데이터 리니지 추적", "name_en": "Data Lineage Tracking", "types": ["소스", "변환", "소비"]},
            {"id": "G1_035", "name": "데이터 프로파일링", "name_en": "Data Profiling", "types": ["구조", "내용", "관계"]},
            
            # 보고서 생성 (15개)
            {"id": "G1_036", "name": "일일 보고서 생성", "name_en": "Daily Report Generation", "types": ["운영", "매출", "KPI"]},
            {"id": "G1_037", "name": "주간 보고서 생성", "name_en": "Weekly Report Generation", "types": ["요약", "상세", "비교"]},
            {"id": "G1_038", "name": "월간 보고서 생성", "name_en": "Monthly Report Generation", "types": ["재무", "운영", "성과"]},
            {"id": "G1_039", "name": "분기 보고서 생성", "name_en": "Quarterly Report Generation", "types": ["경영", "규제", "투자자"]},
            {"id": "G1_040", "name": "연간 보고서 생성", "name_en": "Annual Report Generation", "types": ["사업", "감사", "지속가능성"]},
            {"id": "G1_041", "name": "애드혹 보고서 생성", "name_en": "Ad-hoc Report Generation", "types": ["요청", "자동트리거", "예외"]},
            {"id": "G1_042", "name": "대시보드 업데이트", "name_en": "Dashboard Update", "types": ["실시간", "배치", "수동"]},
            {"id": "G1_043", "name": "KPI 계산", "name_en": "KPI Calculation", "types": ["재무", "운영", "고객"]},
            {"id": "G1_044", "name": "벤치마크 보고서", "name_en": "Benchmark Report", "types": ["내부", "산업", "경쟁사"]},
            {"id": "G1_045", "name": "예외 보고서", "name_en": "Exception Report", "types": ["임계값", "추세", "이상"]},
            {"id": "G1_046", "name": "감사 보고서", "name_en": "Audit Report", "types": ["내부", "외부", "규제"]},
            {"id": "G1_047", "name": "규제 보고서", "name_en": "Regulatory Report", "types": ["금융", "세무", "환경"]},
            {"id": "G1_048", "name": "보고서 배포", "name_en": "Report Distribution", "types": ["이메일", "포털", "API"]},
            {"id": "G1_049", "name": "보고서 스케줄링", "name_en": "Report Scheduling", "types": ["정기", "이벤트", "조건"]},
            {"id": "G1_050", "name": "보고서 아카이빙", "name_en": "Report Archiving", "types": ["자동", "버전관리", "법적보관"]},
            
            # 시스템 간 동기화 (15개)
            {"id": "G1_051", "name": "ERP-CRM 동기화", "name_en": "ERP-CRM Sync", "types": ["실시간", "배치", "양방향"]},
            {"id": "G1_052", "name": "HR-급여 동기화", "name_en": "HR-Payroll Sync", "types": ["월간", "변경시", "검증포함"]},
            {"id": "G1_053", "name": "재고 동기화", "name_en": "Inventory Sync", "types": ["실시간", "주기적", "이벤트"]},
            {"id": "G1_054", "name": "가격 동기화", "name_en": "Price Sync", "types": ["마스터", "채널별", "프로모션"]},
            {"id": "G1_055", "name": "고객 동기화", "name_en": "Customer Sync", "types": ["신규", "변경", "통합"]},
            {"id": "G1_056", "name": "제품 동기화", "name_en": "Product Sync", "types": ["마스터", "속성", "이미지"]},
            {"id": "G1_057", "name": "주문 동기화", "name_en": "Order Sync", "types": ["접수", "상태", "이력"]},
            {"id": "G1_058", "name": "결제 동기화", "name_en": "Payment Sync", "types": ["실시간", "정산", "조정"]},
            {"id": "G1_059", "name": "배송 동기화", "name_en": "Shipping Sync", "types": ["접수", "추적", "완료"]},
            {"id": "G1_060", "name": "계정과목 동기화", "name_en": "Chart of Accounts Sync", "types": ["생성", "변경", "폐기"]},
            {"id": "G1_061", "name": "환율 동기화", "name_en": "Exchange Rate Sync", "types": ["일일", "실시간", "고정"]},
            {"id": "G1_062", "name": "세율 동기화", "name_en": "Tax Rate Sync", "types": ["정기", "변경시", "지역별"]},
            {"id": "G1_063", "name": "캘린더 동기화", "name_en": "Calendar Sync", "types": ["양방향", "읽기전용", "선택적"]},
            {"id": "G1_064", "name": "연락처 동기화", "name_en": "Contact Sync", "types": ["전체", "그룹별", "변경분"]},
            {"id": "G1_065", "name": "파일 동기화", "name_en": "File Sync", "types": ["전체", "선택적", "버전관리"]},
            
            # 알림/통지 (10개)
            {"id": "G1_066", "name": "이메일 알림 발송", "name_en": "Email Notification", "types": ["즉시", "요약", "다이제스트"]},
            {"id": "G1_067", "name": "SMS 알림 발송", "name_en": "SMS Notification", "types": ["긴급", "마케팅", "인증"]},
            {"id": "G1_068", "name": "푸시 알림 발송", "name_en": "Push Notification", "types": ["앱", "웹", "데스크톱"]},
            {"id": "G1_069", "name": "슬랙 알림 발송", "name_en": "Slack Notification", "types": ["채널", "DM", "쓰레드"]},
            {"id": "G1_070", "name": "웹훅 트리거", "name_en": "Webhook Trigger", "types": ["이벤트", "배치", "재시도"]},
            {"id": "G1_071", "name": "알림 집계", "name_en": "Notification Aggregation", "types": ["시간별", "유형별", "중요도별"]},
            {"id": "G1_072", "name": "알림 라우팅", "name_en": "Notification Routing", "types": ["규칙기반", "선호도기반", "에스컬레이션"]},
            {"id": "G1_073", "name": "알림 추적", "name_en": "Notification Tracking", "types": ["발송", "열람", "클릭"]},
            {"id": "G1_074", "name": "구독 관리", "name_en": "Subscription Management", "types": ["등록", "변경", "해지"]},
            {"id": "G1_075", "name": "알림 템플릿 관리", "name_en": "Notification Template Management", "types": ["생성", "수정", "버전"]},
            
            # 파일 처리 (10개)
            {"id": "G1_076", "name": "파일 업로드", "name_en": "File Upload", "types": ["단일", "배치", "청크"]},
            {"id": "G1_077", "name": "파일 다운로드", "name_en": "File Download", "types": ["단일", "압축", "스트리밍"]},
            {"id": "G1_078", "name": "파일 변환", "name_en": "File Conversion", "types": ["포맷", "압축", "암호화"]},
            {"id": "G1_079", "name": "파일 검증", "name_en": "File Validation", "types": ["형식", "크기", "무결성"]},
            {"id": "G1_080", "name": "파일 분류", "name_en": "File Classification", "types": ["자동", "규칙기반", "ML기반"]},
            {"id": "G1_081", "name": "파일 태깅", "name_en": "File Tagging", "types": ["수동", "자동", "AI기반"]},
            {"id": "G1_082", "name": "파일 아카이빙", "name_en": "File Archiving", "types": ["정책기반", "수동", "법적"]},
            {"id": "G1_083", "name": "파일 삭제", "name_en": "File Deletion", "types": ["즉시", "예약", "보존기간후"]},
            {"id": "G1_084", "name": "파일 공유", "name_en": "File Sharing", "types": ["링크", "권한부여", "만료설정"]},
            {"id": "G1_085", "name": "파일 버전 관리", "name_en": "File Version Control", "types": ["자동", "수동", "브랜치"]},
        ]
    },
    
    # ==========================================================================
    # 그룹 2: 반구조화 문서 처리 (70개)
    # ==========================================================================
    "GROUP_2_SEMI_STRUCTURED_DOC": {
        "group_name": "반구조화_문서",
        "group_name_en": "Semi-Structured Document",
        "layer": "도메인로직",
        "task_count": 70,
        "tasks": [
            # 계약 관련 (20개)
            {"id": "G2_001", "name": "계약서 검토", "name_en": "Contract Review", "types": ["표준", "상대방양식", "협상", "갱신"]},
            {"id": "G2_002", "name": "계약서 작성", "name_en": "Contract Drafting", "types": ["표준", "맞춤", "수정"]},
            {"id": "G2_003", "name": "계약 조항 추출", "name_en": "Contract Clause Extraction", "types": ["핵심조항", "리스크조항", "전체"]},
            {"id": "G2_004", "name": "계약 비교 분석", "name_en": "Contract Comparison", "types": ["버전간", "표준대비", "경쟁사대비"]},
            {"id": "G2_005", "name": "계약 리스크 평가", "name_en": "Contract Risk Assessment", "types": ["법적", "재무적", "운영적"]},
            {"id": "G2_006", "name": "계약 만료 관리", "name_en": "Contract Expiry Management", "types": ["알림", "갱신", "종료"]},
            {"id": "G2_007", "name": "계약 이행 추적", "name_en": "Contract Compliance Tracking", "types": ["마일스톤", "SLA", "조건"]},
            {"id": "G2_008", "name": "NDA 처리", "name_en": "NDA Processing", "types": ["단방향", "양방향", "다자간"]},
            {"id": "G2_009", "name": "MOU 처리", "name_en": "MOU Processing", "types": ["파트너십", "협력", "인수"]},
            {"id": "G2_010", "name": "SLA 문서 관리", "name_en": "SLA Document Management", "types": ["정의", "모니터링", "보고"]},
            {"id": "G2_011", "name": "라이선스 계약 관리", "name_en": "License Agreement Management", "types": ["소프트웨어", "지적재산권", "프랜차이즈"]},
            {"id": "G2_012", "name": "임대차 계약 관리", "name_en": "Lease Agreement Management", "types": ["부동산", "장비", "차량"]},
            {"id": "G2_013", "name": "고용 계약 관리", "name_en": "Employment Contract Management", "types": ["정규직", "계약직", "파트타임"]},
            {"id": "G2_014", "name": "공급 계약 관리", "name_en": "Supply Agreement Management", "types": ["단기", "장기", "프레임워크"]},
            {"id": "G2_015", "name": "파트너십 계약 관리", "name_en": "Partnership Agreement Management", "types": ["전략적", "운영적", "기술적"]},
            {"id": "G2_016", "name": "계약 서명 관리", "name_en": "Contract Signature Management", "types": ["전자서명", "물리서명", "공증"]},
            {"id": "G2_017", "name": "계약 버전 관리", "name_en": "Contract Version Control", "types": ["협상중", "최종", "수정"]},
            {"id": "G2_018", "name": "계약 아카이빙", "name_en": "Contract Archiving", "types": ["활성", "만료", "법적보관"]},
            {"id": "G2_019", "name": "계약 검색", "name_en": "Contract Search", "types": ["키워드", "조항", "당사자"]},
            {"id": "G2_020", "name": "계약 요약 생성", "name_en": "Contract Summary Generation", "types": ["자동", "템플릿", "맞춤"]},
            
            # 이메일 처리 (15개)
            {"id": "G2_021", "name": "이메일 분류", "name_en": "Email Classification", "types": ["유형별", "우선순위별", "발신자별"]},
            {"id": "G2_022", "name": "이메일 라우팅", "name_en": "Email Routing", "types": ["규칙기반", "AI기반", "워크플로"]},
            {"id": "G2_023", "name": "이메일 응답 생성", "name_en": "Email Response Generation", "types": ["자동", "제안", "템플릿"]},
            {"id": "G2_024", "name": "이메일 요약", "name_en": "Email Summarization", "types": ["개별", "쓰레드", "일간"]},
            {"id": "G2_025", "name": "이메일 감성 분석", "name_en": "Email Sentiment Analysis", "types": ["고객", "직원", "파트너"]},
            {"id": "G2_026", "name": "이메일 엔티티 추출", "name_en": "Email Entity Extraction", "types": ["연락처", "날짜", "금액"]},
            {"id": "G2_027", "name": "이메일 의도 파악", "name_en": "Email Intent Detection", "types": ["문의", "불만", "요청"]},
            {"id": "G2_028", "name": "이메일 첨부 처리", "name_en": "Email Attachment Processing", "types": ["추출", "분류", "저장"]},
            {"id": "G2_029", "name": "이메일 중복 감지", "name_en": "Email Duplicate Detection", "types": ["정확", "유사", "쓰레드"]},
            {"id": "G2_030", "name": "이메일 아카이빙", "name_en": "Email Archiving", "types": ["정책기반", "법적", "선택적"]},
            {"id": "G2_031", "name": "이메일 검색", "name_en": "Email Search", "types": ["전문검색", "필터", "고급"]},
            {"id": "G2_032", "name": "이메일 규정 준수", "name_en": "Email Compliance", "types": ["보존", "감사", "DLP"]},
            {"id": "G2_033", "name": "스팸 필터링", "name_en": "Spam Filtering", "types": ["규칙", "ML", "사용자정의"]},
            {"id": "G2_034", "name": "피싱 감지", "name_en": "Phishing Detection", "types": ["URL", "발신자", "내용"]},
            {"id": "G2_035", "name": "이메일 암호화", "name_en": "Email Encryption", "types": ["전송중", "저장시", "종단간"]},
            
            # 문서 분석 (20개)
            {"id": "G2_036", "name": "문서 OCR", "name_en": "Document OCR", "types": ["인쇄물", "수기", "혼합"]},
            {"id": "G2_037", "name": "문서 구조 분석", "name_en": "Document Structure Analysis", "types": ["레이아웃", "섹션", "테이블"]},
            {"id": "G2_038", "name": "문서 분류", "name_en": "Document Classification", "types": ["유형", "주제", "부서"]},
            {"id": "G2_039", "name": "문서 요약", "name_en": "Document Summarization", "types": ["추출형", "생성형", "하이브리드"]},
            {"id": "G2_040", "name": "문서 번역", "name_en": "Document Translation", "types": ["자동", "검수", "전문가"]},
            {"id": "G2_041", "name": "문서 비교", "name_en": "Document Comparison", "types": ["텍스트", "레이아웃", "시맨틱"]},
            {"id": "G2_042", "name": "문서 병합", "name_en": "Document Merging", "types": ["순차", "인터리브", "조건부"]},
            {"id": "G2_043", "name": "문서 분할", "name_en": "Document Splitting", "types": ["페이지", "섹션", "조건"]},
            {"id": "G2_044", "name": "폼 데이터 추출", "name_en": "Form Data Extraction", "types": ["템플릿", "자유양식", "혼합"]},
            {"id": "G2_045", "name": "테이블 추출", "name_en": "Table Extraction", "types": ["단순", "복잡", "다중페이지"]},
            {"id": "G2_046", "name": "이미지 추출", "name_en": "Image Extraction", "types": ["전체", "선택적", "메타데이터포함"]},
            {"id": "G2_047", "name": "문서 검증", "name_en": "Document Verification", "types": ["진위", "완전성", "규정준수"]},
            {"id": "G2_048", "name": "문서 서명 검증", "name_en": "Document Signature Verification", "types": ["전자서명", "수기서명", "인증서"]},
            {"id": "G2_049", "name": "문서 편집", "name_en": "Document Redaction", "types": ["PII", "기밀", "선택적"]},
            {"id": "G2_050", "name": "문서 워터마크", "name_en": "Document Watermarking", "types": ["가시적", "비가시적", "동적"]},
            {"id": "G2_051", "name": "PDF 생성", "name_en": "PDF Generation", "types": ["보고서", "양식", "병합"]},
            {"id": "G2_052", "name": "PDF 편집", "name_en": "PDF Editing", "types": ["주석", "양식필드", "페이지"]},
            {"id": "G2_053", "name": "문서 템플릿 관리", "name_en": "Document Template Management", "types": ["생성", "버전", "배포"]},
            {"id": "G2_054", "name": "문서 워크플로", "name_en": "Document Workflow", "types": ["검토", "승인", "배포"]},
            {"id": "G2_055", "name": "문서 보존 관리", "name_en": "Document Retention Management", "types": ["정책", "보존", "폐기"]},
            
            # 기타 문서 (15개)
            {"id": "G2_056", "name": "영수증 처리", "name_en": "Receipt Processing", "types": ["스캔", "모바일", "이메일"]},
            {"id": "G2_057", "name": "청구서 처리", "name_en": "Bill Processing", "types": ["유틸리티", "통신", "서비스"]},
            {"id": "G2_058", "name": "명함 처리", "name_en": "Business Card Processing", "types": ["스캔", "사진", "배치"]},
            {"id": "G2_059", "name": "신분증 검증", "name_en": "ID Document Verification", "types": ["여권", "운전면허", "신분증"]},
            {"id": "G2_060", "name": "증명서 처리", "name_en": "Certificate Processing", "types": ["학위", "자격", "인증"]},
            {"id": "G2_061", "name": "보험 문서 처리", "name_en": "Insurance Document Processing", "types": ["청구", "증권", "심사"]},
            {"id": "G2_062", "name": "의료 문서 처리", "name_en": "Medical Document Processing", "types": ["처방", "검사결과", "진단서"]},
            {"id": "G2_063", "name": "법률 문서 처리", "name_en": "Legal Document Processing", "types": ["소송", "공증", "등기"]},
            {"id": "G2_064", "name": "세무 문서 처리", "name_en": "Tax Document Processing", "types": ["신고서", "증빙", "결정문"]},
            {"id": "G2_065", "name": "관세 문서 처리", "name_en": "Customs Document Processing", "types": ["신고", "인보이스", "원산지"]},
            {"id": "G2_066", "name": "이력서 파싱", "name_en": "Resume Parsing", "types": ["정형", "비정형", "다국어"]},
            {"id": "G2_067", "name": "제안서 분석", "name_en": "Proposal Analysis", "types": ["RFP", "RFQ", "입찰"]},
            {"id": "G2_068", "name": "기술 문서 분석", "name_en": "Technical Document Analysis", "types": ["사양서", "매뉴얼", "도면"]},
            {"id": "G2_069", "name": "회의록 처리", "name_en": "Meeting Minutes Processing", "types": ["작성", "요약", "액션추출"]},
            {"id": "G2_070", "name": "설문 응답 처리", "name_en": "Survey Response Processing", "types": ["정량", "정성", "혼합"]},
        ]
    },
    
    # ==========================================================================
    # 그룹 3: 승인 워크플로 (85개)
    # ==========================================================================
    "GROUP_3_APPROVAL_WORKFLOW": {
        "group_name": "승인_워크플로",
        "group_name_en": "Approval Workflow",
        "layer": "엣지커넥터",
        "task_count": 85,
        "tasks": [
            # 경비/지출 (20개)
            {"id": "G3_001", "name": "경비 승인", "name_en": "Expense Approval", "types": ["소액정기", "출장", "프로젝트", "예외"]},
            {"id": "G3_002", "name": "출장 승인", "name_en": "Travel Approval", "types": ["국내", "해외", "긴급"]},
            {"id": "G3_003", "name": "예산 승인", "name_en": "Budget Approval", "types": ["신규", "추가", "이월"]},
            {"id": "G3_004", "name": "구매 요청 승인", "name_en": "Purchase Request Approval", "types": ["정기", "긴급", "예외"]},
            {"id": "G3_005", "name": "구매 주문 승인", "name_en": "Purchase Order Approval", "types": ["표준", "계약", "긴급"]},
            {"id": "G3_006", "name": "지출 결의 승인", "name_en": "Payment Voucher Approval", "types": ["일반", "선급", "분할"]},
            {"id": "G3_007", "name": "법인카드 신청 승인", "name_en": "Corporate Card Application Approval", "types": ["신규", "한도변경", "해지"]},
            {"id": "G3_008", "name": "법인카드 사용 승인", "name_en": "Corporate Card Usage Approval", "types": ["사전", "사후", "한도초과"]},
            {"id": "G3_009", "name": "가불금 승인", "name_en": "Advance Payment Approval", "types": ["출장", "프로젝트", "기타"]},
            {"id": "G3_010", "name": "대여금 승인", "name_en": "Loan Approval", "types": ["복지", "긴급", "장기"]},
            {"id": "G3_011", "name": "투자 승인", "name_en": "Investment Approval", "types": ["자산", "프로젝트", "인수"]},
            {"id": "G3_012", "name": "자산 취득 승인", "name_en": "Asset Acquisition Approval", "types": ["IT", "설비", "부동산"]},
            {"id": "G3_013", "name": "자산 처분 승인", "name_en": "Asset Disposal Approval", "types": ["매각", "폐기", "기증"]},
            {"id": "G3_014", "name": "계약금 승인", "name_en": "Deposit Approval", "types": ["선급", "보증", "반환"]},
            {"id": "G3_015", "name": "비용 정산 승인", "name_en": "Expense Settlement Approval", "types": ["월간", "프로젝트", "출장"]},
            {"id": "G3_016", "name": "예산 초과 승인", "name_en": "Budget Overrun Approval", "types": ["소액", "대액", "긴급"]},
            {"id": "G3_017", "name": "할인 승인", "name_en": "Discount Approval", "types": ["표준", "특별", "대량"]},
            {"id": "G3_018", "name": "신용 한도 승인", "name_en": "Credit Limit Approval", "types": ["신규", "증액", "감액"]},
            {"id": "G3_019", "name": "환불 승인", "name_en": "Refund Approval", "types": ["전액", "부분", "크레딧"]},
            {"id": "G3_020", "name": "대손 상각 승인", "name_en": "Bad Debt Write-off Approval", "types": ["부분", "전액", "회수불능"]},
            
            # HR 승인 (25개)
            {"id": "G3_021", "name": "휴가 승인", "name_en": "Leave Approval", "types": ["연차", "병가", "특별"]},
            {"id": "G3_022", "name": "초과근무 승인", "name_en": "Overtime Approval", "types": ["사전", "사후", "휴일"]},
            {"id": "G3_023", "name": "재택근무 승인", "name_en": "Remote Work Approval", "types": ["정기", "임시", "상시"]},
            {"id": "G3_024", "name": "출장 승인", "name_en": "Business Trip Approval", "types": ["국내", "해외", "장기"]},
            {"id": "G3_025", "name": "교육 승인", "name_en": "Training Approval", "types": ["내부", "외부", "온라인"]},
            {"id": "G3_026", "name": "자격증 취득 승인", "name_en": "Certification Approval", "types": ["필수", "권장", "개인"]},
            {"id": "G3_027", "name": "채용 승인", "name_en": "Hiring Approval", "types": ["정규", "계약", "인턴"]},
            {"id": "G3_028", "name": "급여 조정 승인", "name_en": "Salary Adjustment Approval", "types": ["정기", "승진", "특별"]},
            {"id": "G3_029", "name": "보너스 승인", "name_en": "Bonus Approval", "types": ["성과", "프로젝트", "특별"]},
            {"id": "G3_030", "name": "승진 승인", "name_en": "Promotion Approval", "types": ["정기", "특별", "발탁"]},
            {"id": "G3_031", "name": "전보 승인", "name_en": "Transfer Approval", "types": ["부서간", "지역간", "해외"]},
            {"id": "G3_032", "name": "퇴직 승인", "name_en": "Resignation Approval", "types": ["자발", "권고", "정년"]},
            {"id": "G3_033", "name": "복직 승인", "name_en": "Reinstatement Approval", "types": ["휴직후", "징계후", "기타"]},
            {"id": "G3_034", "name": "휴직 승인", "name_en": "Leave of Absence Approval", "types": ["육아", "병가", "학업"]},
            {"id": "G3_035", "name": "겸직 승인", "name_en": "Side Job Approval", "types": ["강의", "자문", "창업"]},
            {"id": "G3_036", "name": "조직 변경 승인", "name_en": "Org Change Approval", "types": ["신설", "통폐합", "명칭변경"]},
            {"id": "G3_037", "name": "직무 변경 승인", "name_en": "Job Change Approval", "types": ["직무전환", "직급조정", "역할변경"]},
            {"id": "G3_038", "name": "근무지 변경 승인", "name_en": "Work Location Change Approval", "types": ["사무실", "재택", "하이브리드"]},
            {"id": "G3_039", "name": "근무시간 변경 승인", "name_en": "Work Hours Change Approval", "types": ["시차출퇴근", "단축근무", "탄력근무"]},
            {"id": "G3_040", "name": "인력 충원 승인", "name_en": "Headcount Approval", "types": ["신규", "대체", "임시"]},
            {"id": "G3_041", "name": "파견 승인", "name_en": "Secondment Approval", "types": ["그룹사", "고객사", "해외"]},
            {"id": "G3_042", "name": "외부 인력 승인", "name_en": "Contractor Approval", "types": ["프리랜서", "파견", "용역"]},
            {"id": "G3_043", "name": "징계 승인", "name_en": "Disciplinary Action Approval", "types": ["경고", "감봉", "해고"]},
            {"id": "G3_044", "name": "포상 승인", "name_en": "Award Approval", "types": ["개인", "팀", "특별"]},
            {"id": "G3_045", "name": "복리후생 승인", "name_en": "Benefits Approval", "types": ["건강", "교육", "문화"]},
            
            # 운영 승인 (20개)
            {"id": "G3_046", "name": "프로젝트 승인", "name_en": "Project Approval", "types": ["신규", "변경", "종료"]},
            {"id": "G3_047", "name": "변경 관리 승인", "name_en": "Change Management Approval", "types": ["표준", "긴급", "주요"]},
            {"id": "G3_048", "name": "배포 승인", "name_en": "Deployment Approval", "types": ["개발", "스테이징", "프로덕션"]},
            {"id": "G3_049", "name": "접근 권한 승인", "name_en": "Access Permission Approval", "types": ["시스템", "데이터", "물리"]},
            {"id": "G3_050", "name": "보안 예외 승인", "name_en": "Security Exception Approval", "types": ["임시", "영구", "긴급"]},
            {"id": "G3_051", "name": "데이터 요청 승인", "name_en": "Data Request Approval", "types": ["내부", "외부", "규제"]},
            {"id": "G3_052", "name": "시스템 요청 승인", "name_en": "System Request Approval", "types": ["신규", "변경", "폐기"]},
            {"id": "G3_053", "name": "소프트웨어 요청 승인", "name_en": "Software Request Approval", "types": ["구매", "라이선스", "오픈소스"]},
            {"id": "G3_054", "name": "하드웨어 요청 승인", "name_en": "Hardware Request Approval", "types": ["구매", "임대", "반납"]},
            {"id": "G3_055", "name": "클라우드 리소스 승인", "name_en": "Cloud Resource Approval", "types": ["프로비저닝", "스케일링", "삭제"]},
            {"id": "G3_056", "name": "유지보수 승인", "name_en": "Maintenance Approval", "types": ["정기", "긴급", "예방"]},
            {"id": "G3_057", "name": "SLA 변경 승인", "name_en": "SLA Change Approval", "types": ["상향", "하향", "면제"]},
            {"id": "G3_058", "name": "공급업체 승인", "name_en": "Vendor Approval", "types": ["신규", "갱신", "해지"]},
            {"id": "G3_059", "name": "외주 승인", "name_en": "Outsourcing Approval", "types": ["신규", "연장", "범위변경"]},
            {"id": "G3_060", "name": "품질 승인", "name_en": "Quality Approval", "types": ["입고", "출하", "반품"]},
            {"id": "G3_061", "name": "생산 승인", "name_en": "Production Approval", "types": ["계획", "변경", "중단"]},
            {"id": "G3_062", "name": "출하 승인", "name_en": "Shipment Approval", "types": ["표준", "긴급", "특별"]},
            {"id": "G3_063", "name": "반품 승인", "name_en": "Return Approval", "types": ["불량", "오배송", "취소"]},
            {"id": "G3_064", "name": "폐기 승인", "name_en": "Disposal Approval", "types": ["재고", "자산", "문서"]},
            {"id": "G3_065", "name": "이벤트 승인", "name_en": "Event Approval", "types": ["내부", "외부", "후원"]},
            
            # 마케팅/세일즈 승인 (10개)
            {"id": "G3_066", "name": "캠페인 승인", "name_en": "Campaign Approval", "types": ["마케팅", "프로모션", "광고"]},
            {"id": "G3_067", "name": "콘텐츠 승인", "name_en": "Content Approval", "types": ["블로그", "소셜", "광고"]},
            {"id": "G3_068", "name": "브랜드 사용 승인", "name_en": "Brand Usage Approval", "types": ["내부", "파트너", "미디어"]},
            {"id": "G3_069", "name": "가격 변경 승인", "name_en": "Price Change Approval", "types": ["인상", "인하", "프로모션"]},
            {"id": "G3_070", "name": "견적 승인", "name_en": "Quote Approval", "types": ["표준", "특별", "대량"]},
            {"id": "G3_071", "name": "제안서 승인", "name_en": "Proposal Approval", "types": ["기술", "상업", "최종"]},
            {"id": "G3_072", "name": "입찰 승인", "name_en": "Bid Approval", "types": ["참여", "가격", "최종"]},
            {"id": "G3_073", "name": "파트너십 승인", "name_en": "Partnership Approval", "types": ["리셀러", "기술", "마케팅"]},
            {"id": "G3_074", "name": "스폰서십 승인", "name_en": "Sponsorship Approval", "types": ["이벤트", "조직", "개인"]},
            {"id": "G3_075", "name": "샘플 승인", "name_en": "Sample Approval", "types": ["제품", "마케팅", "테스트"]},
            
            # 법무/컴플라이언스 승인 (10개)
            {"id": "G3_076", "name": "법적 검토 승인", "name_en": "Legal Review Approval", "types": ["계약", "정책", "분쟁"]},
            {"id": "G3_077", "name": "컴플라이언스 승인", "name_en": "Compliance Approval", "types": ["정책", "교육", "감사"]},
            {"id": "G3_078", "name": "개인정보 처리 승인", "name_en": "Privacy Processing Approval", "types": ["수집", "이용", "제공"]},
            {"id": "G3_079", "name": "보험 승인", "name_en": "Insurance Approval", "types": ["가입", "변경", "청구"]},
            {"id": "G3_080", "name": "지적재산권 승인", "name_en": "IP Approval", "types": ["출원", "라이선스", "양도"]},
            {"id": "G3_081", "name": "규제 보고 승인", "name_en": "Regulatory Reporting Approval", "types": ["정기", "수시", "변경"]},
            {"id": "G3_082", "name": "위험 수용 승인", "name_en": "Risk Acceptance Approval", "types": ["보안", "운영", "재무"]},
            {"id": "G3_083", "name": "사고 보고 승인", "name_en": "Incident Report Approval", "types": ["보안", "안전", "운영"]},
            {"id": "G3_084", "name": "감사 결과 승인", "name_en": "Audit Result Approval", "types": ["내부", "외부", "규제"]},
            {"id": "G3_085", "name": "정책 변경 승인", "name_en": "Policy Change Approval", "types": ["신규", "수정", "폐지"]},
        ]
    },
    
    # ==========================================================================
    # 그룹 4: 고객·영업 (60개)
    # ==========================================================================
    "GROUP_4_CUSTOMER_SALES": {
        "group_name": "고객_영업",
        "group_name_en": "Customer Sales",
        "layer": "도메인로직",
        "task_count": 60,
        "tasks": [
            # 리드 관리 (15개)
            {"id": "G4_001", "name": "리드 스코어링", "name_en": "Lead Scoring", "types": ["인바운드", "아웃바운드", "레퍼럴", "리사이클"]},
            {"id": "G4_002", "name": "리드 라우팅", "name_en": "Lead Routing", "types": ["지역", "산업", "크기", "라운드로빈"]},
            {"id": "G4_003", "name": "리드 보강", "name_en": "Lead Enrichment", "types": ["기업정보", "연락처", "소셜"]},
            {"id": "G4_004", "name": "리드 자격 심사", "name_en": "Lead Qualification", "types": ["BANT", "MEDDIC", "CHAMP"]},
            {"id": "G4_005", "name": "리드 양육", "name_en": "Lead Nurturing", "types": ["이메일", "콘텐츠", "이벤트"]},
            {"id": "G4_006", "name": "리드 전환", "name_en": "Lead Conversion", "types": ["MQL", "SQL", "기회"]},
            {"id": "G4_007", "name": "리드 소스 추적", "name_en": "Lead Source Tracking", "types": ["직접", "캠페인", "레퍼럴"]},
            {"id": "G4_008", "name": "리드 중복 제거", "name_en": "Lead Deduplication", "types": ["자동", "수동", "병합"]},
            {"id": "G4_009", "name": "리드 재활성화", "name_en": "Lead Reactivation", "types": ["휴면", "실패", "이탈"]},
            {"id": "G4_010", "name": "리드 배포", "name_en": "Lead Distribution", "types": ["푸시", "풀", "혼합"]},
            {"id": "G4_011", "name": "리드 응답 관리", "name_en": "Lead Response Management", "types": ["즉시", "스케줄", "AI"]},
            {"id": "G4_012", "name": "리드 캠페인 관리", "name_en": "Lead Campaign Management", "types": ["인바운드", "아웃바운드", "ABM"]},
            {"id": "G4_013", "name": "리드 인텔리전스", "name_en": "Lead Intelligence", "types": ["의도", "행동", "적합성"]},
            {"id": "G4_014", "name": "리드 보고", "name_en": "Lead Reporting", "types": ["파이프라인", "전환", "소스"]},
            {"id": "G4_015", "name": "리드 SLA 관리", "name_en": "Lead SLA Management", "types": ["응답", "후속", "전환"]},
            
            # 영업 관리 (20개)
            {"id": "G4_016", "name": "기회 관리", "name_en": "Opportunity Management", "types": ["생성", "진행", "종료"]},
            {"id": "G4_017", "name": "파이프라인 관리", "name_en": "Pipeline Management", "types": ["예측", "분석", "청소"]},
            {"id": "G4_018", "name": "견적 생성", "name_en": "Quote Generation", "types": ["표준", "맞춤", "갱신"]},
            {"id": "G4_019", "name": "제안서 작성", "name_en": "Proposal Creation", "types": ["템플릿", "맞춤", "RFP응답"]},
            {"id": "G4_020", "name": "계약 협상", "name_en": "Contract Negotiation", "types": ["가격", "조건", "범위"]},
            {"id": "G4_021", "name": "수주 처리", "name_en": "Order Processing", "types": ["신규", "갱신", "업셀"]},
            {"id": "G4_022", "name": "영업 예측", "name_en": "Sales Forecasting", "types": ["파이프라인", "AI", "판단"]},
            {"id": "G4_023", "name": "영업 활동 추적", "name_en": "Sales Activity Tracking", "types": ["콜", "미팅", "이메일"]},
            {"id": "G4_024", "name": "영업 코칭", "name_en": "Sales Coaching", "types": ["콜분석", "딜리뷰", "스킬"]},
            {"id": "G4_025", "name": "영업 성과 관리", "name_en": "Sales Performance Management", "types": ["KPI", "목표", "인센티브"]},
            {"id": "G4_026", "name": "영역 관리", "name_en": "Territory Management", "types": ["할당", "밸런싱", "변경"]},
            {"id": "G4_027", "name": "경쟁사 분석", "name_en": "Competitor Analysis", "types": ["가격", "기능", "포지셔닝"]},
            {"id": "G4_028", "name": "가격 최적화", "name_en": "Price Optimization", "types": ["할인", "번들", "동적"]},
            {"id": "G4_029", "name": "크로스셀/업셀", "name_en": "Cross-sell/Upsell", "types": ["추천", "번들", "업그레이드"]},
            {"id": "G4_030", "name": "갱신 관리", "name_en": "Renewal Management", "types": ["자동", "수동", "협상"]},
            {"id": "G4_031", "name": "이탈 방지", "name_en": "Churn Prevention", "types": ["조기경보", "인터벤션", "윈백"]},
            {"id": "G4_032", "name": "고객 세분화", "name_en": "Customer Segmentation", "types": ["가치", "행동", "니즈"]},
            {"id": "G4_033", "name": "판매 자료 관리", "name_en": "Sales Collateral Management", "types": ["생성", "배포", "분석"]},
            {"id": "G4_034", "name": "데모 관리", "name_en": "Demo Management", "types": ["스케줄", "맞춤", "후속"]},
            {"id": "G4_035", "name": "POC 관리", "name_en": "POC Management", "types": ["계획", "실행", "평가"]},
            
            # 고객 지원 (25개)
            {"id": "G4_036", "name": "고객 문의 처리", "name_en": "Customer Inquiry Handling", "types": ["이메일", "채팅", "전화"]},
            {"id": "G4_037", "name": "불만 처리", "name_en": "Complaint Handling", "types": ["접수", "조사", "해결"]},
            {"id": "G4_038", "name": "기술 지원", "name_en": "Technical Support", "types": ["L1", "L2", "L3"]},
            {"id": "G4_039", "name": "제품 문의 응대", "name_en": "Product Inquiry Response", "types": ["기능", "가격", "호환성"]},
            {"id": "G4_040", "name": "주문 상태 안내", "name_en": "Order Status Update", "types": ["자동", "요청시", "예외"]},
            {"id": "G4_041", "name": "배송 문의 처리", "name_en": "Shipping Inquiry Handling", "types": ["추적", "변경", "문제"]},
            {"id": "G4_042", "name": "반품/교환 처리", "name_en": "Return/Exchange Processing", "types": ["접수", "승인", "완료"]},
            {"id": "G4_043", "name": "환불 처리", "name_en": "Refund Processing", "types": ["전액", "부분", "크레딧"]},
            {"id": "G4_044", "name": "계정 관리 지원", "name_en": "Account Management Support", "types": ["생성", "변경", "삭제"]},
            {"id": "G4_045", "name": "결제 문의 처리", "name_en": "Payment Inquiry Handling", "types": ["실패", "분쟁", "청구"]},
            {"id": "G4_046", "name": "서비스 설정 지원", "name_en": "Service Setup Support", "types": ["온보딩", "설정", "통합"]},
            {"id": "G4_047", "name": "FAQ 관리", "name_en": "FAQ Management", "types": ["생성", "업데이트", "분석"]},
            {"id": "G4_048", "name": "지식베이스 관리", "name_en": "Knowledge Base Management", "types": ["문서", "비디오", "가이드"]},
            {"id": "G4_049", "name": "고객 만족도 조사", "name_en": "Customer Satisfaction Survey", "types": ["CSAT", "NPS", "CES"]},
            {"id": "G4_050", "name": "고객 피드백 분석", "name_en": "Customer Feedback Analysis", "types": ["정량", "정성", "감성"]},
            {"id": "G4_051", "name": "에스컬레이션 관리", "name_en": "Escalation Management", "types": ["기술", "관리", "경영"]},
            {"id": "G4_052", "name": "SLA 모니터링", "name_en": "SLA Monitoring", "types": ["응답", "해결", "가용성"]},
            {"id": "G4_053", "name": "고객 커뮤니케이션", "name_en": "Customer Communication", "types": ["사전", "정기", "긴급"]},
            {"id": "G4_054", "name": "고객 온보딩", "name_en": "Customer Onboarding", "types": ["셀프", "가이드", "전담"]},
            {"id": "G4_055", "name": "고객 성공 관리", "name_en": "Customer Success Management", "types": ["헬스체크", "QBR", "확장"]},
            {"id": "G4_056", "name": "고객 교육", "name_en": "Customer Training", "types": ["온라인", "현장", "인증"]},
            {"id": "G4_057", "name": "고객 이벤트 관리", "name_en": "Customer Event Management", "types": ["웨비나", "컨퍼런스", "유저그룹"]},
            {"id": "G4_058", "name": "레퍼런스 관리", "name_en": "Reference Management", "types": ["케이스", "추천", "리뷰"]},
            {"id": "G4_059", "name": "로열티 프로그램", "name_en": "Loyalty Program Management", "types": ["포인트", "티어", "리워드"]},
            {"id": "G4_060", "name": "고객 360 뷰", "name_en": "Customer 360 View", "types": ["통합", "분석", "인사이트"]},
        ]
    },
    
    # ==========================================================================
    # 그룹 5: 재무·회계 (55개)
    # ==========================================================================
    "GROUP_5_FINANCE_ACCOUNTING": {
        "group_name": "재무_회계",
        "group_name_en": "Finance Accounting",
        "layer": "도메인로직",
        "task_count": 55,
        "tasks": [
            # 매출/수금 (15개)
            {"id": "G5_001", "name": "청구/수금", "name_en": "Billing & Collection", "types": ["단건", "구독", "사용량", "마일스톤"]},
            {"id": "G5_002", "name": "매출 인식", "name_en": "Revenue Recognition", "types": ["시점", "기간", "성과"]},
            {"id": "G5_003", "name": "AR 관리", "name_en": "AR Management", "types": ["생성", "추적", "조정"]},
            {"id": "G5_004", "name": "수금 독촉", "name_en": "Collection Follow-up", "types": ["자동", "수동", "법적"]},
            {"id": "G5_005", "name": "신용 관리", "name_en": "Credit Management", "types": ["평가", "한도", "모니터링"]},
            {"id": "G5_006", "name": "현금 적용", "name_en": "Cash Application", "types": ["자동", "수동", "예외"]},
            {"id": "G5_007", "name": "미수금 분석", "name_en": "AR Aging Analysis", "types": ["일별", "고객별", "예외"]},
            {"id": "G5_008", "name": "분쟁 관리", "name_en": "Dispute Management", "types": ["접수", "조사", "해결"]},
            {"id": "G5_009", "name": "대손 관리", "name_en": "Bad Debt Management", "types": ["충당금", "상각", "회수"]},
            {"id": "G5_010", "name": "선수금 관리", "name_en": "Deferred Revenue Management", "types": ["인식", "조정", "보고"]},
            {"id": "G5_011", "name": "커미션 계산", "name_en": "Commission Calculation", "types": ["정기", "특별", "조정"]},
            {"id": "G5_012", "name": "리베이트 처리", "name_en": "Rebate Processing", "types": ["계산", "지급", "조정"]},
            {"id": "G5_013", "name": "가격 검증", "name_en": "Price Validation", "types": ["계약", "프로모션", "예외"]},
            {"id": "G5_014", "name": "청구 오류 수정", "name_en": "Billing Error Correction", "types": ["과청구", "미청구", "조정"]},
            {"id": "G5_015", "name": "수익 보고", "name_en": "Revenue Reporting", "types": ["일별", "월별", "세그먼트별"]},
            
            # 매입/지급 (15개)
            {"id": "G5_016", "name": "AP 관리", "name_en": "AP Management", "types": ["등록", "검증", "지급"]},
            {"id": "G5_017", "name": "지급 처리", "name_en": "Payment Processing", "types": ["정기", "긴급", "배치"]},
            {"id": "G5_018", "name": "지급 스케줄링", "name_en": "Payment Scheduling", "types": ["최적화", "현금흐름", "할인"]},
            {"id": "G5_019", "name": "공급업체 관리", "name_en": "Vendor Management", "types": ["등록", "평가", "마스터"]},
            {"id": "G5_020", "name": "3자 매칭", "name_en": "3-Way Matching", "types": ["자동", "예외", "승인"]},
            {"id": "G5_021", "name": "선급금 관리", "name_en": "Prepayment Management", "types": ["요청", "적용", "잔액"]},
            {"id": "G5_022", "name": "미지급금 분석", "name_en": "AP Aging Analysis", "types": ["공급업체별", "기간별", "예외"]},
            {"id": "G5_023", "name": "지급 조건 관리", "name_en": "Payment Terms Management", "types": ["표준", "협상", "예외"]},
            {"id": "G5_024", "name": "할인 관리", "name_en": "Discount Management", "types": ["조기지급", "볼륨", "프로모션"]},
            {"id": "G5_025", "name": "지급 승인", "name_en": "Payment Authorization", "types": ["단일", "배치", "긴급"]},
            {"id": "G5_026", "name": "은행 파일 생성", "name_en": "Bank File Generation", "types": ["국내", "해외", "급여"]},
            {"id": "G5_027", "name": "지급 확인", "name_en": "Payment Confirmation", "types": ["자동", "수동", "조회"]},
            {"id": "G5_028", "name": "반복 지급 관리", "name_en": "Recurring Payment Management", "types": ["설정", "실행", "변경"]},
            {"id": "G5_029", "name": "지급 보고", "name_en": "Payment Reporting", "types": ["일별", "공급업체별", "예외"]},
            {"id": "G5_030", "name": "1099 처리", "name_en": "1099 Processing", "types": ["추적", "생성", "제출"]},
            
            # 결산/보고 (15개)
            {"id": "G5_031", "name": "월 결산", "name_en": "Month-End Close", "types": ["체크리스트", "조정", "검토"]},
            {"id": "G5_032", "name": "분기 결산", "name_en": "Quarter-End Close", "types": ["재무제표", "주석", "공시"]},
            {"id": "G5_033", "name": "연 결산", "name_en": "Year-End Close", "types": ["감사대비", "이월", "마감"]},
            {"id": "G5_034", "name": "연결 결산", "name_en": "Consolidation", "types": ["자회사", "제거", "환산"]},
            {"id": "G5_035", "name": "계정 조정", "name_en": "Account Reconciliation", "types": ["은행", "거래처", "내부"]},
            {"id": "G5_036", "name": "분개 입력", "name_en": "Journal Entry", "types": ["수동", "자동", "조정"]},
            {"id": "G5_037", "name": "발생/이연 처리", "name_en": "Accrual/Deferral Processing", "types": ["비용", "수익", "조정"]},
            {"id": "G5_038", "name": "고정자산 관리", "name_en": "Fixed Asset Management", "types": ["취득", "감가상각", "처분"]},
            {"id": "G5_039", "name": "재고 회계", "name_en": "Inventory Accounting", "types": ["원가", "평가", "조정"]},
            {"id": "G5_040", "name": "내부거래 제거", "name_en": "Intercompany Elimination", "types": ["매출", "비용", "잔액"]},
            {"id": "G5_041", "name": "환율 처리", "name_en": "Foreign Exchange Processing", "types": ["거래", "환산", "재평가"]},
            {"id": "G5_042", "name": "재무제표 생성", "name_en": "Financial Statement Generation", "types": ["BS", "PL", "CF"]},
            {"id": "G5_043", "name": "관리회계 보고", "name_en": "Management Reporting", "types": ["부서별", "프로젝트별", "제품별"]},
            {"id": "G5_044", "name": "예산 대비 분석", "name_en": "Budget vs Actual Analysis", "types": ["월별", "누적", "예측"]},
            {"id": "G5_045", "name": "감사 대응", "name_en": "Audit Support", "types": ["자료준비", "질의응답", "조정"]},
            
            # 세무/자금 (10개)
            {"id": "G5_046", "name": "부가세 신고", "name_en": "VAT Filing", "types": ["매출", "매입", "신고"]},
            {"id": "G5_047", "name": "법인세 신고", "name_en": "Corporate Tax Filing", "types": ["중간", "확정", "수정"]},
            {"id": "G5_048", "name": "원천세 신고", "name_en": "Withholding Tax Filing", "types": ["급여", "기타소득", "이자배당"]},
            {"id": "G5_049", "name": "세금 충당금 계산", "name_en": "Tax Provision Calculation", "types": ["당기", "이연", "불확실성"]},
            {"id": "G5_050", "name": "이전가격 문서화", "name_en": "Transfer Pricing Documentation", "types": ["정책", "분석", "보고"]},
            {"id": "G5_051", "name": "현금흐름 예측", "name_en": "Cash Flow Forecasting", "types": ["단기", "중기", "장기"]},
            {"id": "G5_052", "name": "자금 조달", "name_en": "Funding Management", "types": ["차입", "증자", "채권"]},
            {"id": "G5_053", "name": "투자 관리", "name_en": "Investment Management", "types": ["단기", "장기", "전략적"]},
            {"id": "G5_054", "name": "외환 관리", "name_en": "FX Management", "types": ["거래", "헤지", "노출"]},
            {"id": "G5_055", "name": "은행 관계 관리", "name_en": "Bank Relationship Management", "types": ["계좌", "서비스", "수수료"]},
        ]
    },
    
    # ==========================================================================
    # 그룹 6: HR·인사 (60개)
    # ==========================================================================
    "GROUP_6_HR_PERSONNEL": {
        "group_name": "HR_인사",
        "group_name_en": "HR Personnel",
        "layer": "도메인로직",
        "task_count": 60,
        "tasks": [
            # 채용 (15개)
            {"id": "G6_001", "name": "채용 공고 관리", "name_en": "Job Posting Management", "types": ["내부", "외부", "에이전시"]},
            {"id": "G6_002", "name": "지원서 심사", "name_en": "Application Screening", "types": ["자동", "수동", "AI"]},
            {"id": "G6_003", "name": "이력서 파싱", "name_en": "Resume Parsing", "types": ["정형", "비정형", "다국어"]},
            {"id": "G6_004", "name": "후보자 스코어링", "name_en": "Candidate Scoring", "types": ["스킬", "경험", "문화적합"]},
            {"id": "G6_005", "name": "인터뷰 스케줄링", "name_en": "Interview Scheduling", "types": ["전화", "화상", "대면"]},
            {"id": "G6_006", "name": "인터뷰 평가", "name_en": "Interview Evaluation", "types": ["기술", "행동", "케이스"]},
            {"id": "G6_007", "name": "레퍼런스 체크", "name_en": "Reference Check", "types": ["자동", "수동", "백그라운드"]},
            {"id": "G6_008", "name": "오퍼 생성", "name_en": "Offer Generation", "types": ["표준", "협상", "카운터"]},
            {"id": "G6_009", "name": "오퍼 협상", "name_en": "Offer Negotiation", "types": ["급여", "보너스", "기타"]},
            {"id": "G6_010", "name": "입사 서류 처리", "name_en": "Onboarding Document Processing", "types": ["필수", "선택", "전자서명"]},
            {"id": "G6_011", "name": "채용 파이프라인 관리", "name_en": "Recruitment Pipeline Management", "types": ["소싱", "평가", "오퍼"]},
            {"id": "G6_012", "name": "채용 분석", "name_en": "Recruitment Analytics", "types": ["소스", "전환율", "시간"]},
            {"id": "G6_013", "name": "탤런트 풀 관리", "name_en": "Talent Pool Management", "types": ["패시브", "이전지원자", "레퍼럴"]},
            {"id": "G6_014", "name": "ATS 관리", "name_en": "ATS Management", "types": ["워크플로", "통합", "보고"]},
            {"id": "G6_015", "name": "채용 브랜딩", "name_en": "Employer Branding", "types": ["콘텐츠", "이벤트", "소셜"]},
            
            # 온보딩/오프보딩 (10개)
            {"id": "G6_016", "name": "온보딩", "name_en": "Employee Onboarding", "types": ["정규직", "계약직", "인턴", "원격"]},
            {"id": "G6_017", "name": "신입 오리엔테이션", "name_en": "New Hire Orientation", "types": ["대면", "온라인", "하이브리드"]},
            {"id": "G6_018", "name": "계정 프로비저닝", "name_en": "Account Provisioning", "types": ["시스템", "이메일", "접근권한"]},
            {"id": "G6_019", "name": "장비 지급", "name_en": "Equipment Assignment", "types": ["IT", "사무용품", "특수장비"]},
            {"id": "G6_020", "name": "버디 매칭", "name_en": "Buddy Matching", "types": ["자동", "수동", "멘토"]},
            {"id": "G6_021", "name": "온보딩 체크리스트", "name_en": "Onboarding Checklist", "types": ["HR", "IT", "부서"]},
            {"id": "G6_022", "name": "오프보딩", "name_en": "Employee Offboarding", "types": ["자발", "비자발", "계약만료"]},
            {"id": "G6_023", "name": "퇴직 인터뷰", "name_en": "Exit Interview", "types": ["대면", "설문", "분석"]},
            {"id": "G6_024", "name": "접근권한 회수", "name_en": "Access Revocation", "types": ["즉시", "단계별", "감사"]},
            {"id": "G6_025", "name": "최종 정산", "name_en": "Final Settlement", "types": ["급여", "보상", "공제"]},
            
            # 급여/복리후생 (15개)
            {"id": "G6_026", "name": "급여 계산", "name_en": "Payroll Calculation", "types": ["정기", "수당", "공제"]},
            {"id": "G6_027", "name": "급여 검증", "name_en": "Payroll Verification", "types": ["자동", "수동", "승인"]},
            {"id": "G6_028", "name": "급여 지급", "name_en": "Payroll Disbursement", "types": ["계좌이체", "수표", "현금"]},
            {"id": "G6_029", "name": "급여 명세서", "name_en": "Pay Stub Generation", "types": ["전자", "출력", "포털"]},
            {"id": "G6_030", "name": "퇴직금 계산", "name_en": "Severance Calculation", "types": ["법정", "회사규정", "협상"]},
            {"id": "G6_031", "name": "사회보험 관리", "name_en": "Social Insurance Management", "types": ["4대보험", "신고", "정산"]},
            {"id": "G6_032", "name": "연말정산", "name_en": "Year-End Tax Settlement", "types": ["자료수집", "계산", "신고"]},
            {"id": "G6_033", "name": "복리후생 등록", "name_en": "Benefits Enrollment", "types": ["신규", "변경", "연간"]},
            {"id": "G6_034", "name": "복리후생 관리", "name_en": "Benefits Administration", "types": ["건강", "연금", "기타"]},
            {"id": "G6_035", "name": "휴가 관리", "name_en": "Leave Management", "types": ["연차", "병가", "특별"]},
            {"id": "G6_036", "name": "근태 관리", "name_en": "Time & Attendance Management", "types": ["출퇴근", "초과근무", "휴가"]},
            {"id": "G6_037", "name": "스톡옵션 관리", "name_en": "Stock Option Management", "types": ["부여", "행사", "보고"]},
            {"id": "G6_038", "name": "보상 벤치마킹", "name_en": "Compensation Benchmarking", "types": ["급여", "보너스", "총보상"]},
            {"id": "G6_039", "name": "보상 계획", "name_en": "Compensation Planning", "types": ["연봉조정", "승진", "특별"]},
            {"id": "G6_040", "name": "급여 보고", "name_en": "Payroll Reporting", "types": ["내부", "규제", "감사"]},
            
            # 성과/개발 (10개)
            {"id": "G6_041", "name": "성과 목표 설정", "name_en": "Performance Goal Setting", "types": ["OKR", "KPI", "MBO"]},
            {"id": "G6_042", "name": "성과 평가", "name_en": "Performance Evaluation", "types": ["자기평가", "관리자", "360도"]},
            {"id": "G6_043", "name": "성과 피드백", "name_en": "Performance Feedback", "types": ["정기", "실시간", "코칭"]},
            {"id": "G6_044", "name": "성과 보정", "name_en": "Performance Calibration", "types": ["부서", "전사", "등급"]},
            {"id": "G6_045", "name": "역량 평가", "name_en": "Competency Assessment", "types": ["스킬", "행동", "잠재력"]},
            {"id": "G6_046", "name": "경력 개발", "name_en": "Career Development", "types": ["경로", "계획", "코칭"]},
            {"id": "G6_047", "name": "승계 계획", "name_en": "Succession Planning", "types": ["핵심인재", "리더십", "위험관리"]},
            {"id": "G6_048", "name": "교육 관리", "name_en": "Training Management", "types": ["필수", "선택", "외부"]},
            {"id": "G6_049", "name": "학습 추적", "name_en": "Learning Tracking", "types": ["수료", "점수", "피드백"]},
            {"id": "G6_050", "name": "인증 관리", "name_en": "Certification Management", "types": ["취득", "갱신", "만료"]},
            
            # 조직/분석 (10개)
            {"id": "G6_051", "name": "조직도 관리", "name_en": "Org Chart Management", "types": ["변경", "발행", "이력"]},
            {"id": "G6_052", "name": "직무 기술서 관리", "name_en": "Job Description Management", "types": ["생성", "검토", "업데이트"]},
            {"id": "G6_053", "name": "인력 계획", "name_en": "Workforce Planning", "types": ["수요", "공급", "갭분석"]},
            {"id": "G6_054", "name": "인력 분석", "name_en": "Workforce Analytics", "types": ["헤드카운트", "비용", "트렌드"]},
            {"id": "G6_055", "name": "이직률 분석", "name_en": "Turnover Analysis", "types": ["자발", "비자발", "예측"]},
            {"id": "G6_056", "name": "직원 설문", "name_en": "Employee Survey", "types": ["만족도", "참여도", "펄스"]},
            {"id": "G6_057", "name": "직원 셀프서비스", "name_en": "Employee Self-Service", "types": ["정보변경", "증명서", "요청"]},
            {"id": "G6_058", "name": "HR 케이스 관리", "name_en": "HR Case Management", "types": ["문의", "불만", "조사"]},
            {"id": "G6_059", "name": "노무 관리", "name_en": "Labor Relations Management", "types": ["협상", "분쟁", "규정"]},
            {"id": "G6_060", "name": "HR 규정 준수", "name_en": "HR Compliance", "types": ["법적", "정책", "감사"]},
        ]
    },
    
    # ==========================================================================
    # 그룹 7: IT·운영 (55개)
    # ==========================================================================
    "GROUP_7_IT_OPERATIONS": {
        "group_name": "IT_운영",
        "group_name_en": "IT Operations",
        "layer": "엣지커넥터",
        "task_count": 55,
        "tasks": [
            # 헬프데스크 (15개)
            {"id": "G7_001", "name": "티켓 라우팅", "name_en": "Ticket Routing", "types": ["IT헬프데스크", "고객지원", "버그", "시설"]},
            {"id": "G7_002", "name": "티켓 분류", "name_en": "Ticket Classification", "types": ["카테고리", "우선순위", "유형"]},
            {"id": "G7_003", "name": "티켓 할당", "name_en": "Ticket Assignment", "types": ["자동", "수동", "에스컬레이션"]},
            {"id": "G7_004", "name": "티켓 해결", "name_en": "Ticket Resolution", "types": ["L1", "L2", "L3"]},
            {"id": "G7_005", "name": "SLA 관리", "name_en": "SLA Management", "types": ["모니터링", "알림", "보고"]},
            {"id": "G7_006", "name": "지식베이스 업데이트", "name_en": "Knowledge Base Update", "types": ["문서", "FAQ", "해결책"]},
            {"id": "G7_007", "name": "비밀번호 리셋", "name_en": "Password Reset", "types": ["셀프서비스", "검증", "긴급"]},
            {"id": "G7_008", "name": "계정 잠금 해제", "name_en": "Account Unlock", "types": ["자동", "수동", "검증"]},
            {"id": "G7_009", "name": "접근 권한 요청", "name_en": "Access Request", "types": ["시스템", "데이터", "물리"]},
            {"id": "G7_010", "name": "소프트웨어 설치", "name_en": "Software Installation", "types": ["표준", "예외", "업그레이드"]},
            {"id": "G7_011", "name": "하드웨어 지원", "name_en": "Hardware Support", "types": ["문제해결", "교체", "업그레이드"]},
            {"id": "G7_012", "name": "VPN 지원", "name_en": "VPN Support", "types": ["설정", "문제해결", "접근"]},
            {"id": "G7_013", "name": "이메일 지원", "name_en": "Email Support", "types": ["설정", "문제해결", "복구"]},
            {"id": "G7_014", "name": "프린터 지원", "name_en": "Printer Support", "types": ["설정", "문제해결", "관리"]},
            {"id": "G7_015", "name": "원격 지원", "name_en": "Remote Support", "types": ["화면공유", "원격접속", "가이드"]},
            
            # 인프라 관리 (15개)
            {"id": "G7_016", "name": "서버 관리", "name_en": "Server Management", "types": ["프로비저닝", "모니터링", "유지보수"]},
            {"id": "G7_017", "name": "네트워크 관리", "name_en": "Network Management", "types": ["설정", "모니터링", "문제해결"]},
            {"id": "G7_018", "name": "스토리지 관리", "name_en": "Storage Management", "types": ["할당", "모니터링", "확장"]},
            {"id": "G7_019", "name": "데이터베이스 관리", "name_en": "Database Management", "types": ["백업", "복구", "최적화"]},
            {"id": "G7_020", "name": "클라우드 관리", "name_en": "Cloud Management", "types": ["프로비저닝", "비용", "최적화"]},
            {"id": "G7_021", "name": "가상화 관리", "name_en": "Virtualization Management", "types": ["VM", "컨테이너", "오케스트레이션"]},
            {"id": "G7_022", "name": "백업 관리", "name_en": "Backup Management", "types": ["스케줄", "검증", "복구"]},
            {"id": "G7_023", "name": "재해 복구", "name_en": "Disaster Recovery", "types": ["계획", "테스트", "실행"]},
            {"id": "G7_024", "name": "용량 계획", "name_en": "Capacity Planning", "types": ["모니터링", "예측", "조정"]},
            {"id": "G7_025", "name": "패치 관리", "name_en": "Patch Management", "types": ["식별", "테스트", "배포"]},
            {"id": "G7_026", "name": "설정 관리", "name_en": "Configuration Management", "types": ["표준화", "변경", "감사"]},
            {"id": "G7_027", "name": "모니터링 설정", "name_en": "Monitoring Setup", "types": ["인프라", "애플리케이션", "로그"]},
            {"id": "G7_028", "name": "알림 관리", "name_en": "Alert Management", "types": ["설정", "라우팅", "에스컬레이션"]},
            {"id": "G7_029", "name": "인시던트 관리", "name_en": "Incident Management", "types": ["감지", "대응", "복구"]},
            {"id": "G7_030", "name": "문제 관리", "name_en": "Problem Management", "types": ["근본원인", "해결책", "예방"]},
            
            # 보안 (15개)
            {"id": "G7_031", "name": "보안 모니터링", "name_en": "Security Monitoring", "types": ["실시간", "로그", "이상탐지"]},
            {"id": "G7_032", "name": "취약점 관리", "name_en": "Vulnerability Management", "types": ["스캔", "평가", "조치"]},
            {"id": "G7_033", "name": "보안 인시던트 대응", "name_en": "Security Incident Response", "types": ["탐지", "분석", "복구"]},
            {"id": "G7_034", "name": "접근 관리", "name_en": "Access Management", "types": ["IAM", "PAM", "SSO"]},
            {"id": "G7_035", "name": "데이터 보안", "name_en": "Data Security", "types": ["암호화", "DLP", "분류"]},
            {"id": "G7_036", "name": "엔드포인트 보안", "name_en": "Endpoint Security", "types": ["안티바이러스", "EDR", "패치"]},
            {"id": "G7_037", "name": "네트워크 보안", "name_en": "Network Security", "types": ["방화벽", "IDS/IPS", "VPN"]},
            {"id": "G7_038", "name": "애플리케이션 보안", "name_en": "Application Security", "types": ["SAST", "DAST", "WAF"]},
            {"id": "G7_039", "name": "보안 인식 교육", "name_en": "Security Awareness Training", "types": ["교육", "피싱테스트", "평가"]},
            {"id": "G7_040", "name": "보안 정책 관리", "name_en": "Security Policy Management", "types": ["생성", "검토", "배포"]},
            {"id": "G7_041", "name": "규정 준수 관리", "name_en": "Compliance Management", "types": ["평가", "감사", "보고"]},
            {"id": "G7_042", "name": "인증서 관리", "name_en": "Certificate Management", "types": ["발급", "갱신", "폐기"]},
            {"id": "G7_043", "name": "키 관리", "name_en": "Key Management", "types": ["생성", "저장", "순환"]},
            {"id": "G7_044", "name": "로그 관리", "name_en": "Log Management", "types": ["수집", "분석", "보존"]},
            {"id": "G7_045", "name": "보안 보고", "name_en": "Security Reporting", "types": ["대시보드", "정기", "인시던트"]},
            
            # DevOps/개발 지원 (10개)
            {"id": "G7_046", "name": "CI/CD 관리", "name_en": "CI/CD Management", "types": ["파이프라인", "빌드", "배포"]},
            {"id": "G7_047", "name": "코드 리뷰", "name_en": "Code Review", "types": ["자동", "수동", "보안"]},
            {"id": "G7_048", "name": "테스트 자동화", "name_en": "Test Automation", "types": ["유닛", "통합", "E2E"]},
            {"id": "G7_049", "name": "환경 관리", "name_en": "Environment Management", "types": ["개발", "스테이징", "프로덕션"]},
            {"id": "G7_050", "name": "릴리스 관리", "name_en": "Release Management", "types": ["계획", "실행", "롤백"]},
            {"id": "G7_051", "name": "버전 관리", "name_en": "Version Control", "types": ["브랜치", "머지", "태그"]},
            {"id": "G7_052", "name": "아티팩트 관리", "name_en": "Artifact Management", "types": ["저장", "배포", "정리"]},
            {"id": "G7_053", "name": "컨테이너 관리", "name_en": "Container Management", "types": ["빌드", "레지스트리", "오케스트레이션"]},
            {"id": "G7_054", "name": "인프라 as 코드", "name_en": "Infrastructure as Code", "types": ["프로비저닝", "설정", "테스트"]},
            {"id": "G7_055", "name": "API 관리", "name_en": "API Management", "types": ["게이트웨이", "문서화", "버전"]},
        ]
    },
    
    # ==========================================================================
    # 그룹 8: 전략·판단 (100개)
    # ==========================================================================
    "GROUP_8_STRATEGY_JUDGMENT": {
        "group_name": "전략_판단",
        "group_name_en": "Strategy Judgment",
        "layer": "도메인로직",
        "task_count": 100,
        "tasks": [
            # 가격/제품 전략 (20개)
            {"id": "G8_001", "name": "가격 책정", "name_en": "Pricing Decision", "types": ["표준", "견적", "동적", "번들"]},
            {"id": "G8_002", "name": "가격 전략 수립", "name_en": "Pricing Strategy", "types": ["침투", "스키밍", "가치기반"]},
            {"id": "G8_003", "name": "할인 전략", "name_en": "Discount Strategy", "types": ["볼륨", "조기결제", "프로모션"]},
            {"id": "G8_004", "name": "번들 설계", "name_en": "Bundle Design", "types": ["제품", "서비스", "혼합"]},
            {"id": "G8_005", "name": "제품 포트폴리오 분석", "name_en": "Product Portfolio Analysis", "types": ["BCG", "수익성", "전략적"]},
            {"id": "G8_006", "name": "제품 라이프사이클 관리", "name_en": "Product Lifecycle Management", "types": ["도입", "성장", "쇠퇴"]},
            {"id": "G8_007", "name": "신제품 결정", "name_en": "New Product Decision", "types": ["출시", "연기", "취소"]},
            {"id": "G8_008", "name": "제품 단종 결정", "name_en": "Product Discontinuation", "types": ["단종", "대체", "병합"]},
            {"id": "G8_009", "name": "기능 우선순위화", "name_en": "Feature Prioritization", "types": ["RICE", "MoSCoW", "Kano"]},
            {"id": "G8_010", "name": "로드맵 계획", "name_en": "Roadmap Planning", "types": ["분기", "연간", "장기"]},
            {"id": "G8_011", "name": "시장 진입 전략", "name_en": "Go-to-Market Strategy", "types": ["신규시장", "신제품", "확장"]},
            {"id": "G8_012", "name": "채널 전략", "name_en": "Channel Strategy", "types": ["직접", "간접", "옴니채널"]},
            {"id": "G8_013", "name": "파트너 전략", "name_en": "Partner Strategy", "types": ["리셀러", "기술", "전략적"]},
            {"id": "G8_014", "name": "경쟁 대응 전략", "name_en": "Competitive Response Strategy", "types": ["가격", "기능", "포지셔닝"]},
            {"id": "G8_015", "name": "차별화 전략", "name_en": "Differentiation Strategy", "types": ["제품", "서비스", "브랜드"]},
            {"id": "G8_016", "name": "세그먼트 전략", "name_en": "Segment Strategy", "types": ["타겟", "니치", "대중"]},
            {"id": "G8_017", "name": "글로벌 전략", "name_en": "Global Strategy", "types": ["진출", "로컬화", "표준화"]},
            {"id": "G8_018", "name": "브랜드 전략", "name_en": "Brand Strategy", "types": ["포지셔닝", "아키텍처", "확장"]},
            {"id": "G8_019", "name": "패키징 전략", "name_en": "Packaging Strategy", "types": ["제품", "가격", "번들"]},
            {"id": "G8_020", "name": "서비스 전략", "name_en": "Service Strategy", "types": ["표준", "프리미엄", "맞춤"]},
            
            # 투자/재무 판단 (20개)
            {"id": "G8_021", "name": "투자 결정", "name_en": "Investment Decision", "types": ["자본", "인수", "전략적"]},
            {"id": "G8_022", "name": "ROI 분석", "name_en": "ROI Analysis", "types": ["프로젝트", "마케팅", "기술"]},
            {"id": "G8_023", "name": "예산 배분", "name_en": "Budget Allocation", "types": ["부서", "프로젝트", "이니셔티브"]},
            {"id": "G8_024", "name": "비용 최적화", "name_en": "Cost Optimization", "types": ["운영", "인력", "기술"]},
            {"id": "G8_025", "name": "Make vs Buy 결정", "name_en": "Make vs Buy Decision", "types": ["제품", "서비스", "기술"]},
            {"id": "G8_026", "name": "아웃소싱 결정", "name_en": "Outsourcing Decision", "types": ["기능", "프로세스", "기술"]},
            {"id": "G8_027", "name": "자본 구조 결정", "name_en": "Capital Structure Decision", "types": ["부채", "자본", "혼합"]},
            {"id": "G8_028", "name": "배당 결정", "name_en": "Dividend Decision", "types": ["지급", "재투자", "혼합"]},
            {"id": "G8_029", "name": "환 리스크 관리", "name_en": "FX Risk Management Decision", "types": ["헤지", "자연헤지", "수용"]},
            {"id": "G8_030", "name": "신용 결정", "name_en": "Credit Decision", "types": ["한도", "조건", "갱신"]},
            {"id": "G8_031", "name": "M&A 평가", "name_en": "M&A Evaluation", "types": ["인수", "합병", "매각"]},
            {"id": "G8_032", "name": "실사 (Due Diligence)", "name_en": "Due Diligence", "types": ["재무", "법률", "기술"]},
            {"id": "G8_033", "name": "시너지 분석", "name_en": "Synergy Analysis", "types": ["비용", "수익", "전략적"]},
            {"id": "G8_034", "name": "밸류에이션", "name_en": "Valuation", "types": ["DCF", "비교", "자산"]},
            {"id": "G8_035", "name": "딜 구조화", "name_en": "Deal Structuring", "types": ["가격", "조건", "통합"]},
            {"id": "G8_036", "name": "PMI 계획", "name_en": "PMI Planning", "types": ["조직", "시스템", "문화"]},
            {"id": "G8_037", "name": "사업 철수 결정", "name_en": "Business Exit Decision", "types": ["매각", "청산", "스핀오프"]},
            {"id": "G8_038", "name": "자본 투자 결정", "name_en": "CapEx Decision", "types": ["설비", "기술", "시설"]},
            {"id": "G8_039", "name": "리스 vs 구매", "name_en": "Lease vs Buy", "types": ["장비", "부동산", "차량"]},
            {"id": "G8_040", "name": "현금 관리 전략", "name_en": "Cash Management Strategy", "types": ["유동성", "투자", "운영"]},
            
            # 조직/인력 판단 (20개)
            {"id": "G8_041", "name": "조직 설계", "name_en": "Organization Design", "types": ["구조", "역할", "보고체계"]},
            {"id": "G8_042", "name": "인력 계획", "name_en": "Workforce Planning", "types": ["충원", "감축", "재배치"]},
            {"id": "G8_043", "name": "채용 결정", "name_en": "Hiring Decision", "types": ["직접", "아웃소싱", "계약"]},
            {"id": "G8_044", "name": "승진 결정", "name_en": "Promotion Decision", "types": ["정기", "발탁", "전보"]},
            {"id": "G8_045", "name": "보상 결정", "name_en": "Compensation Decision", "types": ["인상", "보너스", "인센티브"]},
            {"id": "G8_046", "name": "인력 감축 결정", "name_en": "Workforce Reduction Decision", "types": ["자연감소", "희망퇴직", "정리해고"]},
            {"id": "G8_047", "name": "조직 변경 결정", "name_en": "Org Change Decision", "types": ["신설", "통합", "폐지"]},
            {"id": "G8_048", "name": "리더십 배치", "name_en": "Leadership Placement", "types": ["내부승진", "외부영입", "로테이션"]},
            {"id": "G8_049", "name": "팀 구성", "name_en": "Team Composition", "types": ["스킬믹스", "다양성", "크기"]},
            {"id": "G8_050", "name": "근무 형태 결정", "name_en": "Work Arrangement Decision", "types": ["사무실", "재택", "하이브리드"]},
            {"id": "G8_051", "name": "위치 전략", "name_en": "Location Strategy", "types": ["집중", "분산", "니어쇼어"]},
            {"id": "G8_052", "name": "문화 이니셔티브", "name_en": "Culture Initiative", "types": ["가치", "행동", "환경"]},
            {"id": "G8_053", "name": "다양성 전략", "name_en": "Diversity Strategy", "types": ["채용", "육성", "포용"]},
            {"id": "G8_054", "name": "교육 투자 결정", "name_en": "Training Investment Decision", "types": ["프로그램", "기술", "리더십"]},
            {"id": "G8_055", "name": "성과 관리 설계", "name_en": "Performance Management Design", "types": ["목표", "평가", "보상연계"]},
            {"id": "G8_056", "name": "승계 계획", "name_en": "Succession Planning", "types": ["핵심역할", "파이프라인", "개발"]},
            {"id": "G8_057", "name": "노사 전략", "name_en": "Labor Relations Strategy", "types": ["협상", "관계", "분쟁"]},
            {"id": "G8_058", "name": "복리후생 설계", "name_en": "Benefits Design", "types": ["건강", "퇴직", "유연근무"]},
            {"id": "G8_059", "name": "인재 확보 전략", "name_en": "Talent Acquisition Strategy", "types": ["브랜딩", "소싱", "경쟁력"]},
            {"id": "G8_060", "name": "인재 유지 전략", "name_en": "Talent Retention Strategy", "types": ["참여", "개발", "보상"]},
            
            # 운영/기술 판단 (20개)
            {"id": "G8_061", "name": "기술 스택 결정", "name_en": "Technology Stack Decision", "types": ["플랫폼", "언어", "프레임워크"]},
            {"id": "G8_062", "name": "벤더 선정", "name_en": "Vendor Selection", "types": ["RFP", "평가", "협상"]},
            {"id": "G8_063", "name": "시스템 교체 결정", "name_en": "System Replacement Decision", "types": ["업그레이드", "교체", "통합"]},
            {"id": "G8_064", "name": "클라우드 전략", "name_en": "Cloud Strategy", "types": ["마이그레이션", "네이티브", "하이브리드"]},
            {"id": "G8_065", "name": "보안 투자 결정", "name_en": "Security Investment Decision", "types": ["도구", "인력", "프로세스"]},
            {"id": "G8_066", "name": "데이터 전략", "name_en": "Data Strategy", "types": ["아키텍처", "거버넌스", "분석"]},
            {"id": "G8_067", "name": "AI/ML 투자 결정", "name_en": "AI/ML Investment Decision", "types": ["사용사례", "기술", "인력"]},
            {"id": "G8_068", "name": "자동화 우선순위", "name_en": "Automation Prioritization", "types": ["프로세스", "기술", "ROI"]},
            {"id": "G8_069", "name": "표준화 결정", "name_en": "Standardization Decision", "types": ["프로세스", "기술", "데이터"]},
            {"id": "G8_070", "name": "용량 결정", "name_en": "Capacity Decision", "types": ["확장", "축소", "최적화"]},
            {"id": "G8_071", "name": "SLA 설정", "name_en": "SLA Setting", "types": ["내부", "외부", "벤더"]},
            {"id": "G8_072", "name": "아키텍처 결정", "name_en": "Architecture Decision", "types": ["설계", "변경", "마이그레이션"]},
            {"id": "G8_073", "name": "통합 전략", "name_en": "Integration Strategy", "types": ["시스템", "데이터", "프로세스"]},
            {"id": "G8_074", "name": "레거시 전략", "name_en": "Legacy Strategy", "types": ["유지", "현대화", "교체"]},
            {"id": "G8_075", "name": "재해복구 전략", "name_en": "Disaster Recovery Strategy", "types": ["RTO/RPO", "사이트", "테스트"]},
            {"id": "G8_076", "name": "운영 모델 설계", "name_en": "Operating Model Design", "types": ["중앙", "분산", "연합"]},
            {"id": "G8_077", "name": "프로세스 개선 결정", "name_en": "Process Improvement Decision", "types": ["린", "식스시그마", "리엔지니어링"]},
            {"id": "G8_078", "name": "품질 전략", "name_en": "Quality Strategy", "types": ["표준", "인증", "개선"]},
            {"id": "G8_079", "name": "공급망 전략", "name_en": "Supply Chain Strategy", "types": ["소싱", "물류", "재고"]},
            {"id": "G8_080", "name": "시설 전략", "name_en": "Facility Strategy", "types": ["위치", "크기", "설계"]},
            
            # 리스크/거버넌스 판단 (20개)
            {"id": "G8_081", "name": "리스크 평가", "name_en": "Risk Assessment", "types": ["전략", "운영", "재무"]},
            {"id": "G8_082", "name": "리스크 대응 결정", "name_en": "Risk Response Decision", "types": ["회피", "완화", "수용"]},
            {"id": "G8_083", "name": "컴플라이언스 전략", "name_en": "Compliance Strategy", "types": ["규제", "내부", "산업"]},
            {"id": "G8_084", "name": "거버넌스 설계", "name_en": "Governance Design", "types": ["구조", "프로세스", "보고"]},
            {"id": "G8_085", "name": "정책 결정", "name_en": "Policy Decision", "types": ["신규", "변경", "폐지"]},
            {"id": "G8_086", "name": "감사 대응", "name_en": "Audit Response", "types": ["계획", "대응", "개선"]},
            {"id": "G8_087", "name": "위기 관리 결정", "name_en": "Crisis Management Decision", "types": ["대응", "커뮤니케이션", "복구"]},
            {"id": "G8_088", "name": "법적 전략", "name_en": "Legal Strategy", "types": ["소송", "협상", "방어"]},
            {"id": "G8_089", "name": "IP 전략", "name_en": "IP Strategy", "types": ["보호", "라이선싱", "방어"]},
            {"id": "G8_090", "name": "개인정보 전략", "name_en": "Privacy Strategy", "types": ["규정준수", "설계", "대응"]},
            {"id": "G8_091", "name": "ESG 전략", "name_en": "ESG Strategy", "types": ["환경", "사회", "거버넌스"]},
            {"id": "G8_092", "name": "지속가능성 결정", "name_en": "Sustainability Decision", "types": ["목표", "이니셔티브", "보고"]},
            {"id": "G8_093", "name": "윤리 결정", "name_en": "Ethics Decision", "types": ["정책", "사례", "교육"]},
            {"id": "G8_094", "name": "이해관계자 관리", "name_en": "Stakeholder Management", "types": ["식별", "참여", "커뮤니케이션"]},
            {"id": "G8_095", "name": "이사회 보고", "name_en": "Board Reporting", "types": ["정기", "특별", "위원회"]},
            {"id": "G8_096", "name": "투자자 관계", "name_en": "Investor Relations", "types": ["보고", "미팅", "공시"]},
            {"id": "G8_097", "name": "전략 계획", "name_en": "Strategic Planning", "types": ["연간", "장기", "시나리오"]},
            {"id": "G8_098", "name": "사업 계획", "name_en": "Business Planning", "types": ["운영", "재무", "이니셔티브"]},
            {"id": "G8_099", "name": "성과 관리", "name_en": "Performance Management", "types": ["KPI", "스코어카드", "리뷰"]},
            {"id": "G8_100", "name": "변화 관리", "name_en": "Change Management", "types": ["계획", "실행", "정착"]},
        ]
    }
}


def get_all_tasks() -> list[dict]:
    """전체 570개 업무 목록 반환"""
    all_tasks = []
    for group_key, group_data in TASK_DEFINITIONS.items():
        for task in group_data["tasks"]:
            all_tasks.append({
                **task,
                "group": group_data["group_name"],
                "group_en": group_data["group_name_en"],
                "layer": group_data["layer"]
            })
    return all_tasks


def get_tasks_by_group(group_name: str) -> list[dict]:
    """그룹별 업무 목록 반환"""
    for group_key, group_data in TASK_DEFINITIONS.items():
        if group_data["group_name"] == group_name or group_data["group_name_en"] == group_name:
            return group_data["tasks"]
    return []


def get_task_count() -> dict:
    """그룹별 업무 수 반환"""
    counts = {}
    total = 0
    for group_key, group_data in TASK_DEFINITIONS.items():
        counts[group_data["group_name"]] = len(group_data["tasks"])
        total += len(group_data["tasks"])
    counts["total"] = total
    return counts


if __name__ == "__main__":
    counts = get_task_count()
    print("=" * 60)
    print("AUTUS 570개 업무 정의")
    print("=" * 60)
    for group, count in counts.items():
        print(f"{group}: {count}개")
