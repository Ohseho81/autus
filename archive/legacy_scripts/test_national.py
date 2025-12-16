#!/usr/bin/env python3
"""
National Meaning Layer OS v1 테스트
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 50)
print("  National Meaning Layer OS v1 TEST")
print("=" * 50)
print()

# 1. NationalVector 테스트
print("🧪 1. NationalVector")
try:
    from engines.national import NationalVector
    v = NationalVector()
    print(f"   기본: {v.to_dict()}")
    v2 = NationalVector(dir=0.8, gap=0.3)
    print(f"   커스텀: {v2.to_dict()}")
    print("   ✅ 성공")
except Exception as e:
    print(f"   ❌ 실패: {e}")
print()

# 2. Risk/Success 계산
print("🧪 2. Risk/Success 계산")
try:
    from engines.national import compute_risk, compute_success_probability, compute_j_score
    v = NationalVector(dir=0.7, force=0.6, gap=0.4, unc=0.3, tem=0.3, integ=0.6)
    print(f"   Risk: {compute_risk(v):.3f}")
    print(f"   Success: {compute_success_probability(v):.3f}")
    print(f"   J-Score: {compute_j_score(v)}")
    print("   ✅ 성공")
except Exception as e:
    print(f"   ❌ 실패: {e}")
print()

# 3. NationalKernelService
print("🧪 3. NationalKernelService")
try:
    from engines.national import NationalKernelService
    kernel = NationalKernelService("PH-KR")
    print(f"   루트: {kernel.route_code}")
    print(f"   가용 루트: {kernel.list_routes()}")
    
    events = ["HUM.APPLY.SUBMITTED", "HUM.DOC.APPROVED", "GOV.VISA.APPROVED"]
    result = kernel.apply_events(NationalVector(), events)
    print(f"   이벤트 {len(events)}개 적용 → J={result['final_j_score']}")
    print("   ✅ 성공")
except Exception as e:
    print(f"   ❌ 실패: {e}")
print()

# 4. NationalScenarioEngine
print("🧪 4. NationalScenarioEngine")
try:
    from engines.national import NationalScenarioEngine
    engine = NationalScenarioEngine()
    presets = engine.list_presets()
    print(f"   사전 정의 시나리오: {len(presets)}개")
    
    result = engine.compare_presets(["ph_kr_success", "ph_kr_fail"])
    print(f"   비교 결과:")
    for s in result["summary"]:
        print(f"     {s['id']}: J={s['j_score']}, Risk={s['risk']:.3f}")
    print("   ✅ 성공")
except Exception as e:
    print(f"   ❌ 실패: {e}")
print()

print("=" * 50)
print("  테스트 완료!")
print("=" * 50)
