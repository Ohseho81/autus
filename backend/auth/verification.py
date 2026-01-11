"""
═══════════════════════════════════════════════════════════════════════════════
🎖️ AUTUS Verifiable Credentials (VC 기반 전문가 인증)
═══════════════════════════════════════════════════════════════════════════════

30~50년 베테랑의 진위 여부를 판별하는 자격 증명 시스템

핵심 원리:
- DID (Decentralized Identifier) 기반 신원 확인
- 경력/자격증의 암호화된 검증
- 스킬 레벨의 물리적 증명 (작업 패턴 분석)

"진짜 베테랑만이 아우투스에 기여할 수 있다"
═══════════════════════════════════════════════════════════════════════════════
"""

import hashlib
import json
import secrets
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import hmac
import base64


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 및 설정
# ═══════════════════════════════════════════════════════════════════════════════

class ExpertiseLevel(Enum):
    """전문성 레벨"""
    NOVICE = 1          # 0-2년
    INTERMEDIATE = 2    # 3-7년
    ADVANCED = 3        # 8-15년
    EXPERT = 4          # 16-29년
    MASTER = 5          # 30-50년 (베테랑)
    GRANDMASTER = 6     # 50년 이상 (대가)


class CredentialType(Enum):
    """자격 증명 유형"""
    PROFESSIONAL_LICENSE = "professional_license"   # 전문 자격증
    ACADEMIC_DEGREE = "academic_degree"             # 학위
    WORK_EXPERIENCE = "work_experience"             # 경력
    SKILL_ATTESTATION = "skill_attestation"         # 스킬 증명
    PATTERN_VERIFICATION = "pattern_verification"  # 패턴 검증 (물리적)


class VerificationStatus(Enum):
    """검증 상태"""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"
    REVOKED = "revoked"


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class DID:
    """분산 신원 (Decentralized Identifier)"""
    method: str = "autus"
    identifier: str = ""
    public_key: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    @classmethod
    def generate(cls) -> "DID":
        """새 DID 생성"""
        identifier = secrets.token_hex(16)
        private_key = secrets.token_bytes(32)
        public_key = hashlib.sha256(private_key).hexdigest()
        
        return cls(
            method="autus",
            identifier=identifier,
            public_key=public_key,
        )
    
    @property
    def uri(self) -> str:
        """DID URI"""
        return f"did:{self.method}:{self.identifier}"
    
    def to_dict(self) -> Dict:
        return {
            "uri": self.uri,
            "method": self.method,
            "identifier": self.identifier,
            "public_key": self.public_key,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class VerifiableCredential:
    """검증 가능한 자격 증명"""
    id: str
    type: CredentialType
    issuer_did: str                       # 발급자 DID
    subject_did: str                      # 주체 DID
    claims: Dict[str, Any]                # 주장 (경력년수, 자격증 등)
    issued_at: datetime
    expires_at: Optional[datetime] = None
    proof: Optional[str] = None           # 디지털 서명
    status: VerificationStatus = VerificationStatus.PENDING
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "issuer": self.issuer_did,
            "subject": self.subject_did,
            "claims": self.claims,
            "issued_at": self.issued_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "proof": self.proof,
            "status": self.status.value,
        }
    
    def is_valid(self) -> bool:
        """유효성 확인"""
        if self.status != VerificationStatus.VERIFIED:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True


@dataclass
class ExpertProfile:
    """전문가 프로필"""
    did: DID
    name_hash: str                        # 이름 해시 (Zero Meaning)
    expertise_level: ExpertiseLevel
    total_experience_years: int
    domains: List[str]                    # 전문 분야
    credentials: List[VerifiableCredential] = field(default_factory=list)
    pattern_signature: Optional[str] = None  # 작업 패턴 서명
    contribution_score: float = 0.0
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "did": self.did.to_dict(),
            "name_hash": self.name_hash,
            "expertise_level": self.expertise_level.name,
            "experience_years": self.total_experience_years,
            "domains": self.domains,
            "credentials_count": len(self.credentials),
            "verified_credentials": len([c for c in self.credentials if c.is_valid()]),
            "pattern_verified": self.pattern_signature is not None,
            "contribution_score": self.contribution_score,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 패턴 검증 (물리적 증명)
# ═══════════════════════════════════════════════════════════════════════════════

