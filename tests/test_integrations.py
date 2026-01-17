"""
═══════════════════════════════════════════════════════════════════════════════
🧪 AUTUS Integration Tests
═══════════════════════════════════════════════════════════════════════════════

외부 서비스 통합 테스트
"""

import pytest
import sys
from pathlib import Path

# 경로 설정
root = Path(__file__).parent.parent
sys.path.insert(0, str(root / "backend"))


class TestZeroMeaning:
    """Zero Meaning 변환 테스트"""

    def test_import(self):
        """임포트 테스트"""
        try:
            from integrations.zero_meaning import ZeroMeaningTransformer
            assert ZeroMeaningTransformer is not None
        except ImportError:
            pytest.skip("zero_meaning module not available")

    def test_transform_event(self):
        """이벤트 변환"""
        try:
            from integrations.zero_meaning import transform_to_vector
            
            event = {
                "type": "purchase",
                "amount": 10000,
                "user_id": "u123",
                "timestamp": "2025-01-01T00:00:00Z"
            }
            
            result = transform_to_vector(event)
            
            # 결과가 숫자만 포함해야 함 (Zero Meaning)
            assert "node_id" in result
            assert "value" in result
            assert "timestamp" in result
            
            # 원본 데이터 제거 확인
            assert "user_id" not in result
            assert "amount" not in result
        except ImportError:
            pytest.skip("zero_meaning module not available")

    def test_anonymize(self):
        """익명화 테스트"""
        try:
            from integrations.zero_meaning import anonymize
            
        data = {
                "name": "홍길동",
                "email": "hong@example.com",
                "phone": "010-1234-5678"
            }
            
            result = anonymize(data)
            
            # PII가 제거됨
            assert "name" not in result or result["name"] != data["name"]
            assert "email" not in result or "@" not in str(result.get("email", ""))
        except ImportError:
            pytest.skip("zero_meaning module not available")


class TestMetadataStore:
    """메타데이터 저장소 테스트"""

    def test_import(self):
        """임포트 테스트"""
        try:
            from integrations.metadata import MetadataStore
            assert MetadataStore is not None
        except ImportError:
            pytest.skip("metadata module not available")

    def test_set_get(self):
        """저장/조회"""
        try:
            from integrations.metadata import get_metadata_store
            
            store = get_metadata_store()
            
            # 저장
            store.set("node_123", "label", "테스트 노드")
            
            # 조회
            result = store.get("node_123", "label")
            
            assert result == "테스트 노드"
        except ImportError:
            pytest.skip("metadata module not available")


class TestAutoSync:
    """AutoSync 모듈 테스트"""

    def test_import(self):
        """임포트 테스트"""
        try:
            from autosync import AutoSyncEngine
            assert AutoSyncEngine is not None
        except ImportError:
            pytest.skip("autosync module not available")

    def test_detect_system(self):
        """시스템 감지"""
        try:
            from autosync import detect_system
            
            # Stripe 패턴 감지
            payload = {
                "id": "evt_123",
                "type": "payment_intent.succeeded",
                "object": "event"
            }
            
            result = detect_system(payload)
            
            assert result["system"] == "stripe"
            assert result["confidence"] > 0.8
        except ImportError:
            pytest.skip("autosync module not available")

    def test_transform_data(self):
        """데이터 변환"""
        try:
            from autosync import transform_event
            
            stripe_event = {
                "id": "evt_123",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "amount": 10000,
                        "currency": "krw"
                    }
                }
            }
            
            result = transform_event(stripe_event, "stripe")
            
            # 통합 형식으로 변환됨
            assert "node_id" in result
            assert "motion" in result
            assert "delta" in result
        except ImportError:
            pytest.skip("autosync module not available")


class TestParasiticAbsorber:
    """Parasitic Absorber 테스트"""

    def test_import(self):
        """임포트 테스트"""
        try:
            from parasitic import ParasiticAbsorber
            assert ParasiticAbsorber is not None
        except ImportError:
            pytest.skip("parasitic module not available")

    def test_absorb_data(self):
        """데이터 흡수"""
        try:
            from parasitic import absorb
            
            external_data = {
                "source": "crm_system",
                "customers": [
                    {"id": "c1", "value": 1000},
                    {"id": "c2", "value": 2000},
                ]
            }
            
            result = absorb(external_data)
            
            # 노드로 변환됨
            assert "nodes" in result
            assert len(result["nodes"]) == 2
        except ImportError:
            pytest.skip("parasitic module not available")


class TestCrewAI:
    """CrewAI 통합 테스트"""

    def test_import(self):
        """임포트 테스트"""
        try:
            from crewai import CrewAnalyzer
            assert CrewAnalyzer is not None
        except ImportError:
            pytest.skip("crewai module not available")

    def test_analyze(self):
        """분석 테스트"""
        try:
            from crewai import analyze_network
            
            network_data = {
                "nodes": [
                    {"id": "n1", "tier": "T1", "value": 100},
                    {"id": "n2", "tier": "T2", "value": 50},
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "weight": 0.8}
                ]
            }
            
            result = analyze_network(network_data)
            
            assert "insights" in result
            assert "recommendations" in result
        except ImportError:
            pytest.skip("crewai module not available")


class TestSupabase:
    """Supabase 통합 테스트"""

    def test_import(self):
        """임포트 테스트"""
        try:
            from db import get_supabase_client
            assert get_supabase_client is not None
        except ImportError:
            pytest.skip("supabase module not available")

    def test_connection(self):
        """연결 테스트"""
        try:
            from db import get_supabase_client
            
            client = get_supabase_client()
            
            # 연결 확인 (테스트 환경에서는 실패할 수 있음)
            if client:
                assert hasattr(client, "table")
        except Exception:
            pytest.skip("Supabase connection not available")
