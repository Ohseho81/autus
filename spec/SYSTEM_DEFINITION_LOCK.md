# AUTUS — FINAL SYSTEM DEFINITION [LOCK]

> **Version:** v1.0  
> **Date:** 2025-12-18  
> **Status:** 🔒 LOCKED

---

## 1. 시스템 철학

```
"목표를 바꾸지 않고 나를 변형시킨다"
```

AUTUS는 사용자의 물리적 상태를 관측하고 조정하는 시스템입니다.
- **판단 없음**: 모든 상태는 중립적 물리량
- **추천 없음**: 시스템은 결과만 보여주고 선택은 사용자의 몫
- **물리만 존재**: 감정/판단 언어 대신 Energy, Mass, Density, Sigma

---

## 2. 3페이지 구조

### Page 1 — Goal Calibration (목표 설정)
**본질:** 고정된 목표 대비 자신의 물리적 상태를 관측하고 역량을 조정

| 기능 | 설명 |
|------|------|
| Core Node | 중앙 구체 (Density/Stability/Entropy 반영) |
| Trajectory Arc | 미래 궤적 투영 (실선=LIVE, 점선=SIM) |
| Mass Modifier | 자기 역량 조정 슬라이더 |
| Volume Override | 목표 압축 관측 |
| Horizon Shift | 시간 지평 조정 (H1~D180) |

### Page 2 — Route / Topology (노선 조정)
**본질:** 개체들의 질량을 조정하여 에너지가 목표로 흐르는 최적의 중력장 형성

| 기능 | 설명 |
|------|------|
| Self-Anchor Node | 사용자 위치 고정 노드 |
| Entity Nodes | 주변 개체 (크기=Mass, 진동=σ) |
| Geodesic Path | 중력 상호작용 경로 |
| Node Mass Scaling | 노드 질량 증감 |
| Node Delete/Inject | 노드 제거/추가 |
| Flow Filter | 연결 강도 필터링 |

### Page 3 — Mandala Investment (물리량 변화)
**본질:** 한정된 자원을 8개의 물리 함수 슬롯에 배분하여 Core 변형

| 슬롯 | 방향 | 물리 효과 |
|------|------|----------|
| Constraint | N | Volume 수축 → Density 상승 |
| Risk | NE | σ 증가, 시스템 노이즈 |
| Energy | E | 절대 동력 공급 |
| Leak | SE | 에너지 누수 조정 |
| Pattern | S | Stability 강화 |
| Drag | SW | 마찰력 조정 |
| Connection | W | Flow Rate 조정 |
| Constraint | NW | Pressure 제어 |

---

## 3. API 엔드포인트

| Endpoint | Method | 용도 |
|----------|--------|------|
| `/state` | GET | 현재 물리 상태 조회 |
| `/draft/update` | POST | SIM 모드 임시 업데이트 |
| `/commit` | POST | Draft → LIVE 확정 전이 |
| `/replay/marker` | POST | 불변의 Hash Chain 생성 |

### Commit Pipeline (LOCKED ORDER)
```
STAGE 1: Page 3 (Mandala Transform)
STAGE 2: Page 1 (Mass/Volume)
STAGE 3: Page 2 (NodeOps)
STAGE 4: Kernel Recalc (Density/Stability)
STAGE 5: Forecast Update
STAGE 6: Finalize Marker
```

---

## 4. 핵심 물리 공식

```
Density    = Mass / Volume
Stability  = 1 - σ
P_outcome  = f(Density, Stability, Horizon)
```

### Lerp 감쇠 계수
| 변수 | Alpha |
|------|-------|
| Allocation | 0.08 |
| Mass | 0.12 |
| Volume | 0.10 |
| Node | 0.15 |

---

## 5. 결정론 보장 메커니즘

1. **canonical_json**: `sort_keys=True, separators=(",", ":")`
2. **round_f**: 모든 float 6자리 반올림
3. **fixed_pipeline_order**: STAGE 순서 고정
4. **sorted_ops**: `t_ms`, `op_id` 순 정렬
5. **SHA256 Hash Chain**: 재현 가능한 상태 기록

---

## 6. 데이터 소유권 & 보안

| 원칙 | 내용 |
|------|------|
| 저장 위치 | LOCAL_ONLY (사용자 디바이스) |
| 클라우드 동기화 | ❌ 금지 |
| 제3자 접근 | ❌ 금지 |
| 내보내기 | JSON/CSV (AES-256 암호화) |
| 삭제 권리 | 완전 삭제 보장 |

---

## 7. 금지 사항

- ❌ 판단/추천 언어 사용
- ❌ 타인의 물리량 추적/감시
- ❌ 외부 시스템과 데이터 공유
- ❌ 광고/마케팅 목적 데이터 활용
- ❌ AI 학습 데이터로의 전용

---

## 8. 파일 구조

```
autus/
├── spec/
│   ├── tokens.autus.json      # 디자인 토큰
│   ├── state_contract.json    # 상태 계약
│   ├── api_spec.json          # API 명세
│   ├── ethics_security.json   # 윤리/보안 규칙
│   └── SYSTEM_DEFINITION_LOCK.md
├── frontend/
│   ├── autus-page1.html       # Goal Calibration
│   ├── autus-page2.html       # Route / Topology
│   └── autus-page3.html       # Mandala Investment
└── kernel_service/
    └── app/
        ├── autus_state.py
        ├── commit_pipeline.py
        ├── validators.py
        └── main.py
```

---

## 9. LOCK STATUS

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔒 AUTUS SYSTEM DEFINITION v1.0                            ║
║                                                               ║
║   STATUS: LOCKED                                              ║
║   DATE: 2025-12-18                                            ║
║                                                               ║
║   이 문서의 모든 사양은 확정되었으며,                        ║
║   변경 시 새로운 버전 번호가 필요합니다.                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

**[END OF SPECIFICATION]**





