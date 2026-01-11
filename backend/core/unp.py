"""
═══════════════════════════════════════════════════════════════════════════════
📐 AUTUS Universal Node Protocol (유니버설 노드 프로토콜)
═══════════════════════════════════════════════════════════════════════════════

36개 노드 간의 상호호환을 위한 데이터 표준 규격
어떤 직업/분야의 데이터도 이 규격으로 '세탁'되어 정렬됨

구조:
- Header: 암호화된 UID, 전문가 VC, 소유권 만료일
- Vector Space: 1:12:144 좌표값
- Physics Property: 마찰 계수, 에너지 보존량
- Interface: 타 노드와의 결합 방식 정의

"모든 노하우는 같은 언어로 통한다"
═══════════════════════════════════════════════════════════════════════════════
"""

import hashlib
import json
import struct
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta
from enum import Enum
import base64


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 및 설정
# ═══════════════════════════════════════════════════════════════════════════════

# 프랙탈 구조 상수
FRACTAL = {
    "CORE": 1,
    "DOMAINS": 12,
    "INDICATORS": 144,
    "NODES": 36,
}

# 6개 물리 차원
PHYSICS_DIMENSIONS = [
    "BIO",        # 생체/건강
    "CAPITAL",    # 자본
    "COGNITION",  # 인지
    "RELATION",   # 관계
    "ENVIRONMENT",# 환경
    "LEGACY",     # 유산
]

# 12개 도메인
DOMAINS_12 = {
    "D01": {"name": "Health", "physics": "BIO", "nodes": ["n01", "n02", "n03"]},
    "D02": {"name": "Fitness", "physics": "BIO", "nodes": ["n04", "n05", "n06"]},
    "D03": {"name": "Income", "physics": "CAPITAL", "nodes": ["n07", "n08", "n09"]},
    "D04": {"name": "Assets", "physics": "CAPITAL", "nodes": ["n10", "n11", "n12"]},
    "D05": {"name": "Learning", "physics": "COGNITION", "nodes": ["n13", "n14", "n15"]},
    "D06": {"name": "Skills", "physics": "COGNITION", "nodes": ["n16", "n17", "n18"]},
    "D07": {"name": "Family", "physics": "RELATION", "nodes": ["n19", "n20", "n21"]},
    "D08": {"name": "Network", "physics": "RELATION", "nodes": ["n22", "n23", "n24"]},
    "D09": {"name": "Home", "physics": "ENVIRONMENT", "nodes": ["n25", "n26", "n27"]},
    "D10": {"name": "Work", "physics": "ENVIRONMENT", "nodes": ["n28", "n29", "n30"]},
    "D11": {"name": "Purpose", "physics": "LEGACY", "nodes": ["n31", "n32", "n33"]},
    "D12": {"name": "Impact", "physics": "LEGACY", "nodes": ["n34", "n35", "n36"]},
}

# UNP 버전
UNP_VERSION = "2.0.0"


class DataType(Enum):
    """데이터 유형"""
    SCALAR = "scalar"       # 단일 값
    VECTOR = "vector"       # 벡터
    MATRIX = "matrix"       # 행렬
    SEQUENCE = "sequence"   # 시퀀스
    GRAPH = "graph"         # 그래프


class InterfaceType(Enum):
    """인터페이스 유형"""
    INPUT = "input"         # 입력만
    OUTPUT = "output"       # 출력만
    BIDIRECTIONAL = "bidirectional"  # 양방향
    BROADCAST = "broadcast" # 브로드캐스트


