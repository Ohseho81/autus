"""
AUTUS Ontology Initializer v0.1.1
=================================

사용자 온톨로지 상태 초기화
탑다운: 전역 구조로 시작 → 로그로 채움

Constitution 준수:
- Article I: Zero Identity → user_id는 로컬 생성 pseudonymous ID
- Article II: Privacy by Architecture → 상태는 로컬에만 저장
- Article IV: Minimal Core → 이 파일이 Core의 일부

v0.1.1 Changes:
- NodeState에 log_history 필드 추가 (일관성 점수 계산용)
"""

import yaml
import uuid
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict


# ===========================================
# 설정 경로
# ===========================================
BASE_DIR = Path(__file__).parent.parent
STRUCTURE_PATH = BASE_DIR / "structure" / "universal_1_3_9.yaml"
WEIGHTS_PATH = BASE_DIR / "defaults" / "weights.yaml"
THRESHOLDS_PATH = BASE_DIR / "defaults" / "thresholds.yaml"
METRICS_PATH = BASE_DIR / "defaults" / "metrics.yaml"


# ===========================================
# 데이터 클래스
# ===========================================
@dataclass
class NodeState:
    """개별 노드의 상태"""
    value: float = 0.5
    confidence: float = 0.0
    log_count: int = 0
    last_updated: Optional[str] = None
    uncertainty_level: str = "range"  # range | estimate | confirmed
    log_history: List[str] = field(default_factory=list)  # [v0.1.1] 로그 타임스탬프 기록
    
    def to_dict(self) -> dict:
        data = asdict(self)
        # log_history는 최근 100개만 저장
        data['log_history'] = data['log_history'][-100:] if data['log_history'] else []
        return data
    
    @classmethod
    def from_dict(cls, data: dict) -> 'NodeState':
        # log_history 필드 호환성 처리
        if 'log_history' not in data:
            data['log_history'] = []
        return cls(**data)


