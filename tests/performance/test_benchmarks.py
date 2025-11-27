"""
Comprehensive Performance Benchmarks for AUTUS

Tests performance of all major components using pytest-benchmark.
Each benchmark includes target performance and rationale.
"""

import pytest
import tempfile
import shutil
from pathlib import Path

# pytest-benchmark marker
pytestmark = pytest.mark.benchmark


class TestMemoryOSBenchmarks:
    """Benchmark Memory OS operations"""

    def test_memory_store_insert_performance(self, benchmark):
        """
        Benchmark memory store insert operation

        Target: < 10ms per insert
        Rationale: Fast preference storage is critical for user experience
        """
        from protocols.memory.store import MemoryStore

        # Use in-memory database for speed
        store = MemoryStore(":memory:")

        def insert_preference():
            import time
            start = time.perf_counter()
            store.set_preference("test_key", "test_value")
            end = time.perf_counter()
            return end - start

        result = benchmark(insert_preference)
        # Target: < 10ms
        assert result < 0.01, f"Insert took {result*1000:.2f}ms, target < 10ms"

    def test_memory_search_1000_items(self, benchmark):
        """
        Benchmark search with 1000 items

        Target: < 100ms
        Rationale: Search must remain fast even with large datasets
        """
        from protocols.memory.memory_os import MemoryOS

        # Use temporary database
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "benchmark.db"

        try:
            memory = MemoryOS(db_path=str(db_path))

            # Setup: Insert 1000 items
            for i in range(1000):
                memory.set_preference(f"key_{i}", f"value_{i}")

            def search():
                import time
                start = time.perf_counter()
                memory.search("key_500")
                end = time.perf_counter()
                return end - start

            result = benchmark(search)
            # Target: < 100ms
            assert result < 0.1, f"Search took {result*1000:.2f}ms, target < 100ms"
        finally:
            shutil.rmtree(temp_dir)

    def test_memory_export_performance(self, benchmark):
        """
        Benchmark memory export

        Target: < 200ms for 100 items
        Rationale: Export should be fast for backup/sync operations
        """
        from protocols.memory.memory_os import MemoryOS

        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "benchmark.db"
        export_path = Path(temp_dir) / "export.yaml"

        try:
            memory = MemoryOS(db_path=str(db_path))

            # Setup: Insert 100 items
            for i in range(100):
                memory.set_preference(f"key_{i}", f"value_{i}")

            def export():
                import time
                start = time.perf_counter()
                memory.export_memory(str(export_path))
                end = time.perf_counter()
                return end - start

            result = benchmark(export)
            # Target: < 200ms
            assert result < 0.2, f"Export took {result*1000:.2f}ms, target < 200ms"
        finally:
            shutil.rmtree(temp_dir)

    def test_memory_pattern_learning(self, benchmark):
        """
        Benchmark pattern learning

        Target: < 50ms per pattern
        Rationale: Pattern learning should not slow down system
        """
        from protocols.memory.memory_os import MemoryOS

        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "benchmark.db"

        try:
            memory = MemoryOS(db_path=str(db_path))

            def learn_pattern():
                import time
                start = time.perf_counter()
                memory.learn_pattern("test_pattern", {"data": "test"})
                end = time.perf_counter()
                return end - start

            result = benchmark(learn_pattern)
            # Target: < 50ms
            assert result < 0.05, f"Pattern learning took {result*1000:.2f}ms, target < 50ms"
        finally:
            shutil.rmtree(temp_dir)


