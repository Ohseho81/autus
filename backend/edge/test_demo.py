"""
Arbutus Edge Kernel + Hexagon Map 통합 데모
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from edge.kernel import (
    ArbutusEdgeKernel, TableSchema, FieldSchema, DataType,
    generate_test_logs
)
from edge.hexagon_map import HexagonMapEngine
import time


def test_edge_hexagon_demo():
    """Edge Kernel → Hexagon Map 통합 테스트"""
    print("=" * 80)
    print("  Arbutus Edge → Hexagon Map Demo")
    print("=" * 80)
    
    # 커널 초기화
    kernel = ArbutusEdgeKernel(max_workers=4)
    kernel.metrics.start()
    
    # 스키마 정의
    schema = TableSchema(
        name="logs",
        fields=[
            FieldSchema("id", DataType.INTEGER, primary_key=True),
            FieldSchema("timestamp", DataType.DATETIME),
            FieldSchema("category", DataType.STRING, indexed=True),
            FieldSchema("vendor", DataType.STRING, indexed=True),
            FieldSchema("amount", DataType.CURRENCY),
        ]
    )
    
    kernel.create_table("logs", schema)
    
    # 데이터 생성 및 로드
    print("\n[1] 데이터 생성 및 로드")
    record_count = 10000  # 테스트용 1만 건
    logs = generate_test_logs(record_count)
    load_result = kernel.load_data("logs", logs)
    print(f"  → {load_result['throughput']:,.0f} records/sec")
    
    # 이상 탐지
    print("\n[2] 이상 탐지 실행")
    duplicates = kernel.execute("DUPLICATES", "logs", fields=["vendor", "amount"])
    outliers = kernel.execute("OUTLIERS", "logs", field="amount", method="zscore", threshold=3.0)
    benford = kernel.execute("BENFORD", "logs", field="amount")
    
    print(f"  → DUPLICATES: {len(duplicates)} patterns")
    print(f"  → OUTLIERS: {len(outliers)} found")
    print(f"  → BENFORD: {benford['conformity']}")
    
    # 헥사곤 매핑
    print("\n[3] 헥사곤 맵 매핑")
    hex_engine = HexagonMapEngine(radius=200)
    viz_data = hex_engine.process_kernel_results(
        duplicates=duplicates,
        outliers=outliers,
        benford=benford
    )
    
    print(f"  → Total anomalies: {viz_data['stats']['total']}")
    print(f"  → Processing time: {viz_data['stats']['processing_ms']:.1f}ms")
    
    # 영역별 요약
    print(f"\n[4] Hexagon Regions:")
    for region in viz_data['regions']:
        if region['anomaly_count'] > 0:
            print(f"  {region['physics']:12} │ {region['anomaly_count']:4} anomalies │ "
                  f"Severity: {region['avg_severity']:.2f} │ {region['risk_level']}")
    
    kernel.close()
    
    print("\n" + "=" * 80)
    print("  ✅ 통합 테스트 완료")
    print("=" * 80)
    
    return viz_data


if __name__ == "__main__":
    test_edge_hexagon_demo()

