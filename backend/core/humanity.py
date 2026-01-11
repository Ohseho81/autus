"""
═══════════════════════════════════════════════════════════════════════════════
🌍 AUTUS v2.1 - Humanity Analysis Engine
═══════════════════════════════════════════════════════════════════════════════

개별 사용자가 아닌 **사용자 간 상호관계**로 인류를 분석

핵심 개념:
  • 사용자 변수: 개인의 36개 노드 값
  • 연결고리 변수: 노드 간 인과관계 (인류 공통 법칙)
  • 상호관계: 사용자 간 패턴 → 인류 전체 통찰

분석 레벨:
  1. Individual: 개인 압력/상태
  2. Cohort: 유사 그룹 클러스터링
  3. Humanity: 전체 인류 패턴/법칙 발견
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from collections import defaultdict
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Data Structures
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class HumanityInsight:
    """인류 분석 결과"""
    total_users: int
    avg_pressure: float                    # 평균 압력
    pressure_distribution: Dict[str, int]  # 상태 분포 (IGNORABLE/PRESSURING/IRREVERSIBLE)
    top_pressures: List[Tuple[str, float]] # 가장 높은 압력 노드들
    correlations: Dict[str, float]         # 노드 간 상관관계
    clusters: List[Dict]                   # 인류 유형 클러스터
    laws_discovered: List[Dict]            # 발견된 인류 법칙
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass  
class UserVector:
    """사용자를 36차원 벡터로 표현"""
    user_id: str
    values: np.ndarray      # 36개 노드 원시값
    pressures: np.ndarray   # 36개 노드 압력 (0-1 정규화)
    
    @property
    def dominant_layer(self) -> str:
        """가장 압력이 높은 레이어"""
        layer_pressures = {
            'L1_재무': np.mean(self.pressures[0:8]),
            'L2_생체': np.mean(self.pressures[8:14]),
            'L3_관계': np.mean(self.pressures[14:22]),
            'L4_시간': np.mean(self.pressures[22:28]),
            'L5_의미': np.mean(self.pressures[28:36]),
        }
        return max(layer_pressures, key=layer_pressures.get)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Humanity Analysis Engine
# ═══════════════════════════════════════════════════════════════════════════════

class HumanityEngine:
    """인류 상호관계 분석 엔진"""
    
    # 36개 노드 ID
    NODE_IDS = [f"n{i:02d}" for i in range(1, 37)]
    
    # 레이어별 노드 인덱스
    LAYER_INDICES = {
        'L1_재무': (0, 8),   # n01-n08
        'L2_생체': (8, 14),  # n09-n14
        'L3_관계': (14, 22), # n15-n22
        'L4_시간': (22, 28), # n23-n28
        'L5_의미': (28, 36), # n29-n36
    }
    
    def __init__(self):
        self.users: Dict[str, UserVector] = {}
        self._correlation_cache: Optional[np.ndarray] = None
    
    # ─────────────────────────────────────────────────────────────────────────
    # 데이터 수집
    # ─────────────────────────────────────────────────────────────────────────
    
    def add_user(self, user_id: str, node_values: Dict[str, float], 
                 node_pressures: Dict[str, float]) -> None:
        """사용자 추가"""
        values = np.array([node_values.get(nid, 0.0) for nid in self.NODE_IDS])
        pressures = np.array([node_pressures.get(nid, 0.0) for nid in self.NODE_IDS])
        
        self.users[user_id] = UserVector(
            user_id=user_id,
            values=values,
            pressures=pressures
        )
        self._correlation_cache = None  # 캐시 무효화
    
    def add_users_batch(self, users_data: List[Dict]) -> int:
        """배치로 사용자 추가"""
        for data in users_data:
            self.add_user(
                data['user_id'],
                data.get('values', {}),
                data.get('pressures', {})
            )
        return len(users_data)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 상호관계 분석
    # ─────────────────────────────────────────────────────────────────────────
    
    def analyze(self) -> HumanityInsight:
        """전체 인류 분석"""
        if len(self.users) < 2:
            return self._empty_insight()
        
        # 압력 행렬 생성 (users × 36 nodes)
        pressure_matrix = np.array([u.pressures for u in self.users.values()])
        
        return HumanityInsight(
            total_users=len(self.users),
            avg_pressure=float(np.mean(pressure_matrix)),
            pressure_distribution=self._calc_distribution(pressure_matrix),
            top_pressures=self._find_top_pressures(pressure_matrix),
            correlations=self._calc_correlations(pressure_matrix),
            clusters=self._find_clusters(pressure_matrix),
            laws_discovered=self._discover_laws(pressure_matrix),
        )
    
    def _empty_insight(self) -> HumanityInsight:
        return HumanityInsight(
            total_users=len(self.users),
            avg_pressure=0.0,
            pressure_distribution={},
            top_pressures=[],
            correlations={},
            clusters=[],
            laws_discovered=[],
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 분석 메서드들
    # ─────────────────────────────────────────────────────────────────────────
    
    def _calc_distribution(self, matrix: np.ndarray) -> Dict[str, int]:
        """상태 분포 계산"""
        avg_pressures = np.mean(matrix, axis=1)  # 사용자별 평균 압력
        return {
            'IGNORABLE': int(np.sum(avg_pressures < 0.3)),
            'PRESSURING': int(np.sum((avg_pressures >= 0.3) & (avg_pressures < 0.7))),
            'IRREVERSIBLE': int(np.sum(avg_pressures >= 0.7)),
        }
    
    def _find_top_pressures(self, matrix: np.ndarray) -> List[Tuple[str, float]]:
        """가장 높은 압력 노드들"""
        avg_by_node = np.mean(matrix, axis=0)
        top_indices = np.argsort(avg_by_node)[::-1][:5]
        return [(self.NODE_IDS[i], float(avg_by_node[i])) for i in top_indices]
    
    def _calc_correlations(self, matrix: np.ndarray) -> Dict[str, float]:
        """노드 간 상관관계 (인류 공통 패턴)"""
        if self._correlation_cache is None:
            # 상관행렬 계산 (36 × 36)
            self._correlation_cache = np.corrcoef(matrix.T)
        
        # 강한 상관관계만 추출
        strong_correlations = {}
        for i in range(36):
            for j in range(i + 1, 36):
                corr = self._correlation_cache[i, j]
                if abs(corr) > 0.5:  # 강한 상관관계
                    key = f"{self.NODE_IDS[i]}↔{self.NODE_IDS[j]}"
                    strong_correlations[key] = round(float(corr), 3)
        
        return dict(sorted(strong_correlations.items(), 
                          key=lambda x: abs(x[1]), reverse=True)[:10])
    
    def _find_clusters(self, matrix: np.ndarray) -> List[Dict]:
        """인류 유형 클러스터링 (K-means 간소화)"""
        n_clusters = min(5, len(self.users) // 10 + 1)
        if n_clusters < 2:
            return []
        
        # 간단한 K-means
        centroids = matrix[np.random.choice(len(matrix), n_clusters, replace=False)]
        
        for _ in range(10):  # 10회 반복
            # 할당
            distances = np.array([[np.linalg.norm(row - c) for c in centroids] 
                                  for row in matrix])
            labels = np.argmin(distances, axis=1)
            
            # 업데이트
            new_centroids = np.array([matrix[labels == k].mean(axis=0) 
                                      for k in range(n_clusters)])
            if np.allclose(centroids, new_centroids):
                break
            centroids = new_centroids
        
        # 클러스터 해석
        clusters = []
        for k in range(n_clusters):
            mask = labels == k
            cluster_matrix = matrix[mask]
            if len(cluster_matrix) == 0:
                continue
                
            # 이 클러스터의 특징 찾기
            cluster_avg = np.mean(cluster_matrix, axis=0)
            global_avg = np.mean(matrix, axis=0)
            diff = cluster_avg - global_avg
            
            # 가장 특징적인 노드
            top_idx = np.argmax(np.abs(diff))
            characteristic = self.NODE_IDS[top_idx]
            
            # 지배적 레이어 찾기
            layer_avgs = {
                name: np.mean(cluster_avg[start:end])
                for name, (start, end) in self.LAYER_INDICES.items()
            }
            dominant_layer = max(layer_avgs, key=layer_avgs.get)
            
            clusters.append({
                'id': k,
                'size': int(np.sum(mask)),
                'percentage': round(np.sum(mask) / len(matrix) * 100, 1),
                'avg_pressure': round(float(np.mean(cluster_matrix)), 3),
                'characteristic_node': characteristic,
                'dominant_layer': dominant_layer,
                'name': self._name_cluster(dominant_layer, cluster_avg),
            })
        
        return sorted(clusters, key=lambda x: x['size'], reverse=True)
    
    def _name_cluster(self, layer: str, avg: np.ndarray) -> str:
        """클러스터에 인간적 이름 부여"""
        names = {
            'L1_재무': ['재무 압박형', '경제 불안형', '자금 스트레스형'],
            'L2_생체': ['건강 위기형', '피로 누적형', '신체 경고형'],
            'L3_관계': ['관계 갈등형', '고립 위험형', '신뢰 결핍형'],
            'L4_시간': ['시간 결핍형', '번아웃 위험형', '과부하형'],
            'L5_의미': ['목적 상실형', '의미 추구형', '방향 탐색형'],
        }
        pressure = np.mean(avg)
        idx = 0 if pressure < 0.3 else (1 if pressure < 0.7 else 2)
        return names.get(layer, ['미분류'])[min(idx, len(names.get(layer, ['미분류'])) - 1)]
    
    def _discover_laws(self, matrix: np.ndarray) -> List[Dict]:
        """인류 공통 법칙 발견"""
        laws = []
        
        # 1. 레이어 간 상관관계 법칙
        for l1_name, (l1_start, l1_end) in self.LAYER_INDICES.items():
            for l2_name, (l2_start, l2_end) in self.LAYER_INDICES.items():
                if l1_name >= l2_name:
                    continue
                    
                l1_avg = np.mean(matrix[:, l1_start:l1_end], axis=1)
                l2_avg = np.mean(matrix[:, l2_start:l2_end], axis=1)
                corr = np.corrcoef(l1_avg, l2_avg)[0, 1]
                
                if abs(corr) > 0.6:
                    direction = "정비례" if corr > 0 else "반비례"
                    laws.append({
                        'type': 'layer_correlation',
                        'description': f"{l1_name}과 {l2_name}은 {direction} 관계",
                        'correlation': round(float(corr), 3),
                        'confidence': round(abs(float(corr)), 2),
                    })
        
        # 2. 임계점 법칙 (특정 압력 이상에서 연쇄 반응)
        high_pressure_users = matrix[np.mean(matrix, axis=1) > 0.6]
        if len(high_pressure_users) > 10:
            cascade_nodes = np.mean(high_pressure_users, axis=0)
            top_cascade = np.argsort(cascade_nodes)[::-1][:3]
            laws.append({
                'type': 'cascade_pattern',
                'description': f"고압력 상태에서 {', '.join([self.NODE_IDS[i] for i in top_cascade])} 노드가 연쇄 상승",
                'affected_nodes': [self.NODE_IDS[i] for i in top_cascade],
                'confidence': round(len(high_pressure_users) / len(matrix), 2),
            })
        
        # 3. 회복 패턴 (저압력 사용자의 공통점)
        low_pressure_users = matrix[np.mean(matrix, axis=1) < 0.3]
        if len(low_pressure_users) > 10:
            stable_pattern = np.mean(low_pressure_users, axis=0)
            stable_nodes = np.argsort(stable_pattern)[:3]
            laws.append({
                'type': 'stability_pattern',
                'description': f"안정 상태 사용자는 {', '.join([self.NODE_IDS[i] for i in stable_nodes])} 노드가 낮음",
                'stable_nodes': [self.NODE_IDS[i] for i in stable_nodes],
                'confidence': round(len(low_pressure_users) / len(matrix), 2),
            })
        
        return sorted(laws, key=lambda x: x['confidence'], reverse=True)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 특수 분석
    # ─────────────────────────────────────────────────────────────────────────
    
    def find_similar_users(self, user_id: str, top_n: int = 5) -> List[Tuple[str, float]]:
        """유사한 사용자 찾기"""
        if user_id not in self.users:
            return []
        
        target = self.users[user_id].pressures
        similarities = []
        
        for uid, user in self.users.items():
            if uid == user_id:
                continue
            # 코사인 유사도
            sim = np.dot(target, user.pressures) / (
                np.linalg.norm(target) * np.linalg.norm(user.pressures) + 1e-9
            )
            similarities.append((uid, float(sim)))
        
        return sorted(similarities, key=lambda x: x[1], reverse=True)[:top_n]
    
    def predict_future(self, user_id: str) -> Dict:
        """유사 사용자 기반 미래 예측"""
        similar = self.find_similar_users(user_id, top_n=10)
        if not similar:
            return {}
        
        # 유사 사용자들의 압력 평균
        similar_pressures = np.mean([
            self.users[uid].pressures for uid, _ in similar
        ], axis=0)
        
        target = self.users[user_id].pressures
        trend = similar_pressures - target
        
        # 상승 예상 노드
        rising = np.argsort(trend)[::-1][:3]
        falling = np.argsort(trend)[:3]
        
        return {
            'rising_risk': [(self.NODE_IDS[i], round(float(trend[i]), 3)) for i in rising],
            'falling_risk': [(self.NODE_IDS[i], round(float(trend[i]), 3)) for i in falling],
            'similar_users_count': len(similar),
        }
    
    def get_humanity_health(self) -> Dict:
        """인류 전체 건강도"""
        if len(self.users) < 1:
            return {'health_score': 0, 'status': 'NO_DATA'}
        
        all_pressures = np.array([u.pressures for u in self.users.values()])
        avg_pressure = np.mean(all_pressures)
        
        # 건강 점수 (압력이 낮을수록 건강)
        health_score = round((1 - avg_pressure) * 100, 1)
        
        # 상태 판단
        if health_score >= 70:
            status = 'HEALTHY'
        elif health_score >= 40:
            status = 'STRESSED'
        else:
            status = 'CRITICAL'
        
        # 레이어별 건강도
        layer_health = {}
        for name, (start, end) in self.LAYER_INDICES.items():
            layer_avg = np.mean(all_pressures[:, start:end])
            layer_health[name] = round((1 - layer_avg) * 100, 1)
        
        return {
            'health_score': health_score,
            'status': status,
            'total_users': len(self.users),
            'layer_health': layer_health,
            'weakest_layer': min(layer_health, key=layer_health.get),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

humanity_engine = HumanityEngine()


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import random
    
    print("=" * 70)
    print("🌍 Humanity Analysis Engine 테스트")
    print("=" * 70)
    
    engine = HumanityEngine()
    
    # 시뮬레이션: 1000명의 다양한 사용자 생성
    print("\n📊 1,000명 사용자 시뮬레이션...")
    
    for i in range(1000):
        # 다양한 유형의 사용자 생성
        user_type = random.choice(['healthy', 'stressed', 'burnout', 'financial', 'relationship'])
        
        base_pressure = {
            'healthy': 0.2,
            'stressed': 0.5,
            'burnout': 0.8,
            'financial': 0.3,
            'relationship': 0.4,
        }[user_type]
        
        # 유형별 특화 압력
        pressures = {}
        for j, nid in enumerate(engine.NODE_IDS):
            noise = random.gauss(0, 0.15)
            if user_type == 'financial' and j < 8:
                pressures[nid] = min(1, max(0, 0.7 + noise))
            elif user_type == 'burnout' and 8 <= j < 14:
                pressures[nid] = min(1, max(0, 0.8 + noise))
            elif user_type == 'relationship' and 14 <= j < 22:
                pressures[nid] = min(1, max(0, 0.6 + noise))
            else:
                pressures[nid] = min(1, max(0, base_pressure + noise))
        
        engine.add_user(f"user_{i}", {}, pressures)
    
    # 분석 실행
    print("\n🔬 인류 분석 실행...")
    insight = engine.analyze()
    
    print(f"\n📈 분석 결과:")
    print(f"   • 총 사용자: {insight.total_users:,}명")
    print(f"   • 평균 압력: {insight.avg_pressure:.3f}")
    print(f"\n   상태 분포:")
    for state, count in insight.pressure_distribution.items():
        pct = count / insight.total_users * 100
        bar = "█" * int(pct / 5)
        print(f"     {state:15} {count:>4}명 ({pct:>5.1f}%) {bar}")
    
    print(f"\n   🔥 고압력 노드 TOP 5:")
    for node, pressure in insight.top_pressures:
        print(f"     {node}: {pressure:.3f}")
    
    print(f"\n   🔗 강한 상관관계 (인류 공통):")
    for pair, corr in list(insight.correlations.items())[:5]:
        direction = "↑↑" if corr > 0 else "↑↓"
        print(f"     {pair} {direction} r={corr}")
    
    print(f"\n   👥 인류 유형 클러스터:")
    for cluster in insight.clusters:
        print(f"     [{cluster['name']}] {cluster['size']}명 ({cluster['percentage']}%)")
        print(f"        특징 노드: {cluster['characteristic_node']}, 평균압력: {cluster['avg_pressure']}")
    
    print(f"\n   📜 발견된 인류 법칙:")
    for law in insight.laws_discovered[:3]:
        print(f"     • {law['description']}")
        print(f"       (신뢰도: {law['confidence']})")
    
    # 인류 건강도
    health = engine.get_humanity_health()
    print(f"\n   🌍 인류 건강도: {health['health_score']}점 [{health['status']}]")
    print(f"      가장 약한 영역: {health['weakest_layer']}")
    
    print("\n" + "=" * 70)
