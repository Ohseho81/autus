# AUTUS Kernel Definition (10줄)

```python
# AUTUS KERNEL v1.0 - HARD LOCK

S_core = [stability, pressure, drag, momentum, volatility, recovery]  # 6축 물리 상태
S_display = [E, F, R]  # UI용 3축 (E=f(stab,rec), F=f(mom,drag), R=f(pres,vol))
S_ref = user_defined_reference_point  # 최적화 아님, 기준점만

FORBIDDEN = ['egress', 'recommend', 'rank', 'judge', 'optimize', 'θ_expose']
ALLOWED = ['observe', 'forecast_physics', 'display_numbers', 'log_immutable']

justice_rule = lambda action: block if (top_1_3_gains and bottom_2_3_loses) else allow
decision_owner = 'USER'  # 시스템은 예측만, 결정은 사용자

output = {
    'numbers': True, 'waveforms': True, 'colors_direction': True,
    'text_judgment': False, 'advice': False, 'recommendation': False
}
```

---

## Quick Reference

| 개념 | 정의 |
|------|------|
| **S_core** | 6축 물리 상태 벡터 (내부) |
| **S_display** | 3축 요약 벡터 (UI) |
| **S_ref** | 사용자 기준점 (Goal ❌) |
| **ΔS/Δt** | 상태 변화율 (Loss ❌) |
| **Justice** | 2/3 Rule 자동 적용 |
| **Decision** | USER가 함 (System ❌) |

---

## Hard Constraints

```
NO EGRESS      → 외부 전송 금지
NO θ           → 파라미터 노출 금지  
NO RECOMMEND   → 추천 금지
NO JUDGE       → 판단 금지
LOCAL ONLY     → 로컬 전용
DETERMINISTIC  → 동일 입력 = 동일 출력
```

---

## Physics Map

```
Nodes  = Person only
Motion = CU (money)
Field  = Authority (overlay, not node)
```

---

## UI Rule

```
✅ 숫자, 파형, 색상(방향)
❌ "좋다/나쁘다", 조언, 추천
```

---

**이 파일이 AUTUS의 전부다. 이외의 것은 이 파일에 위배되면 안 된다.**







