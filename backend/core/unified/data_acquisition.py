"""
═══════════════════════════════════════════════════════════════════════════════
📡 AUTUS v3.0 - Data Acquisition (데이터 수집)
═══════════════════════════════════════════════════════════════════════════════

자율 수집 원칙: 입력 없이 API + 센서로 자동 (동의 필수)

수직 방법:
- 수직 상: 은행/카드 API (재무 데이터)
- 수직 하: 웨어러블 (건강), 캘린더 (일정), 위치 API (이동)

최대 수집: 8~12개 소스 (과부하 방지)
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from datetime import datetime
import random


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데이터 소스 설정
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class DataSourceConfig:
    """데이터 소스 설정"""
    source_type: str          # api, webhook, manual
    endpoint: str
    auth: str                 # oauth, apikey, none
    interval: str             # hourly, daily, 30min
    target_nodes: List[str]


DATA_SOURCES: Dict[str, DataSourceConfig] = {
    'banking': DataSourceConfig(
        source_type='api',
        endpoint='https://api.bank.example/v1/balance',
        auth='oauth',
        interval='hourly',
        target_nodes=['n01', 'n03'],
    ),
    'accounting': DataSourceConfig(
        source_type='api',
        endpoint='https://api.quickbooks.example/v1/cashflow',
        auth='apikey',
        interval='daily',
        target_nodes=['n01', 'n03', 'n05'],
    ),
    'wearable': DataSourceConfig(
        source_type='api',
        endpoint='https://api.fitbit.example/v1/health',
        auth='oauth',
        interval='hourly',
        target_nodes=['n09', 'n10', 'n15'],
    ),
    'calendar': DataSourceConfig(
        source_type='api',
        endpoint='https://api.google.example/calendar/v1',
        auth='oauth',
        interval='30min',
        target_nodes=['n16'],
    ),
    'project': DataSourceConfig(
        source_type='api',
        endpoint='https://api.asana.example/v1/tasks',
        auth='apikey',
        interval='hourly',
        target_nodes=['n16', 'n20'],
    ),
    'crm': DataSourceConfig(
        source_type='api',
        endpoint='https://api.hubspot.example/v1/contacts',
        auth='apikey',
        interval='daily',
        target_nodes=['n25'],
    ),
    'market': DataSourceConfig(
        source_type='api',
        endpoint='https://api.marketdata.example/v1/volatility',
        auth='apikey',
        interval='hourly',
        target_nodes=['n36'],
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 노드-데이터 매핑 (압력 변환 공식)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NodeDataTransform:
    """노드 데이터 변환 설정"""
    source: str
    field_name: str
    transform: Callable[[float], float]
    description: str


def _cash_transform(v: float) -> float:
    """현금 잔고 → 압력 (1천만원 기준)"""
    return max(0, min(1, 1 - v / 10_000_000))


def _runway_transform(v: float) -> float:
    """런웨이 개월 → 압력"""
    if v < 3:
        return 1.0
    elif v < 6:
        return 0.7
    elif v < 12:
        return 0.4
    return 0.2


def _debt_transform(v: float) -> float:
    """부채 상환 비율 → 압력"""
    return max(0, min(1, v / 50))


def _sleep_transform(v: float) -> float:
    """수면 시간 → 압력"""
    if v < 5:
        return 1.0
    elif v < 6:
        return 0.7
    elif v < 7:
        return 0.4
    return 0.2


def _hrv_transform(v: float) -> float:
    """HRV → 압력"""
    if v < 20:
        return 1.0
    elif v < 40:
        return 0.7
    elif v < 60:
        return 0.4
    return 0.2


def _stress_transform(v: float) -> float:
    """스트레스 점수 → 압력"""
    return max(0, min(1, v / 100))


def _deadline_transform(v: float) -> float:
    """마감 준수율 → 압력"""
    return max(0, min(1, 1 - v / 100))


def _error_transform(v: float) -> float:
    """오류율 → 압력"""
    return max(0, min(1, v / 20))


def _churn_transform(v: float) -> float:
    """이탈률 → 압력"""
    return max(0, min(1, v * 10))


def _volatility_transform(v: float) -> float:
    """변동성 지수 → 압력"""
    return max(0, min(1, v / 100))


NODE_DATA_TRANSFORMS: Dict[str, NodeDataTransform] = {
    'n01': NodeDataTransform('banking', 'balance', _cash_transform, '현금 잔고 → 압력'),
    'n03': NodeDataTransform('accounting', 'runway_months', _runway_transform, '런웨이 개월 → 압력'),
    'n05': NodeDataTransform('accounting', 'debt_service_ratio', _debt_transform, '부채 상환 비율 → 압력'),
    'n09': NodeDataTransform('wearable', 'sleep_hours', _sleep_transform, '수면 시간 → 압력'),
    'n10': NodeDataTransform('wearable', 'hrv', _hrv_transform, 'HRV → 압력'),
    'n15': NodeDataTransform('wearable', 'stress_score', _stress_transform, '스트레스 점수 → 압력'),
    'n16': NodeDataTransform('project', 'deadline_compliance', _deadline_transform, '마감 준수율 → 압력'),
    'n20': NodeDataTransform('project', 'error_rate', _error_transform, '오류율 → 압력'),
    'n25': NodeDataTransform('crm', 'churn_rate', _churn_transform, '이탈률 → 압력'),
    'n36': NodeDataTransform('market', 'volatility_index', _volatility_transform, '변동성 지수 → 압력'),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데이터 수집기
# ═══════════════════════════════════════════════════════════════════════════════

class DataCollector:
    """데이터 자동 수집기"""
    
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.collected_data: Dict[str, Any] = {}
        self.last_sync: Dict[str, datetime] = {}
    
    def fetch_banking(self) -> Dict[str, Any]:
        """은행 API 호출"""
        if self.dry_run:
            return {
                'balance': 3_000_000 + random.randint(-500_000, 500_000),
                'currency': 'KRW',
                'timestamp': datetime.now().isoformat(),
            }
        return {}
    
    def fetch_accounting(self) -> Dict[str, Any]:
        """회계 API 호출"""
        if self.dry_run:
            return {
                'cash_position': 2_500_000 + random.randint(-300_000, 300_000),
                'runway_months': 4 + random.randint(0, 8),
                'debt_service_ratio': 20 + random.randint(0, 30),
                'timestamp': datetime.now().isoformat(),
            }
        return {}
    
    def fetch_wearable(self) -> Dict[str, Any]:
        """웨어러블 API 호출"""
        if self.dry_run:
            return {
                'sleep_hours': 5 + random.random() * 3,
                'hrv': 30 + random.random() * 40,
                'stress_score': 30 + random.random() * 50,
                'steps': 3000 + random.randint(0, 7000),
                'timestamp': datetime.now().isoformat(),
            }
        return {}
    
    def fetch_calendar(self) -> Dict[str, Any]:
        """캘린더 API 호출"""
        if self.dry_run:
            return {
                'meetings_today': random.randint(2, 8),
                'meeting_hours': 2 + random.random() * 6,
                'upcoming_deadlines': random.randint(0, 5),
                'timestamp': datetime.now().isoformat(),
            }
        return {}
    
    def fetch_project(self) -> Dict[str, Any]:
        """프로젝트 API 호출"""
        if self.dry_run:
            return {
                'deadline_compliance': 60 + random.randint(0, 40),
                'total_delay_days': random.randint(0, 20),
                'task_completion_rate': 50 + random.randint(0, 50),
                'error_rate': random.random() * 15,
                'timestamp': datetime.now().isoformat(),
            }
        return {}
    
    def fetch_crm(self) -> Dict[str, Any]:
        """CRM API 호출"""
        if self.dry_run:
            return {
                'churn_rate': random.random() * 0.1,
                'nps_score': -20 + random.randint(0, 80),
                'active_customers': 100 + random.randint(0, 200),
                'timestamp': datetime.now().isoformat(),
            }
        return {}
    
    def fetch_market(self) -> Dict[str, Any]:
        """시장 데이터 API 호출"""
        if self.dry_run:
            return {
                'volatility_index': 10 + random.random() * 40,
                'market_trend': random.choice(['UP', 'DOWN', 'STABLE']),
                'timestamp': datetime.now().isoformat(),
            }
        return {}
    
    def collect_all(self) -> Dict[str, Dict[str, Any]]:
        """모든 소스에서 데이터 수집"""
        self.collected_data = {
            'banking': self.fetch_banking(),
            'accounting': self.fetch_accounting(),
            'wearable': self.fetch_wearable(),
            'calendar': self.fetch_calendar(),
            'project': self.fetch_project(),
            'crm': self.fetch_crm(),
            'market': self.fetch_market(),
        }
        return self.collected_data
    
    def transform_to_pressures(self) -> Dict[str, float]:
        """수집된 데이터 → 노드 압력 변환"""
        pressures: Dict[str, float] = {}
        
        for node_id, config in NODE_DATA_TRANSFORMS.items():
            source = config.source
            field_name = config.field_name
            transform = config.transform
            
            if source in self.collected_data:
                data = self.collected_data[source]
                if field_name in data:
                    value = data[field_name]
                    pressure = transform(value)
                    pressures[node_id] = pressure
        
        return pressures


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통합 데이터 동기화
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SyncResult:
    """동기화 결과"""
    source: str
    success: bool
    node_updates: Dict[str, float]
    timestamp: datetime
    error: Optional[str] = None


class DataSyncManager:
    """데이터 동기화 매니저"""
    
    def __init__(self, dry_run: bool = True):
        self.collector = DataCollector(dry_run=dry_run)
        self.sync_history: List[SyncResult] = []
    
    def sync_all(self) -> List[SyncResult]:
        """전체 동기화"""
        results: List[SyncResult] = []
        
        try:
            data = self.collector.collect_all()
            pressures = self.collector.transform_to_pressures()
            
            # 소스별 결과
            for source, source_data in data.items():
                source_pressures = {
                    nid: p for nid, p in pressures.items()
                    if NODE_DATA_TRANSFORMS.get(nid, NodeDataTransform('', '', lambda x: x, '')).source == source
                }
                
                results.append(SyncResult(
                    source=source,
                    success=True,
                    node_updates=source_pressures,
                    timestamp=datetime.now(),
                ))
        
        except Exception as e:
            results.append(SyncResult(
                source='all',
                success=False,
                node_updates={},
                timestamp=datetime.now(),
                error=str(e),
            ))
        
        self.sync_history.extend(results)
        return results
    
    def get_all_pressures(self) -> Dict[str, float]:
        """모든 노드 압력 반환"""
        return self.collector.transform_to_pressures()
    
    def generate_report(self) -> str:
        """동기화 리포트 생성"""
        pressures = self.get_all_pressures()
        
        def bar(v: float) -> str:
            w = 20
            f = int(v * w)
            return '█' * f + '░' * (w - f)
        
        output = """
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 📡 AUTUS Data Sync Report                                                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 노드별 압력                                                                   ║
╠───────────────────────────────────────────────────────────────────────────────╣"""
        
        for node_id, pressure in sorted(pressures.items()):
            state = '🔴' if pressure >= 0.78 else '🟡' if pressure >= 0.5 else '🟢'
            transform = NODE_DATA_TRANSFORMS.get(node_id)
            desc = transform.description if transform else ''
            output += f"\n║ {node_id}: [{bar(pressure)}] {pressure*100:>5.1f}% {state}  {desc[:25]:<25} ║"
        
        output += """
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 마지막 동기화: """ + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + """                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝"""
        
        return output


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 테스트 함수
# ═══════════════════════════════════════════════════════════════════════════════

def test_data_collection():
    """데이터 수집 테스트"""
    print('=' * 60)
    print('📡 AUTUS Data Collection Test')
    print('=' * 60)
    
    collector = DataCollector(dry_run=True)
    
    print('\n[1] 데이터 수집 중...')
    data = collector.collect_all()
    
    for source, values in data.items():
        print(f'  {source}: {len(values)} fields')
    
    print('\n[2] 압력 변환 중...')
    pressures = collector.transform_to_pressures()
    
    print('\n[3] 노드별 압력:')
    for node_id, pressure in sorted(pressures.items()):
        bar_len = int(pressure * 20)
        bar = '█' * bar_len + '░' * (20 - bar_len)
        state = '🔴' if pressure >= 0.78 else '🟡' if pressure >= 0.5 else '🟢'
        print(f'  {node_id}: [{bar}] {pressure*100:>5.1f}% {state}')
    
    print('\n' + '=' * 60)
    print('✅ 테스트 완료')
    print('=' * 60)
    
    return pressures


if __name__ == '__main__':
    test_data_collection()