class TestVectorSearchBenchmarks:
    """Benchmark Vector Search operations"""

    def test_vector_search_tfidf_calculation(self, benchmark):
        """
        Benchmark TF-IDF vector search

        Target: < 50ms for 100 documents
        Rationale: Semantic search must be fast for real-time queries
        """
        try:
            from protocols.memory.vector_search import VectorSearchEngine

            engine = VectorSearchEngine()

            # Setup: Index 100 documents
            docs = [f"Document {i} with some text content" for i in range(100)]
            for doc in docs:
                engine.add_document(doc)

            def search():
                return engine.search("document text", top_k=5)

            result = benchmark(search)
            # Target: < 50ms
            assert result < 0.05, f"TF-IDF search took {result*1000:.2f}ms, target < 50ms"
        except ImportError:
            pytest.skip("VectorSearchEngine not available")

    def test_vector_search_1000_documents(self, benchmark):
        """
        Benchmark search with 1000 documents

        Target: < 200ms
        Rationale: Must scale to large document collections
        """
        try:
            from protocols.memory.vector_search import VectorSearchEngine

            engine = VectorSearchEngine()

            # Setup: Index 1000 documents
            for i in range(1000):
                engine.add_document(f"Document {i} with content")

            def search():
                return engine.search("content", top_k=10)

            result = benchmark(search)
            # Target: < 200ms
            assert result < 0.2, f"Search took {result*1000:.2f}ms, target < 200ms"
        except ImportError:
            pytest.skip("VectorSearchEngine not available")

    def test_vector_indexing_performance(self, benchmark):
        """
        Benchmark document indexing

        Target: < 10ms per document
        Rationale: Fast indexing enables real-time updates
        """
        try:
            from protocols.memory.vector_search import VectorSearchEngine

            engine = VectorSearchEngine()

            def index_document():
                engine.add_document("Test document with content")

            result = benchmark(index_document)
            # Target: < 10ms
            assert result < 0.01, f"Indexing took {result*1000:.2f}ms, target < 10ms"
        except ImportError:
            pytest.skip("VectorSearchEngine not available")


class TestIdentityBenchmarks:
    """Benchmark Identity operations"""

    def test_identity_surface_evolution(self, benchmark):
        """
        Benchmark identity surface evolution

        Target: < 20ms per pattern
        Rationale: Identity must evolve quickly to track behavior
        """
        from protocols.identity.core import IdentityCore

        identity = IdentityCore("test_seed")
        identity.create_surface()

        pattern = {
            'type': 'test_pattern',
            'data': 'test_data',
            'context': {}
        }

        def evolve():
            import time
            start = time.perf_counter()
            identity.evolve_surface(pattern)
            end = time.perf_counter()
            return end - start

        result = benchmark(evolve)
        # Target: < 20ms
        assert result < 0.02, f"Evolution took {result*1000:.2f}ms, target < 20ms"

    def test_identity_context_representation(self, benchmark):
        """
        Benchmark context representation

        Target: < 1ms per call
        Rationale: Context switching must be instant
        """
        from protocols.identity.core import IdentityCore

        identity = IdentityCore("test_seed")
        surface = identity.create_surface()

        def get_context():
            import time
            start = time.perf_counter()
            surface.get_context_representation("work")
            end = time.perf_counter()
            return end - start

        result = benchmark(get_context)
        # Target: < 1ms
        assert result < 0.001, f"Context representation took {result*1000:.2f}ms, target < 1ms"

    def test_identity_export_import(self, benchmark):
        """
        Benchmark identity export/import cycle

        Target: < 50ms
        Rationale: Fast sync is essential for multi-device identity
        """
        from protocols.identity.core import IdentityCore

        identity = IdentityCore("test_seed")
        identity.create_surface()

        # Evolve surface 50 times
        for i in range(50):
            identity.evolve_surface({'type': f'pattern_{i}'})

        def export_import():
            import time
            start = time.perf_counter()
            exported = identity.export_to_dict()
            IdentityCore.from_dict(exported)
            end = time.perf_counter()
            return end - start

        result = benchmark(export_import)
        # Target: < 50ms
        assert result < 0.05, f"Export/import took {result*1000:.2f}ms, target < 50ms"

    def test_identity_core_hash_generation(self, benchmark):
        """
        Benchmark core hash generation

        Target: < 1ms
        Rationale: Hash generation is used frequently
        """
        from protocols.identity.core import IdentityCore

        def create_identity():
            import time
            start = time.perf_counter()
            IdentityCore("test_seed")
            end = time.perf_counter()
            return end - start

        result = benchmark(create_identity)
        # Target: < 1ms
        assert result < 0.001, f"Hash generation took {result*1000:.2f}ms, target < 1ms"