@dataclass
class UserOntology:
    """사용자의 전체 온톨로지 상태"""
    # 메타 정보 (로컬 생성, 서버 전송 안함)
    local_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_modified: str = field(default_factory=lambda: datetime.now().isoformat())
    schema_version: str = "0.1.1"
    
    # 노드 상태
    nodes: Dict[str, NodeState] = field(default_factory=dict)
    
    # 도메인 가중치 (개인화됨)
    domain_weights: Dict[str, float] = field(default_factory=dict)
    node_weights: Dict[str, Dict[str, float]] = field(default_factory=dict)
    
    # 시스템 상태
    system_state: str = "STABLE"  # STABLE | VOLATILE | OPPORTUNITY | INTERDEPENDENT
    total_logs_processed: int = 0
    
    def to_dict(self) -> dict:
        return {
            "local_id": self.local_id,
            "created_at": self.created_at,
            "last_modified": self.last_modified,
            "schema_version": self.schema_version,
            "nodes": {k: v.to_dict() for k, v in self.nodes.items()},
            "domain_weights": self.domain_weights,
            "node_weights": self.node_weights,
            "system_state": self.system_state,
            "total_logs_processed": self.total_logs_processed
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'UserOntology':
        nodes = {k: NodeState.from_dict(v) for k, v in data.get("nodes", {}).items()}
        return cls(
            local_id=data.get("local_id", str(uuid.uuid4())),
            created_at=data.get("created_at", datetime.now().isoformat()),
            last_modified=data.get("last_modified", datetime.now().isoformat()),
            schema_version=data.get("schema_version", "0.1.1"),
            nodes=nodes,
            domain_weights=data.get("domain_weights", {}),
            node_weights=data.get("node_weights", {}),
            system_state=data.get("system_state", "STABLE"),
            total_logs_processed=data.get("total_logs_processed", 0)
        )


# ===========================================
# Initializer 클래스
# ===========================================
class OntologyInitializer:
    """
    사용자 온톨로지 초기화
    
    탑다운 방식:
    1. 전역 구조(스키마) 로드
    2. 기본값으로 모든 노드 초기화
    3. 사용자 로그가 쌓이면 값 업데이트
    """
    
    def __init__(self):
        self.structure = self._load_yaml(STRUCTURE_PATH)
        self.weights = self._load_yaml(WEIGHTS_PATH)
        self.thresholds = self._load_yaml(THRESHOLDS_PATH)
        self.metrics = self._load_yaml(METRICS_PATH)
    
    def _load_yaml(self, path: Path) -> dict:
        """YAML 파일 로드"""
        if not path.exists():
            return {}
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    
    def initialize_user(self) -> UserOntology:
        """
        새 사용자 온톨로지 초기화
        
        Returns:
            UserOntology: 기본값으로 초기화된 온톨로지
        """
        ontology = UserOntology()
        
        # 1. 노드 초기화 (전역 구조에서 기본값 로드)
        ontology.nodes = self._initialize_nodes()
        
        # 2. 가중치 초기화 (인류 평균값)
        ontology.domain_weights = self._initialize_domain_weights()
        ontology.node_weights = self._initialize_node_weights()
        
        return ontology
    
    def _initialize_nodes(self) -> Dict[str, NodeState]:
        """모든 노드를 기본값으로 초기화"""
        nodes = {}
        
        # Level 2 노드들 초기화
        for node_name, node_config in self.structure.get("nodes", {}).items():
            default_value = node_config.get("default_value", 0.5) if isinstance(node_config, dict) else 0.5
            
            nodes[node_name] = NodeState(
                value=default_value,
                confidence=0.0,  # 데이터 없음
                log_count=0,
                last_updated=None,
                uncertainty_level="range",  # 초기에는 범위로 표시
                log_history=[]  # [v0.1.1]
            )
        
        return nodes
    
    def _initialize_domain_weights(self) -> Dict[str, float]:
        """도메인 가중치 초기화 (인류 평균)"""
        default_weights = self.weights.get("domain_weights", {}).get("default", {})
        return {
            "SURVIVE": default_weights.get("SURVIVE", 0.40),
            "GROW": default_weights.get("GROW", 0.35),
            "CONNECT": default_weights.get("CONNECT", 0.25)
        }
    
    def _initialize_node_weights(self) -> Dict[str, Dict[str, float]]:
        """노드 가중치 초기화"""
        node_weights = self.weights.get("node_weights", {})
        return {
            "SURVIVE": {
                "HEALTH": node_weights.get("SURVIVE", {}).get("HEALTH", 0.35),
                "WEALTH": node_weights.get("SURVIVE", {}).get("WEALTH", 0.35),
                "SECURITY": node_weights.get("SURVIVE", {}).get("SECURITY", 0.30)
            },
            "GROW": {
                "CAREER": node_weights.get("GROW", {}).get("CAREER", 0.40),
                "LEARNING": node_weights.get("GROW", {}).get("LEARNING", 0.35),
                "CREATION": node_weights.get("GROW", {}).get("CREATION", 0.25)
            },
            "CONNECT": {
                "FAMILY": node_weights.get("CONNECT", {}).get("FAMILY", 0.45),
                "SOCIAL": node_weights.get("CONNECT", {}).get("SOCIAL", 0.35),
                "LEGACY": node_weights.get("CONNECT", {}).get("LEGACY", 0.20)
            }
        }
    
    def load_user(self, filepath: Path) -> UserOntology:
        """
        기존 사용자 온톨로지 로드
        
        Args:
            filepath: 로컬 저장된 온톨로지 파일 경로
            
        Returns:
            UserOntology: 로드된 온톨로지
        """
        if not filepath.exists():
            raise FileNotFoundError(f"User ontology not found: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return UserOntology.from_dict(data)
    
    def save_user(self, ontology: UserOntology, filepath: Path) -> None:
        """
        사용자 온톨로지 저장 (로컬에만!)
        
        Args:
            ontology: 저장할 온톨로지
            filepath: 저장 경로
        """
        ontology.last_modified = datetime.now().isoformat()
        
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(ontology.to_dict(), f, indent=2, ensure_ascii=False)
    
    def get_display_value(self, node_state: NodeState) -> dict:
        """
        Uncertainty Layer: 확신도에 따른 표시 값 결정
        
        Args:
            node_state: 노드 상태
            
        Returns:
            dict: 표시용 데이터
        """
        confidence = node_state.confidence
        value = node_state.value
        
        if confidence < 0.3:
            # Range: 넓은 범위로 표시
            return {
                "type": "range",
                "value": value,
                "min": max(0, value - 0.2),
                "max": min(1, value + 0.2),
                "label": "데이터 수집 중",
                "actionable": False
            }
        elif confidence < 0.7:
            # Estimate: 추정값
            return {
                "type": "estimate",
                "value": value,
                "min": max(0, value - 0.1),
                "max": min(1, value + 0.1),
                "label": "추정",
                "actionable": "with_warning"
            }
        else:
            # Confirmed: 확정값
            return {
                "type": "confirmed",
                "value": value,
                "min": max(0, value - 0.05),
                "max": min(1, value + 0.05),
                "label": "확인됨",
                "actionable": True
            }
    
    def calculate_domain_value(self, ontology: UserOntology, domain: str) -> float:
        """
        도메인 값 계산 (하위 노드들의 가중 평균)
        
        Args:
            ontology: 사용자 온톨로지
            domain: 도메인 이름 (SURVIVE, GROW, CONNECT)
            
        Returns:
            float: 도메인 값
        """
        domain_config = self.structure.get("domains", {}).get(domain, {})
        children = domain_config.get("children", []) if isinstance(domain_config, dict) else []
        weights = ontology.node_weights.get(domain, {})
        
        total = 0.0
        weight_sum = 0.0
        
        for child in children:
            if child in ontology.nodes:
                node_state = ontology.nodes[child]
                weight = weights.get(child, 1.0 / len(children) if children else 1.0)
                total += node_state.value * weight
                weight_sum += weight
        
        return total / weight_sum if weight_sum > 0 else 0.5
    
    def calculate_self_value(self, ontology: UserOntology) -> float:
        """
        SELF 값 계산 (도메인들의 가중 평균)
        
        Args:
            ontology: 사용자 온톨로지
            
        Returns:
            float: SELF 값 (0-1)
        """
        domains = ["SURVIVE", "GROW", "CONNECT"]
        total = 0.0
        
        for domain in domains:
            domain_value = self.calculate_domain_value(ontology, domain)
            weight = ontology.domain_weights.get(domain, 1.0 / len(domains))
            total += domain_value * weight
        
        return total
    
    def get_schema_info(self) -> dict:
        """스키마 정보 반환"""
        return {
            "version": self.structure.get("version", "0.1.0"),
            "levels": self.structure.get("levels", 3),
            "name": self.structure.get("name", "Universal Ontology"),
        }


# ===========================================
# 편의 함수
# ===========================================
def create_new_user() -> UserOntology:
    """새 사용자 온톨로지 생성"""
    initializer = OntologyInitializer()
    return initializer.initialize_user()


def load_user(filepath: str) -> UserOntology:
    """기존 사용자 로드"""
    initializer = OntologyInitializer()
    return initializer.load_user(Path(filepath))


def save_user(ontology: UserOntology, filepath: str) -> None:
    """사용자 저장"""
    initializer = OntologyInitializer()
    initializer.save_user(ontology, Path(filepath))


# ===========================================
# 테스트
# ===========================================
if __name__ == "__main__":
    print("=== AUTUS Ontology Initializer Test (v0.1.1) ===\n")
    
    # 1. 새 사용자 생성
    print("1. Creating new user ontology...")
    ontology = create_new_user()
    print(f"   Local ID: {ontology.local_id[:8]}...")
    print(f"   Schema Version: {ontology.schema_version}")
    print(f"   Nodes initialized: {len(ontology.nodes)}")
    
    # 2. 노드 상태 확인
    print("\n2. Initial node states:")
    for name, state in ontology.nodes.items():
        print(f"   {name}: value={state.value}, confidence={state.confidence}, level={state.uncertainty_level}")
    
    # 3. 도메인 가중치 확인
    print("\n3. Domain weights (human average):")
    for domain, weight in ontology.domain_weights.items():
        print(f"   {domain}: {weight}")
    
    # 4. SELF 값 계산
    initializer = OntologyInitializer()
    self_value = initializer.calculate_self_value(ontology)
    print(f"\n4. SELF value: {self_value:.3f}")
    
    # 5. 표시 값 확인 (Uncertainty Layer)
    print("\n5. Display values (Uncertainty Layer):")
    for name, state in ontology.nodes.items():
        display = initializer.get_display_value(state)
        print(f"   {name}: {display['type']} - {display['label']}")
    
    print("\n=== Test Complete ===")