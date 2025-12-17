# Safety Slot

## Purpose
CRITICAL 상황에서 인간의 오판을 차단한다.

## DONE Definition
CRITICAL 시 인간 오판 차단

## Checklist
- [x] CRITICAL 정의 (risk > 0.6)
- [x] Output/Quality/Time 자동 숨김
- [x] Recovery 강제 우선순위
- [x] GATE 강제 AMBER (Recovery < 60%)
- [x] 선택 차단 (CRITICAL 행성 클릭 불가)
- [x] ACTION LOG에 조치 기록

## Status
FILLED

## 안전 메커니즘

### 1. GATE 시스템
```javascript
function computeGate(recovery, status) {
  if (status === 'CRITICAL') return 'AMBER';  // 강제
  if (recovery < 0.30) return 'RED';
  if (recovery < 0.60) return 'AMBER';
  return 'GREEN';
}
```

### 2. CRITICAL 시 숨김
```javascript
COLLAPSE_IN_CRITICAL: ['OUTPUT', 'QUALITY', 'TIME']
```
- UI에서 해당 행성 완전히 숨김
- 선택 불가
- 유혹 제거

### 3. SLA 자동 계산
```javascript
function computeSLA(recovery, stability, cohesion, shock) {
  return {
    worker: recovery < 0.35 ? 'BREACH' : recovery < 0.50 ? 'AT_RISK' : 'OK',
    employer: (stability < 0.20 || cohesion < 0.25) ? 'AT_RISK' : 'OK',
    ops: shock > 0.75 ? 'BREACH' : shock > 0.60 ? 'AT_RISK' : 'OK',
    reg: shock > 0.85 ? 'BREACH' : 'OK'
  };
}
```

## Notes
- 2025-12-17: 슬롯 생성, FILLED 상태
- 핵심 원칙: "위기 시 Recovery에만 집중"

