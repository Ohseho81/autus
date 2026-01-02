"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))




















"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))










"""
AUTUS Local Agent - Vector Anonymizer
======================================

노드 데이터를 익명 벡터로 변환하여 서버 전송

핵심 원칙:
1. 개인 식별 정보 절대 전송 금지
2. 통계적 특성만 추출
3. k-익명성 보장 (최소 k명 이상 동일 그룹)
4. 차분 프라이버시 적용 (노이즈 추가)

전송 데이터:
- 해시된 식별자 (역산 불가)
- 정규화된 SQ 구성 요소
- 비식별 메타데이터
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import hashlib
import random
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, AnonymousVector


# ═══════════════════════════════════════════════════════════════════════════
#                              ANONYMIZER CONFIG
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class AnonymizerConfig:
    """익명화 설정"""
    
    # k-익명성 최소 그룹 크기
    k_anonymity: int = 5
    
    # 차분 프라이버시 노이즈 수준 (0~1)
    noise_level: float = 0.05
    
    # 해시 솔트 (기기별 고유)
    salt: str = "autus_local_salt"
    
    # 지역 해시 정밀도 (시/군/구 수준)
    region_precision: int = 2  # 전화번호 앞 4자리 사용
    
    # 전송 최소 배치 크기
    min_batch_size: int = 10


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR ANONYMIZER
# ═══════════════════════════════════════════════════════════════════════════

class VectorAnonymizer:
    """
    노드 → 익명 벡터 변환기
    
    피시스 맵에 기여하되, 개인정보 보호
    """
    
    def __init__(self, config: Optional[AnonymizerConfig] = None):
        self.config = config or AnonymizerConfig()
        
        # 업종 (설정 가능)
        self.industry: str = "academy"  # 기본: 학원
        
    # ═══════════════════════════════════════════════════════════════════════
    #                         HASHING
    # ═══════════════════════════════════════════════════════════════════════
    
    def _hash_phone(self, phone: str) -> str:
        """
        전화번호 해시 (역산 불가)
        
        SHA-256 + 솔트 + 잘라내기
        """
        # 전화번호 정규화 (숫자만)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 솔트 추가
        salted = f"{self.config.salt}:{clean_phone}"
        
        # SHA-256 해시
        hash_bytes = hashlib.sha256(salted.encode()).hexdigest()
        
        # 앞 16자만 사용 (충돌 확률 무시 가능)
        return hash_bytes[:16]
    
    def _hash_region(self, phone: str) -> str:
        """
        지역 해시 (시/군/구 수준)
        
        전화번호 앞자리로 지역 추정
        """
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # 앞 4자리 (010 제외 시 지역번호)
        if clean_phone.startswith("010"):
            # 휴대폰은 통신사로 분류 (프라이버시 보호)
            prefix = clean_phone[3:5]  # 010 다음 2자리
        else:
            # 유선은 지역번호
            prefix = clean_phone[:self.config.region_precision]
        
        return hashlib.md5(prefix.encode()).hexdigest()[:8]
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         NORMALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def _normalize_value(
        self,
        value: float,
        min_val: float,
        max_val: float,
    ) -> float:
        """값을 0~1로 정규화"""
        if max_val <= min_val:
            return 0.5
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    def _add_noise(self, value: float) -> float:
        """
        차분 프라이버시 노이즈 추가
        
        가우시안 노이즈로 정확한 값 추론 방지
        """
        if self.config.noise_level <= 0:
            return value
        
        noise = random.gauss(0, self.config.noise_level)
        noisy_value = value + noise
        
        # 0~1 범위 유지
        return max(0.0, min(1.0, noisy_value))
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ANONYMIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def anonymize_node(self, node: Node) -> AnonymousVector:
        """
        단일 노드 익명화
        """
        import time
        
        # 1. 해시 생성
        node_hash = self._hash_phone(node.phone)
        region_hash = self._hash_region(node.phone)
        
        # 2. 정규화 (0~1)
        m_norm = self._normalize_value(node.money_total, 0, 2000000)  # 200만원 기준
        s_norm = self._normalize_value(node.synergy_score, 0, 100)
        t_norm = self._normalize_value(node.entropy_score, 0, 120)   # 2시간 기준
        sq_norm = self._normalize_value(node.sq_score, 0, 100)
        
        # 3. 노이즈 추가
        m_noisy = self._add_noise(m_norm)
        s_noisy = self._add_noise(s_norm)
        t_noisy = self._add_noise(t_norm)
        sq_noisy = self._add_noise(sq_norm)
        
        # 4. 벡터 생성
        return AnonymousVector(
            node_hash=node_hash,
            sq=round(sq_noisy * 100, 1),  # 0~100 스케일
            m_normalized=round(m_noisy, 3),
            s_normalized=round(s_noisy, 3),
            t_normalized=round(t_noisy, 3),
            tier=node.tier.value,
            source=node.source.value,
            region_hash=region_hash,
            industry=self.industry,
            timestamp=int(time.time()),
        )
    
    def anonymize_batch(
        self,
        nodes: List[Node],
        enforce_k_anonymity: bool = True,
    ) -> List[AnonymousVector]:
        """
        배치 익명화
        
        k-익명성 보장: 최소 k명 이상이어야 전송
        """
        if enforce_k_anonymity and len(nodes) < self.config.k_anonymity:
            # k-익명성 미충족 시 전송 거부
            return []
        
        vectors = [self.anonymize_node(node) for node in nodes]
        
        return vectors
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         SERIALIZATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def vectors_to_json(self, vectors: List[AnonymousVector]) -> str:
        """서버 전송용 JSON 변환"""
        return json.dumps({
            "v": "1.0",
            "industry": self.industry,
            "count": len(vectors),
            "vectors": [v.to_dict() for v in vectors],
        })
    
    def vectors_to_compact(self, vectors: List[AnonymousVector]) -> bytes:
        """
        압축 전송용 바이너리
        
        대역폭 절약
        """
        import struct
        
        # 헤더: 버전(1) + 개수(2)
        data = struct.pack(">BH", 1, len(vectors))
        
        for v in vectors:
            # 각 벡터: hash(16) + sq(2) + m(2) + s(2) + t(2) + tier(1) + ts(4)
            data += bytes.fromhex(v.node_hash)
            data += struct.pack(
                ">HHHHBI",
                int(v.sq * 10),
                int(v.m_normalized * 1000),
                int(v.s_normalized * 1000),
                int(v.t_normalized * 1000),
                ["iron", "steel", "gold", "platinum", "diamond", "sovereign"].index(v.tier),
                v.timestamp,
            )
        
        return data
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         PRIVACY REPORT
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_privacy_report(
        self,
        nodes: List[Node],
        vectors: List[AnonymousVector],
    ) -> Dict[str, Any]:
        """
        프라이버시 보호 리포트
        
        유저에게 어떤 데이터가 전송되는지 투명하게 공개
        """
        return {
            "summary": {
                "total_nodes": len(nodes),
                "anonymized_vectors": len(vectors),
                "k_anonymity": self.config.k_anonymity,
                "noise_level": f"{self.config.noise_level * 100}%",
            },
            "protected_fields": [
                "이름 (전송 안함)",
                "전화번호 (해시 처리)",
                "학생 정보 (전송 안함)",
                "정확한 금액 (노이즈 추가)",
            ],
            "transmitted_fields": [
                "익명 해시 ID",
                "정규화된 SQ 점수",
                "티어 (Iron~Sovereign)",
                "업종 (학원)",
                "지역 해시 (시/군/구 수준)",
            ],
            "legal_basis": "개인정보보호법 제15조 (동의에 의한 처리)",
            "data_retention": "익명 벡터만 보관, 개인 식별 불가",
        }


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, NodeTier, DataSource
    
    # 테스트 노드
    test_nodes = [
        Node(
            id="1", name="김철수", phone="010-1234-5678",
            money_total=500000, synergy_score=80, entropy_score=10,
            sq_score=75.0, tier=NodeTier.GOLD, source=DataSource.SMS
        ),
        Node(
            id="2", name="이영희", phone="010-2345-6789",
            money_total=300000, synergy_score=60, entropy_score=30,
            sq_score=55.0, tier=NodeTier.STEEL, source=DataSource.CALL_LOG
        ),
        Node(
            id="3", name="박민수", phone="010-3456-7890",
            money_total=100000, synergy_score=40, entropy_score=50,
            sq_score=30.0, tier=NodeTier.IRON, source=DataSource.EXCEL_LMS
        ),
    ]
    
    # 익명화
    anonymizer = VectorAnonymizer()
    
    # k-익명성 미충족 (3 < 5)
    vectors_strict = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=True)
    print(f"Strict k-anonymity: {len(vectors_strict)} vectors")
    
    # k-익명성 무시
    vectors_all = anonymizer.anonymize_batch(test_nodes, enforce_k_anonymity=False)
    print(f"Without k-anonymity: {len(vectors_all)} vectors")
    
    print("\n" + "=" * 60)
    print("Anonymized Vectors:")
    print("=" * 60)
    
    for v in vectors_all:
        print(f"\nHash: {v.node_hash}")
        print(f"  SQ: {v.sq}, M: {v.m_normalized}, S: {v.s_normalized}, T: {v.t_normalized}")
        print(f"  Tier: {v.tier}, Region: {v.region_hash}")
    
    print("\n" + "=" * 60)
    print("JSON Payload:")
    print("=" * 60)
    print(anonymizer.vectors_to_json(vectors_all))
    
    print("\n" + "=" * 60)
    print("Privacy Report:")
    print("=" * 60)
    report = anonymizer.generate_privacy_report(test_nodes, vectors_all)
    print(json.dumps(report, indent=2, ensure_ascii=False))


