class TestAuthBenchmarks:
    """Benchmark Auth/QR Sync operations"""

    def test_qr_code_generation(self, benchmark):
        """
        Benchmark QR code generation

        Target: < 100ms
        Rationale: QR codes must generate quickly for device sync
        """
        try:
            from protocols.auth.qr_sync import QRCodeGenerator
            from protocols.identity.core import IdentityCore

            identity = IdentityCore("test_seed")
            identity.create_surface()
            identity_data = identity.export_to_dict()

            generator = QRCodeGenerator()

            def generate_qr():
                import time
                start = time.perf_counter()
                generator.generate_identity_qr(identity_data)
                end = time.perf_counter()
                return end - start

            result = benchmark(generate_qr)
            # Target: < 100ms
            assert result < 0.1, f"QR generation took {result*1000:.2f}ms, target < 100ms"
        except ImportError:
            pytest.skip("QRCodeGenerator not available")

    def test_device_sync_preparation(self, benchmark):
        """
        Benchmark sync data preparation

        Target: < 50ms
        Rationale: Sync preparation should be fast
        """
        try:
            from protocols.auth.qr_sync import DeviceSync
            from protocols.identity.core import IdentityCore

            identity = IdentityCore("test_seed")
            identity.create_surface()

            sync = DeviceSync(identity)

            def prepare():
                import time
                start = time.perf_counter()
                sync.generate_sync_qr()
                end = time.perf_counter()
                return end - start

            result = benchmark(prepare)
            # Target: < 50ms
            assert result < 0.05, f"Sync preparation took {result*1000:.2f}ms, target < 50ms"
        except ImportError:
            pytest.skip("DeviceSync not available")

    def test_qr_code_scanning(self, benchmark):
        """
        Benchmark QR code scanning

        Target: < 200ms
        Rationale: Scanning should be fast for good UX
        """
        try:
            from protocols.auth.qr_sync import QRCodeGenerator, QRCodeScanner
            from protocols.identity.core import IdentityCore
            import tempfile

            identity = IdentityCore("test_seed")
            identity_data = identity.export_to_dict()

            generator = QRCodeGenerator()
            qr_image = generator.generate_identity_qr(identity_data)

            temp_dir = tempfile.mkdtemp()
            qr_path = Path(temp_dir) / "test_qr.png"
            qr_image.save(str(qr_path))

            try:
                scanner = QRCodeScanner()

                def scan():
                    return scanner.scan_from_image(str(qr_path))

                result = benchmark(scan)
                # Target: < 200ms
                assert result < 0.2, f"QR scanning took {result*1000:.2f}ms, target < 200ms"
            finally:
                shutil.rmtree(temp_dir)
        except ImportError:
            pytest.skip("QRCodeScanner not available")


