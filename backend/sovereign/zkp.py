"""
═══════════════════════════════════════════════════════════════════════════════
🔐 AUTUS Zero-Knowledge Proof Engine (영지식 증명 엔진)
═══════════════════════════════════════════════════════════════════════════════

원천 데이터 노출 없이 노하우를 공유하는 영지식 공명 엔진

핵심 원리:
- 베테랑의 노하우 → 암호화된 커밋먼트 생성
- 검증자는 원본을 보지 않고도 "유효성"만 검증
- 공명(Resonance)은 일어나지만 원본은 절대 노출되지 않음

"가두지 않으면서도 훔쳐갈 수 없게"
═══════════════════════════════════════════════════════════════════════════════
"""

import hashlib
import secrets
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from enum import Enum
import hmac


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 및 설정
# ═══════════════════════════════════════════════════════════════════════════════

# Pedersen Commitment 파라미터 (시뮬레이션용)
PRIME_P = 2**256 - 189  # 큰 소수
GENERATOR_G = 7
GENERATOR_H = 11


class ProofType(Enum):
    """증명 유형"""
    KNOWLEDGE = "knowledge"      # 노하우 보유 증명
    CONTRIBUTION = "contribution"  # 기여 증명
    RESONANCE = "resonance"      # 공명 증명
    OWNERSHIP = "ownership"      # 소유권 증명