# ═══════════════════════════════════════════════════════════════════════════════
# UNP 헤더
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UNPHeader:
    """UNP 헤더"""
    version: str = UNP_VERSION
    uid: str = ""                         # 암호화된 고유 ID
    owner_did: str = ""                   # 소유자 DID
    credential_hash: str = ""             # VC 해시
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    checksum: str = ""
    
    def calculate_checksum(self) -> str:
        """체크섬 계산"""
        data = f"{self.version}:{self.uid}:{self.owner_did}:{self.created_at.isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def to_bytes(self) -> bytes:
        """바이트로 직렬화"""
        header_dict = {
            "v": self.version,
            "u": self.uid,
            "o": self.owner_did,
            "c": self.credential_hash,
            "t": self.created_at.isoformat(),
            "e": self.expires_at.isoformat() if self.expires_at else None,
            "x": self.checksum or self.calculate_checksum(),
        }
        return json.dumps(header_dict, separators=(',', ':')).encode()
    
    @classmethod
    def from_bytes(cls, data: bytes) -> "UNPHeader":
        """바이트에서 역직렬화"""
        header_dict = json.loads(data.decode())
        return cls(
            version=header_dict["v"],
            uid=header_dict["u"],
            owner_did=header_dict["o"],
            credential_hash=header_dict["c"],
            created_at=datetime.fromisoformat(header_dict["t"]),
            expires_at=datetime.fromisoformat(header_dict["e"]) if header_dict["e"] else None,
            checksum=header_dict["x"],
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 벡터 공간 (1:12:144 좌표)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class VectorSpace:
    """1:12:144 프랙탈 벡터 공간"""
    core_value: float = 0.5               # 코어 값 (1)
    domain_values: List[float] = None     # 도메인 값 (12)
    indicator_values: List[float] = None  # 지표 값 (144)
    
    def __post_init__(self):
        if self.domain_values is None:
            self.domain_values = [0.5] * 12
        if self.indicator_values is None:
            self.indicator_values = [0.5] * 144
    
    def validate(self) -> Tuple[bool, List[str]]:
        """구조 검증"""
        errors = []
        
        if len(self.domain_values) != 12:
            errors.append(f"Expected 12 domains, got {len(self.domain_values)}")
        
        if len(self.indicator_values) != 144:
            errors.append(f"Expected 144 indicators, got {len(self.indicator_values)}")
        
        # 값 범위 확인
        all_values = [self.core_value] + self.domain_values + self.indicator_values
        for i, v in enumerate(all_values):
            if not 0 <= v <= 1:
                errors.append(f"Value at index {i} out of range: {v}")
        
        return len(errors) == 0, errors
    
    def get_node_value(self, node_id: str) -> float:
        """노드 ID로 값 조회"""
        try:
            node_num = int(node_id[1:])  # n01 -> 1
            if 1 <= node_num <= 36:
                # 36개 노드는 144개 지표 중 4개씩 매핑
                start_idx = (node_num - 1) * 4
                return sum(self.indicator_values[start_idx:start_idx+4]) / 4
        except (ValueError, IndexError):
            pass
        return 0.5
    
    def set_node_value(self, node_id: str, value: float):
        """노드 값 설정"""
        try:
            node_num = int(node_id[1:])
            if 1 <= node_num <= 36:
                start_idx = (node_num - 1) * 4
                for i in range(4):
                    self.indicator_values[start_idx + i] = value
        except (ValueError, IndexError):
            pass
    
    def to_36_vector(self) -> List[float]:
        """36차원 벡터로 변환"""
        vector = []
        for i in range(36):
            start_idx = i * 4
            avg = sum(self.indicator_values[start_idx:start_idx+4]) / 4
            vector.append(avg)
        return vector
    
    def to_bytes(self) -> bytes:
        """바이트로 직렬화"""
        # 1 + 12 + 144 = 157 floats = 628 bytes
        values = [self.core_value] + self.domain_values + self.indicator_values
        return struct.pack(f'>{len(values)}f', *values)
    
    @classmethod
    def from_bytes(cls, data: bytes) -> "VectorSpace":
        """바이트에서 역직렬화"""
        count = len(data) // 4
        values = struct.unpack(f'>{count}f', data)
        return cls(
            core_value=values[0],
            domain_values=list(values[1:13]),
            indicator_values=list(values[13:157]),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 물리 속성
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PhysicsProperty:
    """물리 속성"""
    friction: float = 0.0                 # 마찰 계수 (0~1)
    energy: float = 1.0                   # 에너지 보존량 (0~1)
    momentum: float = 0.0                 # 운동량
    entropy: float = 0.3                  # 엔트로피
    dimension: str = "CAPITAL"            # 주요 물리 차원
    
    def apply_decay(self, dt: float = 0.1) -> float:
        """시간에 따른 감쇠"""
        decay_rate = 0.02 * (1 + self.friction)
        self.energy *= (1 - decay_rate * dt)
        return self.energy
    
    def add_momentum(self, force: float, mass: float = 1.0):
        """운동량 추가 (F = ma)"""
        acceleration = force / mass
        self.momentum += acceleration
    
    def to_dict(self) -> Dict:
        return {
            "friction": self.friction,
            "energy": self.energy,
            "momentum": self.momentum,
            "entropy": self.entropy,
            "dimension": self.dimension,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 인터페이스 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NodeInterface:
    """노드 인터페이스"""
    node_id: str
    interface_type: InterfaceType = InterfaceType.BIDIRECTIONAL
    connected_nodes: List[str] = field(default_factory=list)
    data_type: DataType = DataType.SCALAR
    transform_rules: Dict = field(default_factory=dict)
    
    def can_connect(self, other_node: str) -> bool:
        """연결 가능 여부"""
        if self.interface_type == InterfaceType.OUTPUT:
            return True  # 출력 전용은 모든 노드에 연결 가능
        if self.interface_type == InterfaceType.INPUT:
            return other_node in self.connected_nodes
        return True  # 양방향
    
    def to_dict(self) -> Dict:
        return {
            "node_id": self.node_id,
            "type": self.interface_type.value,
            "connections": self.connected_nodes,
            "data_type": self.data_type.value,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# UNP 패킷 (전체 규격)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class UNPPacket:
    """
    UNP 패킷 - 완전한 노드 데이터 단위
    
    구조:
    [Header][VectorSpace][PhysicsProperty][Interfaces][Payload]
    """
    header: UNPHeader
    vector_space: VectorSpace
    physics: PhysicsProperty
    interfaces: List[NodeInterface] = field(default_factory=list)
    payload: bytes = b""  # 추가 데이터 (암호화됨)
    
    def validate(self) -> Tuple[bool, List[str]]:
        """패킷 검증"""
        errors = []
        
        # 헤더 체크섬 검증
        if self.header.checksum != self.header.calculate_checksum():
            errors.append("Header checksum mismatch")
        
        # 만료 확인
        if self.header.expires_at and datetime.utcnow() > self.header.expires_at:
            errors.append("Packet expired")
        
        # 벡터 공간 검증
        valid, vec_errors = self.vector_space.validate()
        if not valid:
            errors.extend(vec_errors)
        
        return len(errors) == 0, errors
    
    def get_36_vector(self) -> List[float]:
        """36차원 벡터 추출"""
        return self.vector_space.to_36_vector()
    
    def serialize(self) -> bytes:
        """직렬화"""
        header_bytes = self.header.to_bytes()
        vector_bytes = self.vector_space.to_bytes()
        physics_bytes = json.dumps(self.physics.to_dict()).encode()
        interfaces_bytes = json.dumps([i.to_dict() for i in self.interfaces]).encode()
        
        # 길이 정보 포함
        parts = [
            struct.pack('>I', len(header_bytes)), header_bytes,
            struct.pack('>I', len(vector_bytes)), vector_bytes,
            struct.pack('>I', len(physics_bytes)), physics_bytes,
            struct.pack('>I', len(interfaces_bytes)), interfaces_bytes,
            struct.pack('>I', len(self.payload)), self.payload,
        ]
        
        return b'UNP' + b''.join(parts)
    
    @classmethod
    def deserialize(cls, data: bytes) -> "UNPPacket":
        """역직렬화"""
        if not data.startswith(b'UNP'):
            raise ValueError("Invalid UNP packet")
        
        offset = 3
        
        def read_section(data, offset):
            length = struct.unpack('>I', data[offset:offset+4])[0]
            return data[offset+4:offset+4+length], offset+4+length
        
        header_bytes, offset = read_section(data, offset)
        vector_bytes, offset = read_section(data, offset)
        physics_bytes, offset = read_section(data, offset)
        interfaces_bytes, offset = read_section(data, offset)
        payload, offset = read_section(data, offset)
        
        header = UNPHeader.from_bytes(header_bytes)
        vector_space = VectorSpace.from_bytes(vector_bytes)
        physics_dict = json.loads(physics_bytes.decode())
        physics = PhysicsProperty(**physics_dict)
        
        interfaces_list = json.loads(interfaces_bytes.decode())
        interfaces = [
            NodeInterface(
                node_id=i["node_id"],
                interface_type=InterfaceType(i["type"]),
                connected_nodes=i.get("connections", []),
                data_type=DataType(i.get("data_type", "scalar")),
            )
            for i in interfaces_list
        ]
        
        return cls(
            header=header,
            vector_space=vector_space,
            physics=physics,
            interfaces=interfaces,
            payload=payload,
        )
    
    def to_dict(self) -> Dict:
        return {
            "header": {
                "version": self.header.version,
                "uid": self.header.uid,
                "owner": self.header.owner_did[:16] + "..." if self.header.owner_did else "",
                "created": self.header.created_at.isoformat(),
            },
            "vector_36": self.get_36_vector()[:6],  # 처음 6개만
            "physics": self.physics.to_dict(),
            "interfaces_count": len(self.interfaces),
            "payload_size": len(self.payload),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# UNP 변환기
# ═══════════════════════════════════════════════════════════════════════════════

class UNPTransformer:
    """
    UNP 변환기
    
    다양한 형식의 데이터를 UNP 규격으로 변환
    """
    
    @staticmethod
    def from_raw_data(
        data: Dict[str, Any],
        owner_did: str,
        credential_hash: str = "",
        validity_days: int = 365,
    ) -> UNPPacket:
        """원시 데이터를 UNP로 변환"""
        # 헤더 생성
        uid = hashlib.sha256(
            f"{owner_did}:{json.dumps(data, sort_keys=True)}".encode()
        ).hexdigest()[:16]
        
        header = UNPHeader(
            uid=uid,
            owner_did=owner_did,
            credential_hash=credential_hash,
            expires_at=datetime.utcnow() + timedelta(days=validity_days),
        )
        header.checksum = header.calculate_checksum()
        
        # 벡터 공간 생성
        vector_space = VectorSpace()
        
        # 데이터에서 숫자 값 추출하여 매핑
        numeric_values = UNPTransformer._extract_numeric_values(data)
        for i, val in enumerate(numeric_values[:36]):
            node_id = f"n{i+1:02d}"
            vector_space.set_node_value(node_id, val)
        
        # 물리 속성 추론
        physics = UNPTransformer._infer_physics(data)
        
        # 인터페이스 자동 생성
        interfaces = UNPTransformer._generate_interfaces(numeric_values)
        
        return UNPPacket(
            header=header,
            vector_space=vector_space,
            physics=physics,
            interfaces=interfaces,
        )
    
    @staticmethod
    def _extract_numeric_values(data: Dict, max_values: int = 144) -> List[float]:
        """데이터에서 숫자 값 추출 및 정규화"""
        values = []
        
        def extract(obj, depth=0):
            if depth > 5 or len(values) >= max_values:
                return
            
            if isinstance(obj, (int, float)):
                # 0~1로 정규화 (시그모이드)
                import math
                normalized = 1 / (1 + math.exp(-obj / 100))
                values.append(normalized)
            elif isinstance(obj, dict):
                for v in obj.values():
                    extract(v, depth + 1)
            elif isinstance(obj, list):
                for item in obj:
                    extract(item, depth + 1)
        
        extract(data)
        
        # 부족하면 0.5로 채움
        while len(values) < max_values:
            values.append(0.5)
        
        return values[:max_values]
    
    @staticmethod
    def _infer_physics(data: Dict) -> PhysicsProperty:
        """데이터에서 물리 속성 추론"""
        # 키워드 기반 차원 추론
        text = json.dumps(data).lower()
        
        dimension = "CAPITAL"  # 기본값
        if any(k in text for k in ["health", "fitness", "medical", "body"]):
            dimension = "BIO"
        elif any(k in text for k in ["learn", "study", "skill", "knowledge"]):
            dimension = "COGNITION"
        elif any(k in text for k in ["family", "friend", "network", "social"]):
            dimension = "RELATION"
        elif any(k in text for k in ["home", "office", "environment", "space"]):
            dimension = "ENVIRONMENT"
        elif any(k in text for k in ["purpose", "legacy", "impact", "mission"]):
            dimension = "LEGACY"
        
        return PhysicsProperty(dimension=dimension)
    
    @staticmethod
    def _generate_interfaces(values: List[float]) -> List[NodeInterface]:
        """인터페이스 자동 생성"""
        interfaces = []
        
        # 활성 노드 (값이 높은 노드)에만 인터페이스 생성
        for i, val in enumerate(values[:36]):
            if val > 0.6:  # 임계값 이상
                node_id = f"n{i+1:02d}"
                
                # 인접 노드 연결
                connected = []
                for offset in [-1, 1, -6, 6]:
                    neighbor = i + 1 + offset
                    if 1 <= neighbor <= 36:
                        connected.append(f"n{neighbor:02d}")
                
                interfaces.append(NodeInterface(
                    node_id=node_id,
                    interface_type=InterfaceType.BIDIRECTIONAL,
                    connected_nodes=connected,
                ))
        
        return interfaces
    
    @staticmethod
    def to_zero_meaning(packet: UNPPacket) -> Dict:
        """UNP 패킷을 Zero Meaning 형식으로 변환"""
        vector = packet.get_36_vector()
        
        return {
            "uid": packet.header.uid,
            "timestamp": packet.header.created_at.timestamp(),
            "vector": vector,
            "energy": packet.physics.energy,
            "dimension_index": PHYSICS_DIMENSIONS.index(packet.physics.dimension),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

def create_unp_packet(
    data: Dict,
    owner: str,
    credential: str = "",
) -> UNPPacket:
    """UNP 패킷 생성 (편의 함수)"""
    return UNPTransformer.from_raw_data(data, owner, credential)


def validate_unp(packet: UNPPacket) -> Dict:
    """UNP 검증 (편의 함수)"""
    valid, errors = packet.validate()
    return {
        "valid": valid,
        "errors": errors,
        "packet_info": packet.to_dict(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "UNPPacket",
    "UNPHeader",
    "VectorSpace",
    "PhysicsProperty",
    "NodeInterface",
    "UNPTransformer",
    # Enums
    "DataType",
    "InterfaceType",
    # Constants
    "FRACTAL",
    "PHYSICS_DIMENSIONS",
    "DOMAINS_12",
    "UNP_VERSION",
    # Functions
    "create_unp_packet",
    "validate_unp",
]