class PatternVerifier:
    """
    작업 패턴 검증기
    
    베테랑의 '손맛'을 물리적으로 검증
    - 작업 속도 패턴
    - 의사결정 시퀀스
    - 문제 해결 경로
    """
    
    # 경력년수별 기대 패턴 특성
    PATTERN_THRESHOLDS = {
        ExpertiseLevel.NOVICE: {
            "decision_speed": (5.0, 10.0),      # 느림
            "error_rate": (0.2, 0.4),           # 높음
            "efficiency": (0.3, 0.5),
        },
        ExpertiseLevel.INTERMEDIATE: {
            "decision_speed": (3.0, 5.0),
            "error_rate": (0.1, 0.2),
            "efficiency": (0.5, 0.7),
        },
        ExpertiseLevel.ADVANCED: {
            "decision_speed": (1.5, 3.0),
            "error_rate": (0.05, 0.1),
            "efficiency": (0.7, 0.85),
        },
        ExpertiseLevel.EXPERT: {
            "decision_speed": (0.8, 1.5),
            "error_rate": (0.02, 0.05),
            "efficiency": (0.85, 0.95),
        },
        ExpertiseLevel.MASTER: {
            "decision_speed": (0.3, 0.8),       # 직관적
            "error_rate": (0.005, 0.02),        # 매우 낮음
            "efficiency": (0.95, 1.0),          # 거의 최적
        },
        ExpertiseLevel.GRANDMASTER: {
            "decision_speed": (0.1, 0.3),       # 즉각적
            "error_rate": (0.0, 0.005),         # 거의 없음
            "efficiency": (0.98, 1.0),          # 최적화됨
        },
    }
    
    def analyze_pattern(
        self,
        actions: List[Dict],
        claimed_level: ExpertiseLevel,
    ) -> Dict:
        """작업 패턴 분석"""
        if not actions:
            return {"verified": False, "reason": "No actions to analyze"}
        
        # 메트릭 계산
        metrics = self._calculate_metrics(actions)
        
        # 기대 임계값
        thresholds = self.PATTERN_THRESHOLDS.get(claimed_level)
        if not thresholds:
            return {"verified": False, "reason": "Invalid expertise level"}
        
        # 검증
        verifications = {
            "decision_speed": self._in_range(
                metrics["avg_decision_time"],
                thresholds["decision_speed"]
            ),
            "error_rate": self._in_range(
                metrics["error_rate"],
                thresholds["error_rate"]
            ),
            "efficiency": self._in_range(
                metrics["efficiency"],
                thresholds["efficiency"]
            ),
        }
        
        # 2/3 이상 통과해야 검증
        passed = sum(verifications.values())
        verified = passed >= 2
        
        # 패턴 서명 생성
        signature = None
        if verified:
            signature = self._generate_signature(metrics, claimed_level)
        
        return {
            "verified": verified,
            "claimed_level": claimed_level.name,
            "metrics": metrics,
            "verifications": verifications,
            "passed_checks": f"{passed}/3",
            "signature": signature,
        }
    
    def _calculate_metrics(self, actions: List[Dict]) -> Dict:
        """메트릭 계산"""
        total_time = 0
        errors = 0
        optimal_actions = 0
        
        for action in actions:
            total_time += action.get("duration", 1.0)
            if action.get("is_error", False):
                errors += 1
            if action.get("is_optimal", False):
                optimal_actions += 1
        
        n = len(actions)
        
        return {
            "avg_decision_time": total_time / n if n > 0 else 0,
            "error_rate": errors / n if n > 0 else 0,
            "efficiency": optimal_actions / n if n > 0 else 0,
            "total_actions": n,
        }
    
    def _in_range(self, value: float, range_tuple: tuple) -> bool:
        """범위 내 확인"""
        min_val, max_val = range_tuple
        return min_val <= value <= max_val
    
    def _generate_signature(self, metrics: Dict, level: ExpertiseLevel) -> str:
        """패턴 서명 생성"""
        data = json.dumps({
            "metrics": metrics,
            "level": level.value,
            "timestamp": datetime.utcnow().isoformat(),
        }, sort_keys=True)
        
        return hashlib.sha256(data.encode()).hexdigest()


# ═══════════════════════════════════════════════════════════════════════════════
# 자격 증명 발급자
# ═══════════════════════════════════════════════════════════════════════════════