class TestWorkflowBenchmarks:
    """Benchmark Workflow operations"""

    def test_workflow_validation(self, benchmark):
        """
        Benchmark workflow graph validation

        Target: < 50ms for 20 nodes
        Rationale: Validation must be fast for large workflows
        """
        from protocols.workflow.standard import WorkflowGraph

        def validate():
            import time
            graph = WorkflowGraph()
            for i in range(20):
                graph.add_node(f"node_{i}", node_type="task")
            for i in range(19):
                graph.add_edge(f"node_{i}", f"node_{i+1}")
            start = time.perf_counter()
            graph.validate()
            end = time.perf_counter()
            return end - start

        result = benchmark(validate)
        # Target: < 50ms
        assert result < 0.05, f"Validation took {result*1000:.2f}ms, target < 50ms"

    def test_workflow_serialization(self, benchmark):
        """
        Benchmark workflow JSON serialization

        Target: < 10ms
        Rationale: Fast serialization enables efficient storage/transmission
        """
        from protocols.workflow.standard import WorkflowGraph

        graph = WorkflowGraph()
        for i in range(10):
            graph.add_node(f"node_{i}", node_type="task")
        for i in range(9):
            graph.add_edge(f"node_{i}", f"node_{i+1}")

        def serialize():
            import time
            start = time.perf_counter()
            graph.to_json()
            end = time.perf_counter()
            return end - start

        result = benchmark(serialize)
        # Target: < 10ms
        assert result < 0.01, f"Serialization took {result*1000:.2f}ms, target < 10ms"

    def test_workflow_deserialization(self, benchmark):
        """
        Benchmark workflow JSON deserialization

        Target: < 10ms
        Rationale: Fast deserialization enables quick loading
        """
        from protocols.workflow.standard import WorkflowGraph

        graph = WorkflowGraph()
        for i in range(10):
            graph.add_node(f"node_{i}", node_type="task")
        for i in range(9):
            graph.add_edge(f"node_{i}", f"node_{i+1}")
        json_str = graph.to_json()

        def deserialize():
            import time
            start = time.perf_counter()
            WorkflowGraph.from_json(json_str)
            end = time.perf_counter()
            return end - start

        result = benchmark(deserialize)
        # Target: < 10ms
        assert result < 0.01, f"Deserialization took {result*1000:.2f}ms, target < 10ms"


class TestARMPBenchmarks:
    """Benchmark ARMP operations"""

    def test_armp_detect_all_risks(self, benchmark):
        """
        Benchmark detection of all risks

        Target: < 1s for all 30 risks
        Rationale: Risk detection must complete quickly for real-time monitoring
        """
        try:
            from core.armp.enforcer import ARMPEnforcer

            enforcer = ARMPEnforcer()

            def detect_all():
                import time
                start = time.perf_counter()
                enforcer.detect_violations()
                end = time.perf_counter()
                return end - start

            result = benchmark(detect_all)
            # Target: < 1 second
            assert result < 1.0, f"Risk detection took {result:.2f}s, target < 1s"
        except ImportError:
            pytest.skip("ARMPEnforcer not available")

    def test_armp_prevent_all_risks(self, benchmark):
        """
        Benchmark prevention for all risks

        Target: < 500ms
        Rationale: Prevention measures must be fast to not impact performance
        """
        try:
            from core.armp.enforcer import ARMPEnforcer

            enforcer = ARMPEnforcer()

            def prevent_all():
                import time
                start = time.perf_counter()
                enforcer.prevent_all()
                end = time.perf_counter()
                return end - start

            result = benchmark(prevent_all)
            # Target: < 500ms
            assert result < 0.5, f"Risk prevention took {result*1000:.2f}ms, target < 500ms"
        except ImportError:
            pytest.skip("ARMPEnforcer not available")

    def test_armp_risk_registration(self, benchmark):
        """
        Benchmark risk registration

        Target: < 1ms per risk
        Rationale: Risk registration happens at startup
        """
        try:
            from core.armp.enforcer import ARMPEnforcer, Risk, RiskCategory, Severity

            def register_risk():
                import time
                enforcer = ARMPEnforcer()
                risk = Risk(
                    name="Test Risk",
                    category=RiskCategory.SECURITY,
                    severity=Severity.HIGH,
                    description="Test",
                    prevention=lambda: None,
                    detection=lambda: False,
                    response=lambda: None,
                    recovery=lambda: None
                )
                start = time.perf_counter()
                enforcer.register_risk(risk)
                end = time.perf_counter()
                return end - start

            result = benchmark(register_risk)
            # Target: < 1ms
            assert result < 0.001, f"Risk registration took {result*1000:.2f}ms, target < 1ms"
        except ImportError:
            pytest.skip("ARMPEnforcer not available")


