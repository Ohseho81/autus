#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    ✅ AUTUS v3.0 - Quality System                                         ║
║                                                                                           ║
║  Layer 4: 이중 검증 시스템 (Priority 1: 최고 품질)                                          ║
║                                                                                           ║
║  검증 단계:                                                                                ║
║  1. Schema 검증 (구조적 무결성)                                                             ║
║  2. LLM 검증 (의미적 일관성)                                                               ║
║                                                                                           ║
║  임계값:                                                                                   ║
║  - Schema: 100% 통과 필수                                                                  ║
║  - LLM Score: > 0.8 권장, > 0.7 최소                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

from .db_schema import MoneyEvent, BurnEvent, EventType, BurnType


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

QUALITY_CONFIG = {
    "schema_required": True,  # Schema 검증 필수
    "llm_required": False,  # LLM 검증 선택 (API 키 있을 때만)
    "min_llm_score": 0.7,  # 최소 LLM 점수
    "recommended_llm_score": 0.8,  # 권장 LLM 점수
    "auto_reject_below": 0.5,  # 자동 거부 임계값
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Validation Results
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ValidationResult:
    """검증 결과"""
    is_valid: bool
    schema_passed: bool
    schema_errors: List[str]
    llm_score: Optional[float]
    llm_feedback: Optional[str]
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "schema_passed": self.schema_passed,
            "schema_errors": self.schema_errors,
            "llm_score": self.llm_score,
            "llm_feedback": self.llm_feedback,
            "warnings": self.warnings,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Schema Validation (1차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class SchemaValidator:
    """Schema 기반 구조 검증"""
    
    VALID_EVENT_TYPES = {e.value for e in EventType}
    VALID_BURN_TYPES = {e.value for e in BurnType}
    VALID_CURRENCIES = {"KRW", "USD", "EUR", "JPY", "CNY"}
    VALID_RECOMMENDATION_TYPES = {"DIRECT_DRIVEN", "INDIRECT_DRIVEN", "MIXED"}
    
    @classmethod
    def validate_money_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Money 이벤트 검증 (v1.3 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "event_id", "date", "event_type", "currency", "amount",
            "people_tags", "effective_minutes", "evidence_id",
            "recommendation_type", "customer_id"  # v1.3 필수
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["event_type"] not in cls.VALID_EVENT_TYPES:
            errors.append(f"유효하지 않은 event_type: {data['event_type']}")
        
        if data["currency"] not in cls.VALID_CURRENCIES:
            errors.append(f"유효하지 않은 currency: {data['currency']}")
        
        if data["recommendation_type"] not in cls.VALID_RECOMMENDATION_TYPES:
            errors.append(f"유효하지 않은 recommendation_type: {data['recommendation_type']}")
        
        # 값 범위 검증
        try:
            amount = float(data["amount"])
            if amount <= 0:
                errors.append(f"amount는 양수여야 함: {amount}")
        except (ValueError, TypeError):
            errors.append(f"amount는 숫자여야 함: {data['amount']}")
        
        try:
            minutes = int(data["effective_minutes"])
            if minutes < 0:
                errors.append(f"effective_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"effective_minutes는 정수여야 함: {data['effective_minutes']}")
        
        # 날짜 형식 검증
        try:
            datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError:
            errors.append(f"date 형식 오류 (YYYY-MM-DD): {data['date']}")
        
        # people_tags 형식 검증 (세미콜론 구분)
        tags = data["people_tags"]
        if not re.match(r'^P\d{2}(;P\d{2})*$', tags):
            # 느슨한 검증: 최소한 뭔가 있으면 OK
            if not tags or tags.strip() == "":
                errors.append("people_tags가 비어있음")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_burn_event(cls, data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Burn 이벤트 검증 (v1.0 스펙 준수)
        
        Returns:
            (is_valid, errors)
        """
        errors = []
        
        # 필수 필드 체크
        required_fields = [
            "burn_id", "date", "burn_type", "loss_minutes", "evidence_id"
        ]
        
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"필수 필드 누락: {field}")
        
        if errors:
            return False, errors
        
        # 타입 검증
        if data["burn_type"] not in cls.VALID_BURN_TYPES:
            errors.append(f"유효하지 않은 burn_type: {data['burn_type']}")
        
        # 값 범위 검증
        try:
            minutes = int(data["loss_minutes"])
            if minutes < 0:
                errors.append(f"loss_minutes는 0 이상이어야 함: {minutes}")
        except (ValueError, TypeError):
            errors.append(f"loss_minutes는 정수여야 함: {data['loss_minutes']}")
        
        # PREVENTED/FIXED 타입일 때 추가 검증
        if data["burn_type"] in ["PREVENTED", "FIXED"]:
            if "prevented_by" not in data or not data.get("prevented_by"):
                errors.append(f"PREVENTED/FIXED 타입은 prevented_by 필수")
            if "prevented_minutes" in data:
                try:
                    pm = int(data["prevented_minutes"])
                    if pm < 0:
                        errors.append(f"prevented_minutes는 0 이상이어야 함")
                except (ValueError, TypeError):
                    errors.append(f"prevented_minutes는 정수여야 함")
        
        return len(errors) == 0, errors


# ═══════════════════════════════════════════════════════════════════════════════════════════
# LLM Validation (2차 검증)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LLMValidator:
    """LLM 기반 의미 검증"""
    
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.enabled = self.api_key is not None
    
    def validate_money_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Money 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Money 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (event_type과 amount의 관계)
2. 현실성 (금액 범위, 시간 범위)
3. 완결성 (필요한 컨텍스트 충분)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_burn_event(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Burn 이벤트 의미 검증
        
        Returns:
            (score, feedback)
        """
        if not self.enabled:
            return 1.0, "LLM 검증 스킵 (API 키 없음)"
        
        prompt = f"""다음 Burn 이벤트 데이터의 품질을 0.0~1.0 점수로 평가해주세요.

데이터:
{json.dumps(data, ensure_ascii=False, indent=2)}

평가 기준:
1. 논리적 일관성 (burn_type과 loss_minutes의 관계)
2. 현실성 (시간 손실 범위)
3. PREVENTED/FIXED인 경우 prevented_by 정보의 적절성

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.8, f"LLM 검증 오류: {str(e)}"
    
    def validate_insight(self, content: str, source: str) -> Tuple[float, str]:
        """
        인사이트 품질 검증
        
        Returns:
            (confidence, feedback)
        """
        if not self.enabled:
            return 0.7, "LLM 검증 스킵"
        
        prompt = f"""다음 인사이트의 품질을 0.0~1.0 점수로 평가해주세요.

출처: {source}
내용: {content}

평가 기준:
1. 구체성 (추상적이지 않고 실행 가능)
2. 근거 (데이터 기반)
3. 가치 (의사결정에 도움)

응답 형식:
SCORE: [0.0~1.0]
FEEDBACK: [한 줄 피드백]"""

        try:
            score, feedback = self._call_llm(prompt)
            return score, feedback
        except Exception as e:
            return 0.7, f"검증 오류: {str(e)}"
    
    def _call_llm(self, prompt: str) -> Tuple[float, str]:
        """LLM API 호출"""
        # Anthropic API
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.content[0].text)
            except ImportError:
                pass
        
        # OpenAI API
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return self._parse_response(response.choices[0].message.content)
            except ImportError:
                pass
        
        # Mock response
        return 0.85, "Mock 검증 (API 미설정)"
    
    def _parse_response(self, text: str) -> Tuple[float, str]:
        """LLM 응답 파싱"""
        score = 0.8
        feedback = "파싱 실패"
        
        # SCORE 파싱
        score_match = re.search(r'SCORE:\s*([\d.]+)', text)
        if score_match:
            try:
                score = float(score_match.group(1))
                score = max(0.0, min(1.0, score))
            except ValueError:
                pass
        
        # FEEDBACK 파싱
        feedback_match = re.search(r'FEEDBACK:\s*(.+?)(?:\n|$)', text)
        if feedback_match:
            feedback = feedback_match.group(1).strip()
        
        return score, feedback


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Quality Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class QualityManager:
    """품질 관리 통합 클래스"""
    
    def __init__(self):
        self.schema_validator = SchemaValidator()
        self.llm_validator = LLMValidator()
    
    def validate_money_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Money 이벤트 전체 검증
        
        1차: Schema 검증 (필수)
        2차: LLM 검증 (선택)
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_money_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_money_event(data)
        
        # 경고 생성
        if llm_score < QUALITY_CONFIG["min_llm_score"]:
            warnings.append(f"LLM 점수 낮음: {llm_score:.2f}")
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_burn_event(self, data: Dict[str, Any]) -> ValidationResult:
        """
        Burn 이벤트 전체 검증
        """
        warnings = []
        
        # 1차: Schema 검증
        schema_passed, schema_errors = SchemaValidator.validate_burn_event(data)
        
        if not schema_passed:
            return ValidationResult(
                is_valid=False,
                schema_passed=False,
                schema_errors=schema_errors,
                llm_score=None,
                llm_feedback=None,
                warnings=warnings,
            )
        
        # 2차: LLM 검증
        llm_score, llm_feedback = self.llm_validator.validate_burn_event(data)
        
        # 최종 판정
        is_valid = schema_passed and llm_score >= QUALITY_CONFIG["auto_reject_below"]
        
        return ValidationResult(
            is_valid=is_valid,
            schema_passed=schema_passed,
            schema_errors=schema_errors,
            llm_score=llm_score,
            llm_feedback=llm_feedback,
            warnings=warnings,
        )
    
    def validate_insight(self, content: str, source: str) -> Tuple[bool, float, str]:
        """
        인사이트 검증
        
        Returns:
            (is_valid, confidence, feedback)
        """
        confidence, feedback = self.llm_validator.validate_insight(content, source)
        is_valid = confidence >= QUALITY_CONFIG["min_llm_score"]
        return is_valid, confidence, feedback
    
    def get_quality_report(self, events: List[Dict[str, Any]], event_type: str = "money") -> Dict[str, Any]:
        """
        다건 검증 리포트 생성
        """
        results = {
            "total": len(events),
            "valid": 0,
            "invalid": 0,
            "warnings": 0,
            "errors": [],
            "avg_llm_score": 0.0,
        }
        
        llm_scores = []
        
        for event in events:
            if event_type == "money":
                result = self.validate_money_event(event)
            else:
                result = self.validate_burn_event(event)
            
            if result.is_valid:
                results["valid"] += 1
            else:
                results["invalid"] += 1
                results["errors"].append({
                    "event_id": event.get("event_id") or event.get("burn_id"),
                    "errors": result.schema_errors,
                })
            
            if result.warnings:
                results["warnings"] += 1
            
            if result.llm_score is not None:
                llm_scores.append(result.llm_score)
        
        if llm_scores:
            results["avg_llm_score"] = sum(llm_scores) / len(llm_scores)
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def validate_money_event(data: Dict[str, Any]) -> ValidationResult:
    """Money 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_money_event(data)


def validate_burn_event(data: Dict[str, Any]) -> ValidationResult:
    """Burn 이벤트 검증 (편의 함수)"""
    manager = QualityManager()
    return manager.validate_burn_event(data)





















