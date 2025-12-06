#!/usr/bin/env python3
"""
AUTUS Database Optimization Script
Applies all database optimizations and generates reports.

Usage:
    python scripts/optimize_db.py
    python scripts/optimize_db.py --report
    python scripts/optimize_db.py --analyze
"""

import sys
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from evolved.database_optimizer import DatabaseOptimizer


def main():
    parser = argparse.ArgumentParser(description="AUTUS Database Optimizer")
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generate optimization report only"
    )
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Analyze current database without optimization"
    )
    parser.add_argument(
        "--db",
        default="autus.db",
        help="Path to database file"
    )
    
    args = parser.parse_args()
    
    optimizer = DatabaseOptimizer(args.db)
    
    print("\n" + "="*70)
    print("AUTUS DATABASE OPTIMIZER")
    print("="*70 + "\n")
    
    if args.analyze:
        print("📊 Analyzing current database state...\n")
        
        # Get current statistics
        sizes = optimizer.analyze_table_sizes()
        if sizes['status'] == 'success':
            print(f"✅ Total Database Size: {sizes['total_size_mb']} MB")
            print(f"   Tables:\n")
            for table, stats in sizes['tables'].items():
                print(f"   - {table}: {stats['rows']:,} rows ({stats['estimated_size_kb']:.1f} KB)")
        
        indices = optimizer.get_index_statistics()
        if indices['status'] == 'success':
            print(f"\n🔍 Current Indices: {indices['count']}\n")
            for idx in indices['indices'][:5]:
                print(f"   - {idx['name']} on {idx['table']}")
            if len(indices['indices']) > 5:
                print(f"   ... and {len(indices['indices']) - 5} more")
        
        return
    
    if args.report:
        print("📋 Generating optimization report...\n")
        report = optimizer.generate_optimization_report()
        print(report)
        return
    
    # Full optimization flow
    print("🔧 Step 1: Optimizing PRAGMA settings...")
    result = optimizer.optimize_schema()
    if result['status'] == 'success':
        print("✅ PRAGMA optimizations applied:")
        for opt in result['optimizations']:
            print(f"   - {opt}")
    else:
        print(f"❌ Error: {result['message']}")
        return
    
    print("\n🔧 Step 2: Creating optimal indices...")
    result = optimizer.create_optimal_indices()
    if result['status'] == 'success':
        print(f"✅ Indices created: {result['created_count']}")
        if result['failed_count'] > 0:
            print(f"⚠️  Failed: {result['failed_count']}")
        print("\n   Created indices:")
        for idx in result['created'][:10]:
            print(f"   - {idx}")
        if len(result['created']) > 10:
            print(f"   ... and {len(result['created']) - 10} more")
    else:
        print(f"❌ Error: {result['message']}")
        return
    
    print("\n🔧 Step 3: Running VACUUM and ANALYZE...")
    result = optimizer.run_vacuum_and_analyze()
    if result['status'] == 'success':
        print(f"✅ Database optimized in {result['execution_time_ms']}ms")
    else:
        print(f"❌ Error: {result['message']}")
        return
    
    print("\n📊 Step 4: Generating report...")
    report = optimizer.generate_optimization_report()
    print(report)
    
    print("\n" + "="*70)
    print("✅ DATABASE OPTIMIZATION COMPLETE")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