class TestLoadTests:
    """Load tests for high-volume scenarios"""

    def test_memory_os_load_10000_items(self, benchmark):
        """
        Load test: 10,000 items

        Target: < 5s for bulk insert
        Rationale: System must handle large datasets efficiently
        """
        from protocols.memory.memory_os import MemoryOS

        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "load_test.db"

        try:
            memory = MemoryOS(db_path=str(db_path))

            def bulk_insert():
                import time
                start = time.perf_counter()
                for i in range(10000):
                    memory.set_preference(f"key_{i}", f"value_{i}")
                end = time.perf_counter()
                return end - start

            result = benchmark(bulk_insert)
            # Target: < 5 seconds
            assert result < 5.0, f"Bulk insert took {result:.2f}s, target < 5s"
        finally:
            shutil.rmtree(temp_dir)

    def test_concurrent_identity_evolution(self, benchmark):
        """
        Load test: Concurrent evolution

        Target: < 2s for 100 patterns
        Rationale: Identity must handle rapid pattern updates
        """
        from protocols.identity.core import IdentityCore

        identity = IdentityCore("test_seed")
        identity.create_surface()

        def evolve_100_times():
            import time
            start = time.perf_counter()
            for i in range(100):
                identity.evolve_surface({'type': f'pattern_{i}'})
            end = time.perf_counter()
            return end - start

        result = benchmark(evolve_100_times)
        # Target: < 2 seconds
        assert result < 2.0, f"100 evolutions took {result:.2f}s, target < 2s"

    def test_workflow_large_graph_validation(self, benchmark):
        """
        Load test: Large workflow graph

        Target: < 500ms for 100 nodes
        Rationale: Must validate large workflows quickly
        """
        from protocols.workflow.standard import WorkflowGraph

        # Create graph with 100 nodes and edges using API
        def validate():
            import time
            graph = WorkflowGraph()
            for i in range(100):
                graph.add_node(f"node_{i}", node_type="task")
            for i in range(99):
                graph.add_edge(f"node_{i}", f"node_{i+1}")
            start = time.perf_counter()
            # Simulate validation (if method exists, call it; else, just traverse)
            if hasattr(graph, 'validate'):
                graph.validate()
            else:
                # Traverse all nodes and edges
                for node_id in graph.nodes:
                    graph.neighbors(node_id)
            end = time.perf_counter()
            return end - start

        result = benchmark(validate)
        # Target: < 500ms
        assert result < 0.5, f"Large graph validation took {result*1000:.2f}ms, target < 500ms"

    def test_memory_search_large_dataset(self, benchmark):
        """
        Load test: Search in large dataset

        Target: < 500ms for 10,000 items
        Rationale: Search must remain fast with very large datasets
        """
        from protocols.memory.memory_os import MemoryOS

        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "large_search.db"

        try:
            memory = MemoryOS(db_path=str(db_path))

            # Setup: Insert 10,000 items
            for i in range(10000):
                memory.set_preference(f"key_{i}", f"value_{i}")

            def search():
                import time
                start = time.perf_counter()
                memory.search("key_5000")
                end = time.perf_counter()
                return end - start

            result = benchmark(search)
            # Target: < 500ms
            assert result < 0.5, f"Large dataset search took {result*1000:.2f}ms, target < 500ms"
        finally:
            shutil.rmtree(temp_dir)


# Benchmark configuration
@pytest.fixture(scope="session")
def benchmark_config():
    """Configure benchmark parameters"""
    return {
        'warmup': True,
        'warmup_iterations': 3,
        'min_rounds': 5,
        'max_time': 1.0
    }


if __name__ == "__main__":
    pytest.main([__file__, "--benchmark-only", "--benchmark-autosave", "-v"])
