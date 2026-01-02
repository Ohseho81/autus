#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 AUTUS API - 단일 진입점

모든 API 요청의 시작점
레이 달리오: "단순함이 명확함이다"
스티브 잡스: "하나의 버튼으로 모든 것을"
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from machine.core.config import ENV


# ═══════════════════════════════════════════════════════════════════
# 앱 초기화
# ═══════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 이벤트"""
    print("🚀 AUTUS API Starting...")
    print(f"   Debug: {ENV.DEBUG}")
    print(f"   Port: {ENV.API_PORT}")
    yield
    print("👋 AUTUS API Shutting down...")


app = FastAPI(
    title="AUTUS API",
    description="인간관계의 물리학",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════
# 라우트
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "ok",
        "service": "AUTUS",
        "version": "1.0.0",
        "principles": "/principles",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """상세 헬스 체크"""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: 실제 체크
        "redis": "connected",     # TODO: 실제 체크
    }


@app.get("/principles")
async def principles():
    """시스템 원칙 요약"""
    return {
        "constitution": "인간관계의 ROI를 측정 가능하게 만든다",
        "laws": [
            "L1: SQ = (Mint - Burn) / Time × Synergy",
            "L2: BaseRate = SOLO → ROLE_BUCKET → ALL",
            "L3: TeamScore = Σ(SQ) + γ×Synergy - Penalty",
            "L4: Entropy = Burn / Mint",
        ],
        "thresholds": {
            "entropy_good": 0.15,
            "entropy_warn": 0.25,
            "entropy_bad": 0.30,
        }
    }


# ═══════════════════════════════════════════════════════════════════
# API 라우터 등록
# ═══════════════════════════════════════════════════════════════════

# TODO: 라우터 분리 시 활성화
# from .routes import auth, nodes, analytics, actions
# app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(nodes.router, prefix="/api/nodes", tags=["Nodes"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(actions.router, prefix="/api/actions", tags=["Actions"])


# ═══════════════════════════════════════════════════════════════════
# 임시 API (MVP)
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/kpi")
async def get_kpi():
    """현재 KPI 조회"""
    # TODO: 실제 데이터 연동
    return {
        "mint_krw": 1_131_000_000,
        "burn_krw": 144_662_791,
        "net_krw": 986_337_209,
        "entropy_ratio": 0.128,
        "entropy_status": "GOOD",
        "coin_velocity": 789_123,
    }


@app.get("/api/team")
async def get_team():
    """최적 팀 조회"""
    # TODO: 실제 데이터 연동
    return {
        "team": ["P03", "P01", "P11", "P07", "P05"],
        "score": 5774444.96,
        "role_coverage": 1.0,
    }


@app.get("/api/roles")
async def get_roles():
    """역할 할당 조회"""
    # TODO: 실제 데이터 연동
    return {
        "assignments": [
            {"person_id": "P01", "primary_role": "RAINMAKER", "secondary_role": "CLOSER"},
            {"person_id": "P03", "primary_role": "CONTROLLER", "secondary_role": ""},
            {"person_id": "P05", "primary_role": "BUILDER", "secondary_role": "OPERATOR"},
            {"person_id": "P07", "primary_role": "CLOSER", "secondary_role": "CONNECTOR"},
            {"person_id": "P11", "primary_role": "CONNECTOR", "secondary_role": ""},
        ]
    }


@app.get("/api/synergy/{person_id}")
async def get_synergy(person_id: str):
    """개인 시너지 조회"""
    # TODO: 실제 데이터 연동
    return {
        "person_id": person_id,
        "top_pairs": [
            {"partner": "P03", "uplift": 0.15},
            {"partner": "P07", "uplift": 0.12},
        ],
        "negative_pairs": [
            {"partner": "P99", "uplift": -0.05},
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════

def run():
    """서버 실행"""
    uvicorn.run(
        "machine.api.main:app",
        host=ENV.API_HOST,
        port=ENV.API_PORT,
        reload=ENV.DEBUG,
    )


if __name__ == "__main__":
    run()






















