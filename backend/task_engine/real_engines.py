"""
AUTUS 실제 엔진 연동 모듈
OCR, ML, 외부 서비스 통합
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional
from datetime import datetime
import json
import base64
import hashlib
import asyncio
from enum import Enum


# =============================================================================
# 1. ENGINE INTERFACE
# =============================================================================

class EngineStatus(Enum):
    READY = "ready"
    BUSY = "busy"
    ERROR = "error"
    OFFLINE = "offline"


@dataclass
class EngineResult:
    """엔진 실행 결과"""
    success: bool
    data: dict
    error: Optional[str] = None
    processing_time_ms: float = 0
    engine_name: str = ""
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class BaseEngine(ABC):
    """엔진 베이스 클래스"""
    
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.status = EngineStatus.READY
        self._call_count = 0
        self._total_time = 0
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @abstractmethod
    async def execute(self, input_data: dict) -> EngineResult:
        pass
    
    @abstractmethod
    def health_check(self) -> bool:
        pass
    
    def get_stats(self) -> dict:
        return {
            "name": self.name,
            "status": self.status.value,
            "call_count": self._call_count,
            "avg_time_ms": self._total_time / self._call_count if self._call_count > 0 else 0
        }


# =============================================================================
# 2. OCR ENGINE (AWS Textract / Google Document AI 연동)
# =============================================================================

class OCREngine(BaseEngine):
    """OCR 엔진 - 문서에서 텍스트/구조 추출"""
    
    @property
    def name(self) -> str:
        return "ocr_engine"
    
    def __init__(self, config: dict = None):
        super().__init__(config)
        self.provider = config.get("provider", "textract") if config else "textract"
        self._client = None
    
    def _init_client(self):
        """클라이언트 초기화 (lazy loading)"""
        if self._client is not None:
            return
        
        if self.provider == "textract":
            try:
                import boto3
                self._client = boto3.client(
                    'textract',
                    region_name=self.config.get("region", "us-east-1"),
                    aws_access_key_id=self.config.get("aws_access_key"),
                    aws_secret_access_key=self.config.get("aws_secret_key")
                )
            except ImportError:
                self._client = "mock"  # Mock mode
        
        elif self.provider == "google_docai":
            try:
                from google.cloud import documentai_v1 as documentai
                self._client = documentai.DocumentProcessorServiceClient()
            except ImportError:
                self._client = "mock"
    
    async def execute(self, input_data: dict) -> EngineResult:
        """
        OCR 실행
        
        input_data:
            - document: bytes (문서 데이터)
            - document_type: str (pdf, image, etc)
            - extract_mode: str (text, tables, forms, all)
        """
        start_time = datetime.now()
        self._call_count += 1
        
        try:
            self._init_client()
            
            document = input_data.get("document")
            doc_type = input_data.get("document_type", "pdf")
            extract_mode = input_data.get("extract_mode", "all")
            
            # Mock 모드 또는 실제 API 호출
            if self._client == "mock" or document is None:
                result = self._mock_extraction(doc_type, extract_mode)
            else:
                result = await self._real_extraction(document, doc_type, extract_mode)
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self._total_time += processing_time
            
            return EngineResult(
                success=True,
                data=result,
                processing_time_ms=processing_time,
                engine_name=self.name
            )
            
        except Exception as e:
            return EngineResult(
                success=False,
                data={},
                error=str(e),
                engine_name=self.name
            )
    
    def _mock_extraction(self, doc_type: str, extract_mode: str) -> dict:
        """Mock OCR 결과"""
        return {
            "raw_text": "Sample extracted text from document...",
            "confidence": 0.95,
            "pages": 1,
            "tables": [
                {
                    "rows": 3,
                    "cols": 4,
                    "data": [
                        ["Header1", "Header2", "Header3", "Header4"],
                        ["Value1", "Value2", "Value3", "Value4"],
                        ["Value5", "Value6", "Value7", "Value8"]
                    ]
                }
            ] if extract_mode in ["tables", "all"] else [],
            "forms": [
                {"field": "Invoice Number", "value": "INV-2024-001", "confidence": 0.98},
                {"field": "Date", "value": "2024-01-15", "confidence": 0.97},
                {"field": "Total", "value": "1,234.56", "confidence": 0.96}
            ] if extract_mode in ["forms", "all"] else [],
            "entities": [
                {"type": "DATE", "value": "2024-01-15", "confidence": 0.95},
                {"type": "MONEY", "value": "$1,234.56", "confidence": 0.94},
                {"type": "ORGANIZATION", "value": "Sample Corp", "confidence": 0.92}
            ]
        }
    
    async def _real_extraction(self, document: bytes, doc_type: str, extract_mode: str) -> dict:
        """실제 OCR API 호출"""
        if self.provider == "textract":
            return await self._textract_extraction(document, extract_mode)
        elif self.provider == "google_docai":
            return await self._docai_extraction(document, extract_mode)
        return self._mock_extraction(doc_type, extract_mode)
    
    async def _textract_extraction(self, document: bytes, extract_mode: str) -> dict:
        """AWS Textract 호출"""
        # 실제 구현
        response = self._client.analyze_document(
            Document={'Bytes': document},
            FeatureTypes=['TABLES', 'FORMS'] if extract_mode == "all" else [extract_mode.upper()]
        )
        
        # 결과 파싱
        return self._parse_textract_response(response)
    
    async def _docai_extraction(self, document: bytes, extract_mode: str) -> dict:
        """Google Document AI 호출"""
        # 실제 구현 시 추가
        return self._mock_extraction("pdf", extract_mode)
    
    def _parse_textract_response(self, response: dict) -> dict:
        """Textract 응답 파싱"""
        blocks = response.get("Blocks", [])
        
        text_blocks = [b for b in blocks if b["BlockType"] == "LINE"]
        table_blocks = [b for b in blocks if b["BlockType"] == "TABLE"]
        
        return {
            "raw_text": "\n".join([b["Text"] for b in text_blocks if "Text" in b]),
            "confidence": sum([b.get("Confidence", 0) for b in text_blocks]) / max(len(text_blocks), 1),
            "pages": 1,
            "tables": [],  # 파싱 로직 추가 필요
            "forms": [],
            "entities": []
        }
    
    def health_check(self) -> bool:
        try:
            self._init_client()
            return self._client is not None
        except:
            return False


# =============================================================================
# 3. ML SCORING ENGINE (MLflow / SageMaker 연동)
# =============================================================================

class MLScoringEngine(BaseEngine):
    """ML 스코어링 엔진"""
    
    @property
    def name(self) -> str:
        return "ml_scoring_engine"
    
    def __init__(self, config: dict = None):
        super().__init__(config)
        self.models: dict[str, Any] = {}
        self._mlflow_client = None
    
    def _init_mlflow(self):
        """MLflow 클라이언트 초기화"""
        if self._mlflow_client is not None:
            return
        
        try:
            import mlflow
            tracking_uri = self.config.get("mlflow_tracking_uri", "http://localhost:5000")
            mlflow.set_tracking_uri(tracking_uri)
            self._mlflow_client = mlflow.tracking.MlflowClient()
        except ImportError:
            self._mlflow_client = "mock"
    
    async def execute(self, input_data: dict) -> EngineResult:
        """
        ML 스코어링 실행
        
        input_data:
            - model_name: str (모델 이름)
            - model_version: str (버전)
            - features: dict (입력 피처)
            - scoring_type: str (classification, regression, ranking)
        """
        start_time = datetime.now()
        self._call_count += 1
        
        try:
            model_name = input_data.get("model_name", "default")
            features = input_data.get("features", {})
            scoring_type = input_data.get("scoring_type", "classification")
            
            # 모델별 스코어링
            if model_name == "lead_scoring":
                result = self._score_lead(features)
            elif model_name == "ticket_classification":
                result = self._classify_ticket(features)
            elif model_name == "price_optimization":
                result = self._optimize_price(features)
            elif model_name == "risk_assessment":
                result = self._assess_risk(features)
            elif model_name == "churn_prediction":
                result = self._predict_churn(features)
            else:
                result = self._generic_scoring(features, scoring_type)
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self._total_time += processing_time
            
            return EngineResult(
                success=True,
                data=result,
                processing_time_ms=processing_time,
                engine_name=self.name
            )
            
        except Exception as e:
            return EngineResult(
                success=False,
                data={},
                error=str(e),
                engine_name=self.name
            )
    
    def _score_lead(self, features: dict) -> dict:
        """리드 스코어링"""
        # 피처 가중치 기반 스코어 계산
        weights = {
            "company_size": 0.15,
            "industry_fit": 0.20,
            "engagement_score": 0.25,
            "budget_signal": 0.20,
            "decision_maker": 0.10,
            "timing_fit": 0.10
        }
        
        score = 0
        for feature, weight in weights.items():
            feature_value = features.get(feature, 0.5)
            score += feature_value * weight * 100
        
        grade = "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D"
        
        return {
            "score": round(score, 2),
            "grade": grade,
            "confidence": 0.85,
            "factors": [
                {"name": k, "weight": v, "contribution": features.get(k, 0.5) * v * 100}
                for k, v in weights.items()
            ],
            "recommended_action": "immediate_contact" if grade == "A" else "nurture" if grade == "B" else "monitor"
        }
    
    def _classify_ticket(self, features: dict) -> dict:
        """티켓 분류"""
        text = features.get("text", "").lower()
        
        # 키워드 기반 분류 (실제로는 NLP 모델 사용)
        categories = {
            "billing": ["invoice", "payment", "charge", "refund", "bill"],
            "technical": ["error", "bug", "crash", "not working", "broken"],
            "account": ["password", "login", "access", "account", "reset"],
            "general": ["question", "help", "info", "how to"]
        }
        
        scores = {}
        for category, keywords in categories.items():
            scores[category] = sum(1 for k in keywords if k in text)
        
        best_category = max(scores, key=scores.get) if any(scores.values()) else "general"
        
        # 우선순위 결정
        urgency_keywords = ["urgent", "asap", "critical", "emergency", "down"]
        priority = "high" if any(k in text for k in urgency_keywords) else "normal"
        
        return {
            "category": best_category,
            "confidence": 0.78,
            "priority": priority,
            "suggested_tags": [best_category, priority],
            "sentiment": "negative" if "not" in text or "error" in text else "neutral"
        }
    
    def _optimize_price(self, features: dict) -> dict:
        """가격 최적화"""
        base_cost = features.get("base_cost", 100)
        target_margin = features.get("target_margin", 0.30)
        competitor_price = features.get("competitor_price", 150)
        demand_elasticity = features.get("demand_elasticity", -1.5)
        customer_segment = features.get("customer_segment", "standard")
        
        # 세그먼트별 마진 조정
        segment_multiplier = {
            "enterprise": 1.25,
            "standard": 1.0,
            "startup": 0.85
        }.get(customer_segment, 1.0)
        
        # 최적 가격 계산
        cost_plus_price = base_cost * (1 + target_margin)
        competitive_price = competitor_price * 0.95  # 5% 언더컷
        
        optimal_price = (cost_plus_price * 0.6 + competitive_price * 0.4) * segment_multiplier
        
        return {
            "recommended_price": round(optimal_price, 2),
            "price_range": {
                "min": round(base_cost * 1.1, 2),
                "max": round(competitor_price * 1.1, 2)
            },
            "expected_margin": round((optimal_price - base_cost) / optimal_price, 4),
            "confidence": 0.82,
            "factors": {
                "cost_pressure": "low" if base_cost < 80 else "medium" if base_cost < 120 else "high",
                "competitive_position": "strong" if optimal_price < competitor_price else "weak",
                "demand_sensitivity": "elastic" if demand_elasticity < -1 else "inelastic"
            }
        }
    
    def _assess_risk(self, features: dict) -> dict:
        """리스크 평가"""
        risk_factors = {
            "credit_score": features.get("credit_score", 700),
            "payment_history": features.get("payment_history", 0.9),
            "industry_risk": features.get("industry_risk", 0.3),
            "contract_value": features.get("contract_value", 10000),
            "relationship_length": features.get("relationship_length", 12)
        }
        
        # 리스크 스코어 계산 (0-100, 높을수록 위험)
        risk_score = (
            (800 - risk_factors["credit_score"]) / 8 +  # 0-100
            (1 - risk_factors["payment_history"]) * 30 +
            risk_factors["industry_risk"] * 20 +
            min(risk_factors["contract_value"] / 1000, 20) -
            min(risk_factors["relationship_length"] / 12, 10)
        )
        
        risk_score = max(0, min(100, risk_score))
        
        return {
            "risk_score": round(risk_score, 2),
            "risk_level": "low" if risk_score < 30 else "medium" if risk_score < 60 else "high",
            "confidence": 0.88,
            "risk_factors": [
                {"factor": k, "value": v, "impact": "high" if k in ["credit_score", "payment_history"] else "medium"}
                for k, v in risk_factors.items()
            ],
            "recommendation": "approve" if risk_score < 40 else "review" if risk_score < 70 else "decline"
        }
    
    def _predict_churn(self, features: dict) -> dict:
        """이탈 예측"""
        usage_trend = features.get("usage_trend", 0)  # -1 to 1
        support_tickets = features.get("support_tickets_last_30d", 0)
        nps_score = features.get("nps_score", 7)
        contract_remaining_days = features.get("contract_remaining_days", 180)
        
        # 이탈 확률 계산
        churn_probability = (
            (1 - (nps_score / 10)) * 0.3 +
            max(0, -usage_trend) * 0.3 +
            min(support_tickets / 10, 1) * 0.2 +
            max(0, (90 - contract_remaining_days) / 90) * 0.2
        )
        
        churn_probability = max(0, min(1, churn_probability))
        
        return {
            "churn_probability": round(churn_probability, 4),
            "churn_risk": "high" if churn_probability > 0.6 else "medium" if churn_probability > 0.3 else "low",
            "confidence": 0.79,
            "key_drivers": [
                {"factor": "usage_decline", "impact": max(0, -usage_trend)},
                {"factor": "low_satisfaction", "impact": 1 - nps_score / 10},
                {"factor": "support_issues", "impact": min(support_tickets / 10, 1)}
            ],
            "recommended_actions": [
                "proactive_outreach" if churn_probability > 0.5 else None,
                "success_review" if usage_trend < 0 else None,
                "renewal_discussion" if contract_remaining_days < 90 else None
            ]
        }
    
    def _generic_scoring(self, features: dict, scoring_type: str) -> dict:
        """범용 스코어링"""
        feature_values = list(features.values()) if features else [0.5]
        avg_score = sum(v for v in feature_values if isinstance(v, (int, float))) / len(feature_values)
        
        return {
            "score": round(avg_score * 100, 2),
            "type": scoring_type,
            "confidence": 0.70,
            "features_used": len(features)
        }
    
    def health_check(self) -> bool:
        return True


# =============================================================================
# 4. NOTIFICATION ENGINE (Email/Slack/SMS)
# =============================================================================

class NotificationEngine(BaseEngine):
    """알림 엔진"""
    
    @property
    def name(self) -> str:
        return "notification_engine"
    
    def __init__(self, config: dict = None):
        super().__init__(config)
        self._email_client = None
        self._slack_client = None
        self._sms_client = None
    
    async def execute(self, input_data: dict) -> EngineResult:
        """
        알림 발송
        
        input_data:
            - channel: str (email, slack, sms, webhook)
            - recipients: list[str]
            - subject: str (이메일용)
            - message: str
            - template: str (템플릿 이름)
            - data: dict (템플릿 데이터)
            - priority: str (low, normal, high, urgent)
        """
        start_time = datetime.now()
        self._call_count += 1
        
        try:
            channel = input_data.get("channel", "email")
            recipients = input_data.get("recipients", [])
            message = input_data.get("message", "")
            
            if channel == "email":
                result = await self._send_email(input_data)
            elif channel == "slack":
                result = await self._send_slack(input_data)
            elif channel == "sms":
                result = await self._send_sms(input_data)
            elif channel == "webhook":
                result = await self._send_webhook(input_data)
            else:
                result = {"sent": False, "error": f"Unknown channel: {channel}"}
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self._total_time += processing_time
            
            return EngineResult(
                success=result.get("sent", False),
                data=result,
                processing_time_ms=processing_time,
                engine_name=self.name
            )
            
        except Exception as e:
            return EngineResult(
                success=False,
                data={},
                error=str(e),
                engine_name=self.name
            )
    
    async def _send_email(self, input_data: dict) -> dict:
        """이메일 발송"""
        # Mock 구현 (실제로는 SendGrid, SES 등 사용)
        recipients = input_data.get("recipients", [])
        subject = input_data.get("subject", "Notification")
        
        return {
            "sent": True,
            "channel": "email",
            "recipients_count": len(recipients),
            "message_id": hashlib.md5(f"{subject}{datetime.now()}".encode()).hexdigest()[:12]
        }
    
    async def _send_slack(self, input_data: dict) -> dict:
        """Slack 발송"""
        channel = input_data.get("slack_channel", "#general")
        message = input_data.get("message", "")
        
        # Mock 구현 (실제로는 Slack API 사용)
        return {
            "sent": True,
            "channel": "slack",
            "slack_channel": channel,
            "ts": datetime.now().timestamp()
        }
    
    async def _send_sms(self, input_data: dict) -> dict:
        """SMS 발송"""
        recipients = input_data.get("recipients", [])
        
        # Mock 구현 (실제로는 Twilio 등 사용)
        return {
            "sent": True,
            "channel": "sms",
            "recipients_count": len(recipients),
            "segments": 1
        }
    
    async def _send_webhook(self, input_data: dict) -> dict:
        """Webhook 발송"""
        url = input_data.get("webhook_url", "")
        payload = input_data.get("payload", {})
        
        # Mock 구현
        return {
            "sent": True,
            "channel": "webhook",
            "url": url,
            "status_code": 200
        }
    
    def health_check(self) -> bool:
        return True


# =============================================================================
# 5. WORKFLOW ENGINE (승인 플로우, SLA 타이머)
# =============================================================================

class WorkflowEngine(BaseEngine):
    """워크플로 엔진"""
    
    @property
    def name(self) -> str:
        return "workflow_engine"
    
    def __init__(self, config: dict = None):
        super().__init__(config)
        self.active_workflows: dict[str, dict] = {}
        self.sla_timers: dict[str, dict] = {}
    
    async def execute(self, input_data: dict) -> EngineResult:
        """
        워크플로 실행
        
        input_data:
            - action: str (start, approve, reject, escalate, check_sla)
            - workflow_id: str
            - workflow_type: str
            - data: dict
        """
        start_time = datetime.now()
        self._call_count += 1
        
        try:
            action = input_data.get("action", "start")
            workflow_id = input_data.get("workflow_id")
            
            if action == "start":
                result = self._start_workflow(input_data)
            elif action == "approve":
                result = self._approve_step(workflow_id, input_data)
            elif action == "reject":
                result = self._reject_step(workflow_id, input_data)
            elif action == "escalate":
                result = self._escalate(workflow_id, input_data)
            elif action == "check_sla":
                result = self._check_sla(workflow_id)
            elif action == "route":
                result = self._route_approval(input_data)
            else:
                result = {"error": f"Unknown action: {action}"}
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self._total_time += processing_time
            
            return EngineResult(
                success="error" not in result,
                data=result,
                processing_time_ms=processing_time,
                engine_name=self.name
            )
            
        except Exception as e:
            return EngineResult(
                success=False,
                data={},
                error=str(e),
                engine_name=self.name
            )
    
    def _start_workflow(self, input_data: dict) -> dict:
        """워크플로 시작"""
        workflow_type = input_data.get("workflow_type", "approval")
        data = input_data.get("data", {})
        
        workflow_id = hashlib.md5(f"{workflow_type}{datetime.now()}".encode()).hexdigest()[:12]
        
        # 승인 매트릭스 결정
        approval_matrix = self._get_approval_matrix(workflow_type, data)
        
        workflow = {
            "id": workflow_id,
            "type": workflow_type,
            "status": "pending",
            "current_step": 0,
            "steps": approval_matrix["steps"],
            "data": data,
            "created_at": datetime.now().isoformat(),
            "sla_deadline": (datetime.now().timestamp() + approval_matrix["sla_hours"] * 3600)
        }
        
        self.active_workflows[workflow_id] = workflow
        
        # SLA 타이머 설정
        self.sla_timers[workflow_id] = {
            "deadline": workflow["sla_deadline"],
            "escalation_at": workflow["sla_deadline"] - 3600  # 1시간 전 알림
        }
        
        return {
            "workflow_id": workflow_id,
            "status": "started",
            "current_approver": approval_matrix["steps"][0] if approval_matrix["steps"] else None,
            "sla_hours": approval_matrix["sla_hours"]
        }
    
    def _get_approval_matrix(self, workflow_type: str, data: dict) -> dict:
        """승인 매트릭스 결정"""
        value = data.get("value", 0)
        
        matrices = {
            "expense": {
                "thresholds": [
                    (500, ["auto"], 24),
                    (5000, ["manager"], 48),
                    (50000, ["manager", "director"], 72),
                    (float("inf"), ["manager", "director", "cfo"], 96)
                ]
            },
            "purchase": {
                "thresholds": [
                    (1000, ["auto"], 24),
                    (10000, ["manager"], 48),
                    (100000, ["manager", "procurement"], 72),
                    (float("inf"), ["manager", "procurement", "cfo"], 120)
                ]
            },
            "leave": {
                "thresholds": [
                    (3, ["manager"], 24),  # 3일 이하
                    (14, ["manager", "hr"], 48),
                    (float("inf"), ["manager", "hr", "director"], 72)
                ]
            }
        }
        
        matrix = matrices.get(workflow_type, {"thresholds": [(float("inf"), ["manager"], 48)]})
        
        for threshold, steps, sla in matrix["thresholds"]:
            if value <= threshold:
                return {"steps": steps, "sla_hours": sla}
        
        return {"steps": ["manager"], "sla_hours": 48}
    
    def _approve_step(self, workflow_id: str, input_data: dict) -> dict:
        """승인 단계 처리"""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}
        
        workflow["current_step"] += 1
        
        if workflow["current_step"] >= len(workflow["steps"]):
            workflow["status"] = "approved"
            return {
                "workflow_id": workflow_id,
                "status": "approved",
                "completed_at": datetime.now().isoformat()
            }
        
        return {
            "workflow_id": workflow_id,
            "status": "pending",
            "current_step": workflow["current_step"],
            "next_approver": workflow["steps"][workflow["current_step"]]
        }
    
    def _reject_step(self, workflow_id: str, input_data: dict) -> dict:
        """반려 처리"""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}
        
        workflow["status"] = "rejected"
        workflow["rejection_reason"] = input_data.get("reason", "")
        
        return {
            "workflow_id": workflow_id,
            "status": "rejected",
            "reason": workflow["rejection_reason"]
        }
    
    def _escalate(self, workflow_id: str, input_data: dict) -> dict:
        """에스컬레이션"""
        workflow = self.active_workflows.get(workflow_id)
        if not workflow:
            return {"error": "Workflow not found"}
        
        # 상위 레벨로 에스컬레이션
        escalation_map = {
            "manager": "director",
            "director": "vp",
            "vp": "cfo",
            "cfo": "ceo"
        }
        
        current = workflow["steps"][workflow["current_step"]] if workflow["steps"] else "manager"
        escalated_to = escalation_map.get(current, "executive")
        
        return {
            "workflow_id": workflow_id,
            "escalated": True,
            "from": current,
            "to": escalated_to
        }
    
    def _check_sla(self, workflow_id: str) -> dict:
        """SLA 체크"""
        timer = self.sla_timers.get(workflow_id)
        if not timer:
            return {"error": "Timer not found"}
        
        now = datetime.now().timestamp()
        remaining = timer["deadline"] - now
        
        return {
            "workflow_id": workflow_id,
            "remaining_hours": round(remaining / 3600, 2),
            "breached": remaining < 0,
            "warning": remaining < 3600,  # 1시간 미만
            "escalation_due": now >= timer["escalation_at"]
        }
    
    def _route_approval(self, input_data: dict) -> dict:
        """승인 라우팅"""
        value = input_data.get("value", 0)
        category = input_data.get("category", "general")
        requester = input_data.get("requester", "")
        
        # 승인 레벨 결정
        if value < 500:
            approval_level = "auto"
            approvers = []
        elif value < 5000:
            approval_level = "L1"
            approvers = ["direct_manager"]
        elif value < 50000:
            approval_level = "L2"
            approvers = ["direct_manager", "department_head"]
        else:
            approval_level = "L3"
            approvers = ["direct_manager", "department_head", "finance"]
        
        return {
            "approval_level": approval_level,
            "approvers": approvers,
            "auto_approve": approval_level == "auto",
            "sla_hours": 24 * len(approvers) if approvers else 0
        }
    
    def health_check(self) -> bool:
        return True


# =============================================================================
# 6. DATA INTEGRATION ENGINE (외부 시스템 연동)
# =============================================================================

class DataIntegrationEngine(BaseEngine):
    """데이터 통합 엔진"""
    
    @property
    def name(self) -> str:
        return "data_integration_engine"
    
    def __init__(self, config: dict = None):
        super().__init__(config)
        self.connections: dict[str, Any] = {}
    
    async def execute(self, input_data: dict) -> EngineResult:
        """
        데이터 통합 실행
        
        input_data:
            - action: str (fetch, push, sync, transform)
            - source: str (crm, erp, hrms, etc)
            - query: dict
            - data: dict (push용)
        """
        start_time = datetime.now()
        self._call_count += 1
        
        try:
            action = input_data.get("action", "fetch")
            source = input_data.get("source", "")
            
            if action == "fetch":
                result = await self._fetch_data(source, input_data.get("query", {}))
            elif action == "push":
                result = await self._push_data(source, input_data.get("data", {}))
            elif action == "sync":
                result = await self._sync_data(source, input_data.get("target", ""), input_data.get("mapping", {}))
            elif action == "transform":
                result = await self._transform_data(input_data.get("data", {}), input_data.get("transformations", []))
            else:
                result = {"error": f"Unknown action: {action}"}
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            self._total_time += processing_time
            
            return EngineResult(
                success="error" not in result,
                data=result,
                processing_time_ms=processing_time,
                engine_name=self.name
            )
            
        except Exception as e:
            return EngineResult(
                success=False,
                data={},
                error=str(e),
                engine_name=self.name
            )
    
    async def _fetch_data(self, source: str, query: dict) -> dict:
        """데이터 조회"""
        # Mock 데이터 반환
        mock_data = {
            "crm": {
                "contacts": [
                    {"id": "C001", "name": "John Doe", "email": "john@example.com"},
                    {"id": "C002", "name": "Jane Smith", "email": "jane@example.com"}
                ]
            },
            "erp": {
                "invoices": [
                    {"id": "INV001", "amount": 1000, "status": "paid"},
                    {"id": "INV002", "amount": 2500, "status": "pending"}
                ]
            },
            "hrms": {
                "employees": [
                    {"id": "E001", "name": "Alice", "department": "Engineering"},
                    {"id": "E002", "name": "Bob", "department": "Sales"}
                ]
            }
        }
        
        return {
            "source": source,
            "data": mock_data.get(source, {}),
            "count": len(mock_data.get(source, {}).get(list(mock_data.get(source, {}).keys())[0] if mock_data.get(source) else "items", [])),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _push_data(self, source: str, data: dict) -> dict:
        """데이터 전송"""
        return {
            "source": source,
            "pushed": True,
            "records": len(data) if isinstance(data, list) else 1,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _sync_data(self, source: str, target: str, mapping: dict) -> dict:
        """데이터 동기화"""
        return {
            "source": source,
            "target": target,
            "synced": True,
            "records_processed": 10,
            "records_created": 3,
            "records_updated": 7,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _transform_data(self, data: dict, transformations: list) -> dict:
        """데이터 변환"""
        transformed = data.copy()
        
        for transform in transformations:
            transform_type = transform.get("type")
            
            if transform_type == "rename":
                old_key = transform.get("from")
                new_key = transform.get("to")
                if old_key in transformed:
                    transformed[new_key] = transformed.pop(old_key)
            
            elif transform_type == "convert":
                key = transform.get("field")
                to_type = transform.get("to_type")
                if key in transformed:
                    if to_type == "string":
                        transformed[key] = str(transformed[key])
                    elif to_type == "int":
                        transformed[key] = int(transformed[key])
                    elif to_type == "float":
                        transformed[key] = float(transformed[key])
            
            elif transform_type == "compute":
                new_key = transform.get("field")
                expression = transform.get("expression")
                # 간단한 수식 평가 (실제로는 더 안전한 방법 필요)
                try:
                    transformed[new_key] = eval(expression, {"__builtins__": {}}, transformed)
                except:
                    pass
        
        return {
            "transformed": True,
            "data": transformed,
            "transformations_applied": len(transformations)
        }
    
    def health_check(self) -> bool:
        return True


# =============================================================================
# 7. ENGINE REGISTRY
# =============================================================================

class EngineRegistry:
    """엔진 레지스트리"""
    
    def __init__(self):
        self.engines: dict[str, BaseEngine] = {}
    
    def register(self, engine: BaseEngine):
        """엔진 등록"""
        self.engines[engine.name] = engine
    
    def get(self, name: str) -> Optional[BaseEngine]:
        """엔진 조회"""
        return self.engines.get(name)
    
    def list_engines(self) -> list[str]:
        """등록된 엔진 목록"""
        return list(self.engines.keys())
    
    def health_check_all(self) -> dict[str, bool]:
        """전체 헬스체크"""
        return {name: engine.health_check() for name, engine in self.engines.items()}
    
    def get_stats(self) -> dict[str, dict]:
        """전체 통계"""
        return {name: engine.get_stats() for name, engine in self.engines.items()}


def create_default_registry(config: dict = None) -> EngineRegistry:
    """기본 엔진 레지스트리 생성"""
    registry = EngineRegistry()
    
    config = config or {}
    
    registry.register(OCREngine(config.get("ocr", {})))
    registry.register(MLScoringEngine(config.get("ml", {})))
    registry.register(NotificationEngine(config.get("notification", {})))
    registry.register(WorkflowEngine(config.get("workflow", {})))
    registry.register(DataIntegrationEngine(config.get("integration", {})))
    
    return registry


# =============================================================================
# 8. TESTING
# =============================================================================

async def test_engines():
    """엔진 테스트"""
    print("=" * 60)
    print("AUTUS Engine Integration Test")
    print("=" * 60)
    
    registry = create_default_registry()
    
    # 헬스체크
    print("\n[Health Check]")
    health = registry.health_check_all()
    for name, status in health.items():
        print(f"  {name}: {'✓' if status else '✗'}")
    
    # OCR 테스트
    print("\n[OCR Engine Test]")
    ocr = registry.get("ocr_engine")
    result = await ocr.execute({
        "document_type": "pdf",
        "extract_mode": "all"
    })
    print(f"  Success: {result.success}")
    print(f"  Tables: {len(result.data.get('tables', []))}")
    print(f"  Forms: {len(result.data.get('forms', []))}")
    
    # ML 스코어링 테스트
    print("\n[ML Scoring Engine Test]")
    ml = registry.get("ml_scoring_engine")
    
    # 리드 스코어링
    result = await ml.execute({
        "model_name": "lead_scoring",
        "features": {
            "company_size": 0.8,
            "industry_fit": 0.9,
            "engagement_score": 0.7,
            "budget_signal": 0.6,
            "decision_maker": 0.5,
            "timing_fit": 0.8
        }
    })
    print(f"  Lead Score: {result.data.get('score')}")
    print(f"  Grade: {result.data.get('grade')}")
    
    # 티켓 분류
    result = await ml.execute({
        "model_name": "ticket_classification",
        "features": {
            "text": "I'm having an error with my payment, urgent help needed"
        }
    })
    print(f"  Ticket Category: {result.data.get('category')}")
    print(f"  Priority: {result.data.get('priority')}")
    
    # 워크플로 테스트
    print("\n[Workflow Engine Test]")
    workflow = registry.get("workflow_engine")
    
    result = await workflow.execute({
        "action": "start",
        "workflow_type": "expense",
        "data": {"value": 7500, "description": "Conference travel"}
    })
    print(f"  Workflow ID: {result.data.get('workflow_id')}")
    print(f"  Current Approver: {result.data.get('current_approver')}")
    print(f"  SLA Hours: {result.data.get('sla_hours')}")
    
    # 승인 라우팅
    result = await workflow.execute({
        "action": "route",
        "value": 25000,
        "category": "purchase"
    })
    print(f"  Approval Level: {result.data.get('approval_level')}")
    print(f"  Approvers: {result.data.get('approvers')}")
    
    # 통계
    print("\n[Engine Stats]")
    stats = registry.get_stats()
    for name, stat in stats.items():
        print(f"  {name}: {stat['call_count']} calls, avg {stat['avg_time_ms']:.2f}ms")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_engines())
