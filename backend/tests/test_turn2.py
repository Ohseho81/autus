#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Turn 2 통합 테스트
- Z-Score 상대평가 엔진
- Google Sync 서비스
"""

import sys
import os

# 상위 디렉토리 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 70)
print("  🧪 AUTUS-PRIME Turn 2: Z-Score & Google Sync 테스트")
print("=" * 70)

# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Z-Score 엔진 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════
print("\n[1] Z-Score 상대평가 엔진 테스트...")
try:
    from core.sq_engine import SQEngine, SQInput
    
    engine = SQEngine()
    
    # 테스트 데이터 (10명)
    test_data = [
        SQInput(1, "김다이아", monthly_fee=600000, current_score=98, initial_score=70, complain_count=0),
        SQInput(2, "이플래티넘", monthly_fee=500000, current_score=92, initial_score=75, complain_count=0),
        SQInput(3, "박골드1", monthly_fee=400000, current_score=88, initial_score=80, complain_count=1),
        SQInput(4, "최골드2", monthly_fee=380000, current_score=85, initial_score=78, complain_count=1),
        SQInput(5, "정스틸1", monthly_fee=300000, current_score=78, initial_score=75, complain_count=2),
        SQInput(6, "강스틸2", monthly_fee=280000, current_score=75, initial_score=72, complain_count=2),
        SQInput(7, "조스틸3", monthly_fee=250000, current_score=70, initial_score=70, complain_count=3),
        SQInput(8, "윤아이언1", monthly_fee=200000, current_score=60, initial_score=65, complain_count=4),
        SQInput(9, "한아이언2", monthly_fee=150000, current_score=50, initial_score=60, complain_count=5),
        SQInput(10, "임아이언3", monthly_fee=100000, current_score=40, initial_score=55, complain_count=7),
    ]
    
    # Z-Score 계산
    results = engine.calculate_batch_with_zscore(test_data)
    
    print("  ✓ Z-Score 엔진: OK")
    print("\n  ┌────────────────────────────────────────────────────────────────┐")
    print("  │  순위 │ 학생명       │ Z-Score │  티어      │  백분위  │")
    print("  ├────────────────────────────────────────────────────────────────┤")
    
    for r in results:
        emoji = r.tier_metadata.get('emoji', '')
        tier_kr = r.tier_metadata.get('name_kr', r.tier)
        print(f"  │  {r.rank:2d}   │ {r.student_name:10s}  │ {r.z_score:+6.2f}  │ {emoji} {tier_kr:6s} │  {r.percentile:5.1f}%  │")
    
    print("  └────────────────────────────────────────────────────────────────┘")
    
    # 통계
    stats = engine.get_zscore_statistics(results)
    print(f"\n  📊 티어 분포:")
    for tier, data in stats['tier_distribution'].items():
        if data['count'] > 0:
            emoji = data['metadata'].get('emoji', '')
            print(f"     {emoji} {tier}: {data['count']}명 ({data['percentage']}%)")

except Exception as e:
    print(f"  ✗ Z-Score 엔진: FAILED - {e}")
    import traceback
    traceback.print_exc()

# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Google Sync 서비스 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════
print("\n" + "─" * 70)
print("\n[2] Google Sync 서비스 테스트...")
try:
    from services.google_sync import GoogleSyncManager
    
    # Mock 토큰으로 테스트
    manager = GoogleSyncManager(access_token="test_token")
    
    # 캘린더 동기화
    cal_result = manager.calendar_service.sync(days=30)
    print(f"  ✓ 캘린더 동기화: {cal_result.synced_count}건")
    print(f"    - 상담: {cal_result.consult_count}건")
    print(f"    - 항의: {cal_result.complaint_count}건")
    
    # 연락처 동기화
    contact_result = manager.contacts_service.sync()
    print(f"  ✓ 연락처 동기화: {contact_result.synced_count}건")
    
    # 엔트로피 분석
    entropy = manager.get_entropy_score()
    print(f"\n  📊 엔트로피 분석:")
    print(f"     - 총 상담: {entropy['consult_count']}건")
    print(f"     - 항의: {entropy['complain_count']}건")
    print(f"     - 긍정: {entropy['positive_count']}건")
    print(f"     - 순 엔트로피: {entropy['entropy_score']}")
    print(f"     - 권장 조치: {entropy['recommendation']}")

except Exception as e:
    print(f"  ✗ Google Sync: FAILED - {e}")
    import traceback
    traceback.print_exc()

# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요약
# ═══════════════════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("  ✅ AUTUS-PRIME Turn 2 테스트 완료!")
print("=" * 70)
print("""
  📁 Turn 2에서 추가/수정된 파일:
  
    backend/
    ├── core/
    │   ├── __init__.py
    │   └── sq_engine.py          # 교육업 특화 SQ 엔진 + Z-Score
    │
    ├── services/
    │   ├── __init__.py
    │   └── google_sync.py        # Google 캘린더/연락처 연동
    │
    └── tests/
        └── test_turn2.py         # 통합 테스트

  🎯 Z-Score 티어 기준 (정규분포):
     💎 DIAMOND  : Z ≥ 1.645 (상위 5%)
     🥇 PLATINUM : Z ≥ 1.04  (상위 15%)
     🥈 GOLD     : Z ≥ 0.52  (상위 30%)
     ⚙️  STEEL    : Z ≥ -0.5  (중위권)
     🔩 IRON     : Z < -0.5  (하위권)

  📅 Google Zero-Click 수집:
     - 캘린더: "상담", "학부모", "클레임" 키워드 일정 자동 감지
     - 연락처: 학부모 정보 자동 동기화
     - 엔트로피: 항의 횟수 자동 계산 → SQ 반영
""")
