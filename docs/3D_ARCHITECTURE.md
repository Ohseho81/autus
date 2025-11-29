# AUTUS 3D Triple Sphere Architecture

## 개요

AUTUS는 3중 구(Triple Sphere) 아키텍처로 시각화됩니다.

## 3개 Layer

| Layer | 이름 | 반지름 | 노드 | 색상 | 역할 |
|-------|------|--------|------|------|------|
| 1 | Core Sphere | 2 | 12 | 빨강 | OS 커널 (불변) |
| 2 | Protocol Sphere | 5 | 12 | 시안 | 표준 프로토콜 |
| 3 | Pack Sphere | 10 | 47 | 노랑 | 확장 기능 |

## 총 71개 노드

- Layer 1: 12 Kernels (Core)
- Layer 2: 12 Protocols
- Layer 3: 47 Packs

## API

- GET /api/3d/state - 전체 상태
- GET /api/3d/stats - 통계
- WS /stream - 실시간

## 시각화

http://localhost:8000/static/triple_sphere.html
