"""Storage 테스트"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from core.data.collector import DataCollector
from core.data.storage import LocalStorage
from core.data.base import DataStats

def test_storage():
    print("="*60)
    print("💾 Test: Storage")
    print("="*60)
    
    collector = DataCollector()
    storage = LocalStorage("data/local_test")
    
    # 세션
    session_id = collector.start_session()
    collector.collect_code_generation(
        prompt="test",
        response="def test(): pass",
        ai_provider="anthropic",
        time_seconds=1.5,
        success=True
    )
    collector.end_session()
    
    # 저장
    storage.save_session(collector.sessions[0])
    print(f"\n✅ Session saved: {session_id[:8]}...")
    
    # 로드
    loaded = storage.load_session(session_id)
    print(f"✅ Loaded: {len(loaded['events'])} events")
    
    # Info
    info = storage.get_storage_info()
    print(f"\n📊 Storage Info:")
    print(f"  Sessions: {info['sessions_count']}")
    
    # Cleanup
    storage.clear_all()
    print("\n🧹 Cleaned up")

if __name__ == "__main__":
    print("\n🚀 AUTUS Storage Test\n")
    test_storage()
    print("\n✅ Complete!")
