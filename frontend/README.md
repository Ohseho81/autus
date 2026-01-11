# AUTUS Physics Map - React Frontend

> 🗺️ **Multi-Scale Physics Map** - deck.gl + Mapbox 기반 Keyman 탐색 시각화

## 📱 반응형 지원

| 디바이스 | 지원 | 최적화 |
|----------|------|--------|
| Desktop | ✅ | 전체 기능 |
| Tablet | ✅ | 사이드바 축소 |
| Mobile | ✅ | 하단 네비게이션 |

## 🚀 Quick Start

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp env.template .env
# .env 파일에서 VITE_MAPBOX_TOKEN 설정

# 3. 개발 서버 실행
npm run dev

# 4. 빌드
npm run build
```

## 📁 프로젝트 구조

```
frontend-react/
├── src/
│   ├── api/
│   │   └── client.ts           # API 클라이언트 (Scale, Flow, Keyman)
│   ├── components/
│   │   ├── Map/
│   │   │   ├── PhysicsMap.tsx  # 메인 지도 컴포넌트
│   │   │   ├── MapControls.tsx # 줌/레이어 컨트롤
│   │   │   └── MapLegend.tsx   # 범례
│   │   ├── Node/
│   │   │   ├── NodeDetailPanel.tsx  # 노드 상세 패널
│   │   │   ├── NodeStats.tsx        # 노드 통계
│   │   │   ├── NodeConnections.tsx  # 연결 목록
│   │   │   └── NodeTooltip.tsx      # 호버 툴팁
│   │   ├── Flow/
│   │   │   ├── FlowLine.tsx         # 흐름 선
│   │   │   └── FlowAnimation.tsx    # 애니메이션 레이어
│   │   └── PathFinder/
│   │       ├── PathFinderPanel.tsx  # 경로 탐색 UI
│   │       └── PathResult.tsx       # 경로 결과
│   ├── hooks/
│   │   ├── useMapData.ts       # 지도 데이터 로드
│   │   ├── useScale.ts         # 줌 ↔ 스케일 매핑
│   │   ├── useFlow.ts          # 흐름 애니메이션
│   │   └── usePathFinder.ts    # 경로 탐색
│   ├── types/
│   │   └── index.ts            # TypeScript 타입 정의
│   ├── styles/
│   │   └── index.css           # Tailwind + 커스텀 스타일
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── env.template
```

## 🗺️ 스케일 레벨

| Level | Zoom | 설명 | KI 공식 |
|-------|------|------|---------|
| **L0** | 0-3 | World (국가/기관) | GDP × Trade × Diplomatic |
| **L1** | 4-6 | Country (도시/재벌) | City_GDP × Inter_City × Political |
| **L2** | 7-10 | City (구역/기업) | District × Business × Local |
| **L3** | 11-14 | District (건물/인물) | C × F × RV |
| **L4** | 15+ | Block (개인) | C × F × RV |

## 🎨 주요 기능

### 1. 노드 시각화
- **크기**: KI Score 기반
- **색상**: Rank 기반 (Sovereign=Gold, Archon=Silver, ...)
- **호버**: 상세 정보 툴팁
- **클릭**: 상세 패널

### 2. 흐름 시각화
- **두께**: 금액 로그 스케일
- **색상**: 금액별 그라데이션 ($100B+=Gold, $10B+=Red, ...)
- **애니메이션**: 파티클 이동 효과

### 3. 경로 탐색
- **검색**: 출발/도착 노드 선택
- **결과**: 최단 경로 + 병목 구간 표시
- **하이라이트**: 경로 골드 색상 강조

### 4. 계층 네비게이션
- **Zoom In**: 하위 레벨 노드 로드
- **Zoom Out**: 상위 레벨로 이동
- **드릴다운**: 노드 클릭 시 하위 탐색

## 🔧 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000/api` |
| `VITE_MAPBOX_TOKEN` | Mapbox Access Token | (필수) |

## 📡 API 엔드포인트

### Scale API
- `GET /api/scale/{level}/nodes` - 레벨별 노드 조회
- `GET /api/scale/node/{id}` - 노드 상세
- `GET /api/scale/node/{id}/children` - 하위 노드
- `GET /api/scale/node/{id}/parent` - 상위 노드

### Flow API
- `GET /api/flow/all` - 전체 흐름
- `GET /api/flow/node/{id}/all` - 노드별 흐름
- `GET /api/flow/path/{source}/{target}` - 경로 탐색

### Keyman API
- `GET /api/keyman/top/{n}` - Top N Keyman
- `GET /api/keyman/{id}/impact` - 네트워크 영향도

## 🛠️ 기술 스택

- **React 18** + TypeScript
- **deck.gl** - WebGL 지도 레이어
- **react-map-gl** - Mapbox 통합
- **Tailwind CSS** - 스타일링
- **Axios** - API 클라이언트
- **Vite** - 빌드 도구

## 📝 라이선스

MIT License

