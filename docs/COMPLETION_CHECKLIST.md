# AUTUS v1.0 Completion Checklist (LOCK)

> 이 체크리스트의 모든 항목이 통과되어야 v1.0 COMPLETE로 선언됩니다.

## 1. Backend API (7개 계약)

### Health & Config
- [ ] `GET /health` → 200 OK, `{ ok: true, version: "1.0.0" }`
- [ ] Response time < 100ms

### Entity
- [ ] `GET /entities` → 200 OK, Entity[] 반환
- [ ] `GET /entities?type=company` → 필터링 동작
- [ ] Response time < 200ms

### Shadow
- [ ] `GET /shadow/{id}` → 200 OK, ShadowSnapshot 반환
- [ ] `GET /shadow/INVALID` → 404 Not Found
- [ ] `planets9` 모든 값 0~1 범위
- [ ] `audit_hash` 존재 및 유효
- [ ] Response time < 150ms

### Orbit
- [ ] `GET /orbit/{id}` → 200 OK, OrbitFrames 반환
- [ ] `past`, `now`, `forecast` 배열 존재
- [ ] 결정론: 동일 입력 → 동일 출력
- [ ] Response time < 300ms

### Sim Preview
- [ ] `POST /sim/preview` → 200 OK, SimPreviewResponse 반환
- [ ] Shadow 값 불변 (격리 확인)
- [ ] `forecast` 배열이 forces에 따라 변화
- [ ] Response time < 200ms

### Events
- [ ] `GET /events/{id}?from_ts=X&to_ts=Y` → 200 OK
- [ ] 이벤트 시간순 정렬
- [ ] tags 필터링 동작

### Replay
- [ ] `GET /replay/{id}?from_ts=X&to_ts=Y` → 200 OK
- [ ] `frames` + `events` 포함
- [ ] step_ms 파라미터 동작

---

## 2. WebSocket (1개)

### Shadow Stream
- [ ] `WS /ws/shadow/{id}` 연결 성공
- [ ] 실시간 ShadowSnapshot 수신 (1Hz 이상)
- [ ] 연결 해제 후 재연결 동작
- [ ] 잘못된 entity_id → 에러 메시지

---

## 3. Frontend UI

### Lens Toggle
- [ ] Solar ↔ Cockpit 전환 동작
- [ ] 전환 시 데이터 유지

### Entity Selector
- [ ] 드롭다운에 Entity 목록 표시
- [ ] 선택 시 Shadow/Orbit 로드

### Mode Toggle
- [ ] User ↔ Admin 전환 동작
- [ ] Admin에서만 SimSliders 표시

### Solar Canvas (Three.js)
- [ ] 태양(Entity) 렌더링
- [ ] 9행성 InstancedMesh 렌더링
- [ ] 3궤도 Trail (past/now/forecast)
- [ ] ShockFX 동작 (SHOCK > 0.7)
- [ ] TransferFX 동작 (TRANSFER > 0.3)
- [ ] 60fps 유지

### Cockpit Lens
- [ ] 9개 게이지 표시
- [ ] 값에 따른 색상 변화
- [ ] Critical 알림 (<0.3)

### SimSliders (Admin)
- [ ] E/R/T/Q/MU 슬라이더 동작
- [ ] 조절 시 SimPreview 갱신

### WS Status
- [ ] LIVE/OFFLINE 표시
- [ ] 실시간 업데이트 반영

---

## 4. Performance

### Backend
- [ ] API 응답 시간 < 500ms (P95)
- [ ] WS 메시지 지연 < 100ms
- [ ] 동시 연결 100+ 지원

### Frontend
- [ ] 60fps 유지 (Chrome DevTools)
- [ ] Initial load < 3s
- [ ] Bundle size < 1MB

---

## 5. Security

### Backend
- [ ] CORS 설정 적용
- [ ] Rate limiting 동작
- [ ] 에러 메시지에 민감 정보 없음

### Frontend
- [ ] 환경 변수 노출 없음
- [ ] XSS 방어

---

## 6. Scenarios (3종)

### Normal Operation
- [ ] 30초 재생 완료
- [ ] 모든 checkpoint 통과
- [ ] UI 표시 정상 (Green)

### Delay/Bottleneck
- [ ] 45초 재생 완료
- [ ] SimPreview 개입 성공
- [ ] FRICTION 감소 확인
- [ ] UI 표시 변화 (Yellow → Green)

### Shock/Crisis
- [ ] 60초 재생 완료
- [ ] ShockFX 최대 강도 도달
- [ ] 위기 관리 후 안정화
- [ ] Critical 알림 표시

---

## 7. Documentation

- [ ] README.md 완성
- [ ] API 문서 (FastAPI /docs)
- [ ] 환경 변수 가이드
- [ ] 배포 가이드
- [ ] 시나리오 설명

---

## 8. Deployment

### Backend (Railway)
- [ ] Dockerfile 빌드 성공
- [ ] 환경 변수 설정
- [ ] Health check 통과
- [ ] HTTPS 적용

### Frontend (Cloudflare)
- [ ] Vite 빌드 성공
- [ ] 환경 변수 설정
- [ ] CDN 캐시 동작
- [ ] HTTPS 적용

---

## Sign-off

| 역할 | 이름 | 날짜 | 서명 |
|------|------|------|------|
| 개발 | | | |
| 검증 | | | |
| 승인 | | | |

---

## 완료 선언

위 체크리스트의 모든 항목이 통과되었음을 확인하고,
AUTUS v1.0을 **COMPLETE**로 선언합니다.

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              AUTUS v1.0 — COMPLETE                         ║
║                                                            ║
║         "The Operating System of Reality"                  ║
║                                                            ║
║   날짜: ____________________                               ║
║   서명: ____________________                               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```