# ═══════════════════════════════════════════════════════════════════════════════
# 핵심 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Commitment:
    """암호화 커밋먼트"""
    value: int                    # 커밋먼트 값
    blinding_factor: bytes        # 블라인딩 팩터 (비밀)
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_public(self) -> Dict:
        """공개 가능한 형태로 변환"""
        return {
            "commitment": hex(self.value),
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class ZKProof:
    """영지식 증명"""
    proof_type: ProofType
    commitment: int               # 공개 커밋먼트
    challenge: int                # 챌린지 값
    response: int                 # 응답 값
    public_inputs: Dict           # 공개 입력값
    metadata: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "type": self.proof_type.value,
            "commitment": hex(self.commitment),
            "challenge": hex(self.challenge),
            "response": hex(self.response),
            "public_inputs": self.public_inputs,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class ResonanceProof:
    """공명 증명 - 두 노하우가 융합될 때의 증명"""
    source_commitment: int        # 원본 커밋먼트
    target_commitment: int        # 대상 커밋먼트
    resonance_value: float        # 공명 강도 (0~1)
    combined_hash: str            # 결합 해시
    proof: ZKProof                # 영지식 증명
    
    def to_dict(self) -> Dict:
        return {
            "source": hex(self.source_commitment),
            "target": hex(self.target_commitment),
            "resonance": self.resonance_value,
            "combined_hash": self.combined_hash,
            "proof": self.proof.to_dict(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Pedersen Commitment (페더슨 커밋먼트)
# ═══════════════════════════════════════════════════════════════════════════════

class PedersenCommitment:
    """
    페더슨 커밋먼트 스킴
    
    C = g^m * h^r (mod p)
    
    - m: 메시지 (노하우의 해시값)
    - r: 랜덤 블라인딩 팩터
    - 정보 이론적으로 숨김 (Hiding)
    - 계산적으로 바인딩 (Binding)
    """
    
    def __init__(self, p: int = PRIME_P, g: int = GENERATOR_G, h: int = GENERATOR_H):
        self.p = p
        self.g = g
        self.h = h
    
    def commit(self, message: bytes) -> Commitment:
        """메시지에 대한 커밋먼트 생성"""
        # 메시지를 숫자로 변환
        m = int.from_bytes(hashlib.sha256(message).digest(), 'big') % self.p
        
        # 랜덤 블라인딩 팩터
        r = secrets.randbelow(self.p)
        r_bytes = r.to_bytes(32, 'big')
        
        # 커밋먼트: C = g^m * h^r (mod p)
        commitment_value = (pow(self.g, m, self.p) * pow(self.h, r, self.p)) % self.p
        
        return Commitment(
            value=commitment_value,
            blinding_factor=r_bytes,
        )
    
    def verify(self, commitment: int, message: bytes, blinding_factor: bytes) -> bool:
        """커밋먼트 검증"""
        m = int.from_bytes(hashlib.sha256(message).digest(), 'big') % self.p
        r = int.from_bytes(blinding_factor, 'big')
        
        expected = (pow(self.g, m, self.p) * pow(self.h, r, self.p)) % self.p
        
        return commitment == expected


# ═══════════════════════════════════════════════════════════════════════════════
# Schnorr 영지식 증명
# ═══════════════════════════════════════════════════════════════════════════════

class SchnorrProof:
    """
    슈노르 영지식 증명
    
    "나는 비밀 x를 알고 있다" (y = g^x를 공개하고)
    비밀 x를 노출하지 않고 증명
    """
    
    def __init__(self, p: int = PRIME_P, g: int = GENERATOR_G):
        self.p = p
        self.g = g
    
    def prove(self, secret: int, public_inputs: Dict = None) -> ZKProof:
        """증명 생성"""
        # 1. 랜덤 값 선택
        k = secrets.randbelow(self.p - 1) + 1
        
        # 2. 커밋먼트: R = g^k
        R = pow(self.g, k, self.p)
        
        # 3. 공개 키: Y = g^x
        Y = pow(self.g, secret, self.p)
        
        # 4. 챌린지 생성 (Fiat-Shamir 휴리스틱)
        challenge_input = f"{R}:{Y}:{json.dumps(public_inputs or {})}"
        c = int.from_bytes(
            hashlib.sha256(challenge_input.encode()).digest(),
            'big'
        ) % (self.p - 1)
        
        # 5. 응답: s = k + c*x (mod p-1)
        s = (k + c * secret) % (self.p - 1)
        
        return ZKProof(
            proof_type=ProofType.KNOWLEDGE,
            commitment=R,
            challenge=c,
            response=s,
            public_inputs={"public_key": hex(Y), **(public_inputs or {})},
        )
    
    def verify(self, proof: ZKProof) -> bool:
        """증명 검증"""
        R = proof.commitment
        c = proof.challenge
        s = proof.response
        Y = int(proof.public_inputs["public_key"], 16)
        
        # g^s == R * Y^c (mod p)
        left = pow(self.g, s, self.p)
        right = (R * pow(Y, c, self.p)) % self.p
        
        return left == right


# ═══════════════════════════════════════════════════════════════════════════════
# 영지식 공명 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class ZKResonanceEngine:
    """
    영지식 공명 엔진
    
    원천 데이터를 노출하지 않으면서 노하우 간의 "공명"을 계산하고 증명
    
    핵심 기능:
    1. 노하우 등록 (커밋먼트 생성)
    2. 공명 계산 (원본 노출 없이)
    3. 기여도 증명
    4. 융합 결과만 공개
    """
    
    def __init__(self):
        self.pedersen = PedersenCommitment()
        self.schnorr = SchnorrProof()
        
        # 저장소 (실제로는 분산 저장)
        self._commitments: Dict[str, Commitment] = {}
        self._proofs: List[ZKProof] = []
        self._resonances: List[ResonanceProof] = []
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노하우 등록
    # ─────────────────────────────────────────────────────────────────────────
    
    def register_knowledge(
        self,
        owner_id: str,
        knowledge_data: bytes,
        node_id: str,
        metadata: Dict = None,
    ) -> Tuple[str, Dict]:
        """
        노하우 등록
        
        - 원본 데이터는 저장하지 않음
        - 커밋먼트만 저장하여 나중에 증명 가능
        """
        # 커밋먼트 생성
        commitment = self.pedersen.commit(knowledge_data)
        
        # 등록 ID 생성
        registration_id = hashlib.sha256(
            f"{owner_id}:{node_id}:{commitment.value}".encode()
        ).hexdigest()[:16]
        
        # 커밋먼트 저장 (원본은 저장하지 않음!)
        self._commitments[registration_id] = commitment
        
        # 공개 정보만 반환
        return registration_id, {
            "registration_id": registration_id,
            "commitment": commitment.to_public(),
            "owner_id": owner_id,
            "node_id": node_id,
            "metadata": metadata or {},
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 영지식 공명 계산
    # ─────────────────────────────────────────────────────────────────────────
    
    def compute_resonance(
        self,
        source_id: str,
        target_id: str,
        source_data: bytes,  # 소유자만 알고 있음
        target_data: bytes,  # 소유자만 알고 있음
    ) -> ResonanceProof:
        """
        두 노하우 간의 공명 계산
        
        - 원본 데이터는 계산 후 즉시 폐기
        - 공명 값과 증명만 남김
        """
        source_commitment = self._commitments.get(source_id)
        target_commitment = self._commitments.get(target_id)
        
        if not source_commitment or not target_commitment:
            raise ValueError("Invalid registration ID")
        
        # 1. 공명 값 계산 (벡터 유사도)
        source_vec = self._to_vector(source_data)
        target_vec = self._to_vector(target_data)
        resonance_value = self._cosine_similarity(source_vec, target_vec)
        
        # 2. 결합 해시 생성 (원본은 복원 불가)
        combined_hash = hashlib.sha256(
            source_data + target_data + secrets.token_bytes(32)
        ).hexdigest()
        
        # 3. 영지식 증명 생성
        proof_secret = int.from_bytes(
            hashlib.sha256(source_data + target_data).digest(),
            'big'
        ) % (PRIME_P - 1)
        
        zk_proof = self.schnorr.prove(
            secret=proof_secret,
            public_inputs={
                "resonance": resonance_value,
                "combined_hash": combined_hash,
            }
        )
        zk_proof.proof_type = ProofType.RESONANCE
        
        # 4. 원본 데이터 참조 제거 (Python GC에 맡김)
        del source_data, target_data
        
        # 5. 공명 증명 생성
        resonance_proof = ResonanceProof(
            source_commitment=source_commitment.value,
            target_commitment=target_commitment.value,
            resonance_value=resonance_value,
            combined_hash=combined_hash,
            proof=zk_proof,
        )
        
        self._resonances.append(resonance_proof)
        
        return resonance_proof
    
    # ─────────────────────────────────────────────────────────────────────────
    # 기여 증명
    # ─────────────────────────────────────────────────────────────────────────
    
    def prove_contribution(
        self,
        owner_id: str,
        registration_id: str,
        original_data: bytes,
    ) -> ZKProof:
        """
        기여 증명 생성
        
        "나는 이 노하우의 원본 소유자이다"를 증명
        (원본을 공개하지 않고)
        """
        commitment = self._commitments.get(registration_id)
        if not commitment:
            raise ValueError("Invalid registration ID")
        
        # 커밋먼트 일치 확인 (로컬에서만)
        if not self.pedersen.verify(
            commitment.value,
            original_data,
            commitment.blinding_factor
        ):
            raise ValueError("Data does not match commitment")
        
        # 증명 생성
        secret = int.from_bytes(
            hashlib.sha256(original_data).digest(),
            'big'
        ) % (PRIME_P - 1)
        
        proof = self.schnorr.prove(
            secret=secret,
            public_inputs={
                "owner_id": owner_id,
                "registration_id": registration_id,
                "commitment": hex(commitment.value),
            }
        )
        proof.proof_type = ProofType.CONTRIBUTION
        
        self._proofs.append(proof)
        
        return proof
    
    # ─────────────────────────────────────────────────────────────────────────
    # 검증
    # ─────────────────────────────────────────────────────────────────────────
    
    def verify_proof(self, proof: ZKProof) -> bool:
        """증명 검증"""
        return self.schnorr.verify(proof)
    
    def verify_resonance(self, resonance_proof: ResonanceProof) -> bool:
        """공명 증명 검증"""
        # 1. 커밋먼트 존재 확인
        source_exists = any(
            c.value == resonance_proof.source_commitment
            for c in self._commitments.values()
        )
        target_exists = any(
            c.value == resonance_proof.target_commitment
            for c in self._commitments.values()
        )
        
        if not (source_exists and target_exists):
            return False
        
        # 2. 영지식 증명 검증
        return self.verify_proof(resonance_proof.proof)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 유틸리티
    # ─────────────────────────────────────────────────────────────────────────
    
    def _to_vector(self, data: bytes, dim: int = 36) -> List[float]:
        """데이터를 36차원 벡터로 변환"""
        hash_bytes = hashlib.sha512(data).digest()
        
        vector = []
        for i in range(dim):
            start = (i * len(hash_bytes)) // dim
            end = ((i + 1) * len(hash_bytes)) // dim
            chunk = hash_bytes[start:end]
            value = int.from_bytes(chunk, 'big') / (2 ** (len(chunk) * 8))
            vector.append(value)
        
        return vector
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """코사인 유사도 계산"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a ** 2 for a in vec1) ** 0.5
        norm2 = sum(b ** 2 for b in vec2) ** 0.5
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 통계
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_stats(self) -> Dict:
        """통계 정보"""
        return {
            "total_registrations": len(self._commitments),
            "total_proofs": len(self._proofs),
            "total_resonances": len(self._resonances),
            "avg_resonance": (
                sum(r.resonance_value for r in self._resonances) / len(self._resonances)
                if self._resonances else 0
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 및 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_zkp_engine: Optional[ZKResonanceEngine] = None


def get_zkp_engine() -> ZKResonanceEngine:
    """ZKP 엔진 싱글턴"""
    global _zkp_engine
    if _zkp_engine is None:
        _zkp_engine = ZKResonanceEngine()
    return _zkp_engine


def register_knowledge(owner_id: str, data: bytes, node_id: str) -> Dict:
    """노하우 등록 (편의 함수)"""
    engine = get_zkp_engine()
    reg_id, info = engine.register_knowledge(owner_id, data, node_id)
    return {"registration_id": reg_id, **info}


def compute_resonance(source_id: str, target_id: str, source_data: bytes, target_data: bytes) -> Dict:
    """공명 계산 (편의 함수)"""
    engine = get_zkp_engine()
    proof = engine.compute_resonance(source_id, target_id, source_data, target_data)
    return proof.to_dict()


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "ZKResonanceEngine",
    "PedersenCommitment",
    "SchnorrProof",
    "Commitment",
    "ZKProof",
    "ResonanceProof",
    "ProofType",
    # Functions
    "get_zkp_engine",
    "register_knowledge",
    "compute_resonance",
]