class CredentialIssuer:
    """자격 증명 발급자"""
    
    def __init__(self, issuer_did: DID, secret_key: bytes):
        self.did = issuer_did
        self._secret_key = secret_key
    
    def issue_credential(
        self,
        subject_did: str,
        credential_type: CredentialType,
        claims: Dict,
        validity_days: int = 365,
    ) -> VerifiableCredential:
        """자격 증명 발급"""
        credential_id = secrets.token_hex(8)
        issued_at = datetime.utcnow()
        expires_at = issued_at + timedelta(days=validity_days)
        
        # 서명 생성
        proof_data = json.dumps({
            "id": credential_id,
            "type": credential_type.value,
            "issuer": self.did.uri,
            "subject": subject_did,
            "claims": claims,
            "issued_at": issued_at.isoformat(),
        }, sort_keys=True)
        
        proof = hmac.new(
            self._secret_key,
            proof_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return VerifiableCredential(
            id=credential_id,
            type=credential_type,
            issuer_did=self.did.uri,
            subject_did=subject_did,
            claims=claims,
            issued_at=issued_at,
            expires_at=expires_at,
            proof=proof,
            status=VerificationStatus.VERIFIED,
        )
    
    def verify_credential(self, credential: VerifiableCredential) -> bool:
        """자격 증명 검증"""
        if credential.issuer_did != self.did.uri:
            return False
        
        # 서명 검증
        proof_data = json.dumps({
            "id": credential.id,
            "type": credential.type.value,
            "issuer": credential.issuer_did,
            "subject": credential.subject_did,
            "claims": credential.claims,
            "issued_at": credential.issued_at.isoformat(),
        }, sort_keys=True)
        
        expected_proof = hmac.new(
            self._secret_key,
            proof_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(credential.proof or "", expected_proof)


# ═══════════════════════════════════════════════════════════════════════════════
# 전문가 검증 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class ExpertVerificationEngine:
    """
    전문가 검증 엔진
    
    베테랑의 진위를 다각도로 검증:
    1. 자격 증명 (VC)
    2. 작업 패턴 (물리적 증명)
    3. 기여 이력
    """
    
    def __init__(self):
        self.pattern_verifier = PatternVerifier()
        self._experts: Dict[str, ExpertProfile] = {}
        self._issuers: Dict[str, CredentialIssuer] = {}
        
        # 기본 발급자 생성 (AUTUS 자체)
        self._setup_default_issuer()
    
    def _setup_default_issuer(self):
        """기본 발급자 설정"""
        did = DID.generate()
        did.method = "autus"
        did.identifier = "official-issuer"
        
        secret_key = secrets.token_bytes(32)
        
        self._issuers["autus"] = CredentialIssuer(did, secret_key)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 전문가 등록
    # ─────────────────────────────────────────────────────────────────────────
    
    def register_expert(
        self,
        name: str,
        experience_years: int,
        domains: List[str],
    ) -> ExpertProfile:
        """전문가 등록"""
        # DID 생성
        did = DID.generate()
        
        # 이름 해시 (Zero Meaning)
        name_hash = hashlib.sha256(name.encode()).hexdigest()[:16]
        
        # 경력 레벨 결정
        expertise_level = self._determine_level(experience_years)
        
        profile = ExpertProfile(
            did=did,
            name_hash=name_hash,
            expertise_level=expertise_level,
            total_experience_years=experience_years,
            domains=domains,
        )
        
        self._experts[did.uri] = profile
        
        return profile
    
    def _determine_level(self, years: int) -> ExpertiseLevel:
        """경력년수로 레벨 결정"""
        if years >= 50:
            return ExpertiseLevel.GRANDMASTER
        elif years >= 30:
            return ExpertiseLevel.MASTER
        elif years >= 16:
            return ExpertiseLevel.EXPERT
        elif years >= 8:
            return ExpertiseLevel.ADVANCED
        elif years >= 3:
            return ExpertiseLevel.INTERMEDIATE
        else:
            return ExpertiseLevel.NOVICE
    
    # ─────────────────────────────────────────────────────────────────────────
    # 자격 증명
    # ─────────────────────────────────────────────────────────────────────────
    
    def issue_experience_credential(
        self,
        expert_did: str,
        experience_years: int,
        company: str = "undisclosed",
        role: str = "professional",
    ) -> VerifiableCredential:
        """경력 자격 증명 발급"""
        issuer = self._issuers.get("autus")
        if not issuer:
            raise ValueError("No issuer available")
        
        credential = issuer.issue_credential(
            subject_did=expert_did,
            credential_type=CredentialType.WORK_EXPERIENCE,
            claims={
                "experience_years": experience_years,
                "company_hash": hashlib.sha256(company.encode()).hexdigest()[:8],
                "role": role,
                "verified_by": "autus_verification_engine",
            },
        )
        
        # 프로필에 추가
        if expert_did in self._experts:
            self._experts[expert_did].credentials.append(credential)
        
        return credential
    
    def issue_skill_credential(
        self,
        expert_did: str,
        skill_name: str,
        proficiency: float,  # 0-1
    ) -> VerifiableCredential:
        """스킬 자격 증명 발급"""
        issuer = self._issuers.get("autus")
        if not issuer:
            raise ValueError("No issuer available")
        
        credential = issuer.issue_credential(
            subject_did=expert_did,
            credential_type=CredentialType.SKILL_ATTESTATION,
            claims={
                "skill": skill_name,
                "proficiency": proficiency,
                "assessment_date": datetime.utcnow().isoformat(),
            },
        )
        
        if expert_did in self._experts:
            self._experts[expert_did].credentials.append(credential)
        
        return credential
    
    # ─────────────────────────────────────────────────────────────────────────
    # 패턴 검증
    # ─────────────────────────────────────────────────────────────────────────
    
    def verify_expert_pattern(
        self,
        expert_did: str,
        actions: List[Dict],
    ) -> Dict:
        """전문가 패턴 검증"""
        profile = self._experts.get(expert_did)
        if not profile:
            return {"verified": False, "reason": "Expert not found"}
        
        result = self.pattern_verifier.analyze_pattern(
            actions=actions,
            claimed_level=profile.expertise_level,
        )
        
        # 검증 성공 시 서명 저장
        if result["verified"] and result.get("signature"):
            profile.pattern_signature = result["signature"]
            
            # 패턴 검증 자격 증명 발급
            issuer = self._issuers.get("autus")
            if issuer:
                credential = issuer.issue_credential(
                    subject_did=expert_did,
                    credential_type=CredentialType.PATTERN_VERIFICATION,
                    claims={
                        "level": profile.expertise_level.name,
                        "signature": result["signature"],
                        "metrics": result["metrics"],
                    },
                )
                profile.credentials.append(credential)
        
        return result
    
    # ─────────────────────────────────────────────────────────────────────────
    # 종합 검증
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_verification_summary(self, expert_did: str) -> Dict:
        """종합 검증 요약"""
        profile = self._experts.get(expert_did)
        if not profile:
            return {"error": "Expert not found"}
        
        # 자격 증명 분석
        valid_credentials = [c for c in profile.credentials if c.is_valid()]
        credential_types = [c.type.value for c in valid_credentials]
        
        # 검증 점수 계산
        score = 0.0
        
        # 자격 증명 점수 (최대 40점)
        score += min(len(valid_credentials) * 10, 40)
        
        # 패턴 검증 점수 (30점)
        if profile.pattern_signature:
            score += 30
        
        # 경력 년수 점수 (최대 30점)
        score += min(profile.total_experience_years, 30)
        
        # 레벨 결정
        verification_level = "UNVERIFIED"
        if score >= 80:
            verification_level = "FULLY_VERIFIED"
        elif score >= 50:
            verification_level = "PARTIALLY_VERIFIED"
        elif score >= 20:
            verification_level = "BASIC_VERIFIED"
        
        return {
            "expert_did": expert_did,
            "profile": profile.to_dict(),
            "verification": {
                "score": score,
                "level": verification_level,
                "valid_credentials": len(valid_credentials),
                "credential_types": credential_types,
                "pattern_verified": profile.pattern_signature is not None,
            },
            "is_veteran": (
                profile.expertise_level.value >= ExpertiseLevel.MASTER.value
                and score >= 50
            ),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 조회
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_expert(self, did: str) -> Optional[ExpertProfile]:
        """전문가 조회"""
        return self._experts.get(did)
    
    def get_veterans(self) -> List[ExpertProfile]:
        """베테랑 목록 (30년 이상)"""
        return [
            p for p in self._experts.values()
            if p.expertise_level.value >= ExpertiseLevel.MASTER.value
        ]
    
    def get_stats(self) -> Dict:
        """통계"""
        total = len(self._experts)
        levels = {}
        for p in self._experts.values():
            level = p.expertise_level.name
            levels[level] = levels.get(level, 0) + 1
        
        return {
            "total_experts": total,
            "by_level": levels,
            "veterans": len(self.get_veterans()),
            "total_credentials": sum(
                len(p.credentials) for p in self._experts.values()
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 및 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_verification_engine: Optional[ExpertVerificationEngine] = None


def get_verification_engine() -> ExpertVerificationEngine:
    """검증 엔진 싱글턴"""
    global _verification_engine
    if _verification_engine is None:
        _verification_engine = ExpertVerificationEngine()
    return _verification_engine


def register_expert(name: str, years: int, domains: List[str]) -> Dict:
    """전문가 등록 (편의 함수)"""
    engine = get_verification_engine()
    profile = engine.register_expert(name, years, domains)
    return profile.to_dict()


def verify_veteran(did: str, actions: List[Dict]) -> Dict:
    """베테랑 검증 (편의 함수)"""
    engine = get_verification_engine()
    return engine.verify_expert_pattern(did, actions)


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "ExpertVerificationEngine",
    "CredentialIssuer",
    "PatternVerifier",
    "ExpertProfile",
    "VerifiableCredential",
    "DID",
    # Enums
    "ExpertiseLevel",
    "CredentialType",
    "VerificationStatus",
    # Functions
    "get_verification_engine",
    "register_expert",
    "verify_veteran",
]
