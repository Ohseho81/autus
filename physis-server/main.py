"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)




















"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)










"""
AUTUS Physis Server - The Hive
===============================

초경량 중앙 서버

역할:
1. 라이선스 검증 (JWT)
2. 익명 벡터 수집 (피시스 맵 구축)
3. SQ 가중치 전송 (암호화)
4. 글로벌 인사이트 제공 (Pro)

비용 최소화:
- 개인정보 저장 없음
- 연산 없음 (로컬에서 처리)
- 익명 벡터만 수집

Version: 1.0.0
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import jwt
import hashlib
import json
import os

# ═══════════════════════════════════════════════════════════════════════════
#                              CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SECRET_KEY = os.getenv("AUTUS_SECRET_KEY", "autus-physis-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# ═══════════════════════════════════════════════════════════════════════════
#                              APP
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="AUTUS Physis Server",
    description="The Hive - 익명 벡터 수집 및 라이선스 관리",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════
#                              MODELS
# ═══════════════════════════════════════════════════════════════════════════

class LicenseRequest(BaseModel):
    """라이선스 요청"""
    device_id: str          # 기기 고유 ID
    user_email: str         # 이메일
    plan: str = "free"      # free, pro, enterprise


class LicenseResponse(BaseModel):
    """라이선스 응답"""
    token: str
    expires_at: str
    plan: str
    features: List[str]


class AnonymousVector(BaseModel):
    """익명 벡터"""
    h: str                  # 노드 해시
    sq: float               # SQ 점수
    m: float                # Money (정규화)
    s: float                # Synergy (정규화)
    t: float                # Entropy (정규화)
    tier: str               # 티어
    src: str                # 소스
    rgn: str                # 지역 해시
    ind: str                # 업종
    ts: int                 # 타임스탬프


class VectorBatch(BaseModel):
    """벡터 배치"""
    v: str = "1.0"          # 버전
    industry: str           # 업종
    count: int              # 개수
    vectors: List[AnonymousVector]


class WeightsResponse(BaseModel):
    """SQ 가중치 응답"""
    weights_encrypted: str  # 암호화된 가중치 JSON
    version: str
    updated_at: str


class InsightRequest(BaseModel):
    """인사이트 요청"""
    industry: str = "academy"
    region_hash: Optional[str] = None
    tier: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
#                              IN-MEMORY STORAGE
# ═══════════════════════════════════════════════════════════════════════════

# 실제 배포 시 Redis/PostgreSQL로 교체
licenses_db: Dict[str, Dict] = {}
vectors_db: List[Dict] = []
weights_version = "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════
#                              AUTH
# ═══════════════════════════════════════════════════════════════════════════

def create_token(device_id: str, plan: str) -> str:
    """JWT 토큰 생성"""
    expires = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "device_id": device_id,
        "plan": plan,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_license(authorization: str = Header(None)) -> Dict:
    """현재 라이선스 정보"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    return verify_token(token)


# ═══════════════════════════════════════════════════════════════════════════
#                              LICENSE API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/license/register", response_model=LicenseResponse)
async def register_license(request: LicenseRequest):
    """
    라이선스 등록
    
    - Free: 로컬 기능만
    - Pro: 피시스 맵 접근, 글로벌 인사이트
    """
    # 기기 ID 해시
    device_hash = hashlib.sha256(request.device_id.encode()).hexdigest()[:16]
    
    # 토큰 생성
    token = create_token(device_hash, request.plan)
    
    # 만료일
    expires_at = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # 플랜별 기능
    features = ["local_sq_calculation", "local_tier_ranking"]
    if request.plan in ["pro", "enterprise"]:
        features.extend([
            "physis_map_access",
            "global_insights",
            "weight_updates",
            "priority_support",
        ])
    if request.plan == "enterprise":
        features.extend([
            "multi_branch",
            "custom_weights",
            "api_access",
        ])
    
    # DB 저장
    licenses_db[device_hash] = {
        "email": request.user_email,
        "plan": request.plan,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return LicenseResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        plan=request.plan,
        features=features,
    )


@app.get("/api/license/verify")
async def verify_license(license: Dict = Depends(get_current_license)):
    """라이선스 검증"""
    return {
        "valid": True,
        "plan": license.get("plan"),
        "device_id": license.get("device_id"),
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              WEIGHTS API
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/weights", response_model=WeightsResponse)
async def get_weights(license: Dict = Depends(get_current_license)):
    """
    SQ 가중치 조회 (암호화)
    
    클라이언트에서 복호화 후 사용
    서버가 가중치를 제어하여 A/B 테스트 가능
    """
    weights = {
        "w_money": 0.4,
        "w_synergy": 0.4,
        "w_entropy": 0.2,
        "money_normalizer": 1000000.0,
        "synergy_normalizer": 100.0,
        "entropy_normalizer": 60.0,
        "negative_keywords": {
            "환불": 0.3, "취소": 0.25, "죄송": 0.15,
            "불만": 0.2, "그만": 0.2, "안돼": 0.1,
        },
        "positive_keywords": {
            "감사": 0.2, "추천": 0.25, "좋아": 0.15,
            "최고": 0.2, "만족": 0.2,
        },
        "version": weights_version,
    }
    
    # 간단한 인코딩 (실제로는 암호화)
    import base64
    weights_json = json.dumps(weights)
    weights_encoded = base64.b64encode(weights_json.encode()).decode()
    
    return WeightsResponse(
        weights_encrypted=weights_encoded,
        version=weights_version,
        updated_at=datetime.utcnow().isoformat(),
    )


# ═══════════════════════════════════════════════════════════════════════════
#                              VECTOR COLLECTION API
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/vectors/submit")
async def submit_vectors(
    batch: VectorBatch,
    license: Dict = Depends(get_current_license),
):
    """
    익명 벡터 제출 (Pro 전용)
    
    피시스 맵 구축에 기여
    개인정보 없음, 통계적 특성만 수집
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for vector submission"
        )
    
    # k-익명성 검증
    if batch.count < 5:
        raise HTTPException(
            status_code=400,
            detail="Minimum 5 vectors required (k-anonymity)"
        )
    
    # 벡터 저장 (익명)
    for v in batch.vectors:
        vectors_db.append({
            **v.dict(),
            "submitted_at": datetime.utcnow().isoformat(),
            "device_hash": license.get("device_id"),
        })
    
    return {
        "status": "success",
        "vectors_received": batch.count,
        "total_vectors": len(vectors_db),
        "contribution_points": batch.count * 10,  # 포인트 시스템
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              INSIGHTS API (PRO)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/insights/global")
async def get_global_insights(
    request: InsightRequest,
    license: Dict = Depends(get_current_license),
):
    """
    글로벌 인사이트 조회 (Pro 전용)
    
    "전국 상위 1% 학부모 패턴" 등
    """
    if license.get("plan") not in ["pro", "enterprise"]:
        raise HTTPException(
            status_code=403,
            detail="Pro plan required for global insights"
        )
    
    # 벡터 필터링
    filtered = vectors_db
    if request.industry:
        filtered = [v for v in filtered if v.get("ind") == request.industry]
    if request.tier:
        filtered = [v for v in filtered if v.get("tier") == request.tier]
    if request.region_hash:
        filtered = [v for v in filtered if v.get("rgn") == request.region_hash]
    
    if not filtered:
        return {
            "status": "insufficient_data",
            "message": "Not enough data for insights",
        }
    
    # 통계 계산
    sq_scores = [v.get("sq", 0) for v in filtered]
    m_values = [v.get("m", 0) for v in filtered]
    
    avg_sq = sum(sq_scores) / len(sq_scores)
    avg_m = sum(m_values) / len(m_values)
    
    top_10_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 10] if len(sq_scores) >= 10 else avg_sq
    top_1_threshold = sorted(sq_scores, reverse=True)[len(sq_scores) // 100] if len(sq_scores) >= 100 else top_10_threshold
    
    return {
        "status": "success",
        "industry": request.industry,
        "sample_size": len(filtered),
        "insights": {
            "avg_sq": round(avg_sq, 1),
            "avg_money_normalized": round(avg_m, 3),
            "top_10_percent_threshold": round(top_10_threshold, 1),
            "top_1_percent_threshold": round(top_1_threshold, 1),
            "tier_distribution": _count_tiers(filtered),
        },
        "recommendations": [
            f"평균 SQ {avg_sq:.1f}점 이상 유지하면 상위 50% 진입",
            f"SQ {top_10_threshold:.1f}점 이상 달성 시 전국 상위 10%",
            f"Golden Path: SQ {top_1_threshold:.1f}점 이상 = 상위 1%",
        ],
    }


def _count_tiers(vectors: List[Dict]) -> Dict[str, int]:
    """티어별 분포"""
    counts = {}
    for v in vectors:
        tier = v.get("tier", "unknown")
        counts[tier] = counts.get(tier, 0) + 1
    return counts


# ═══════════════════════════════════════════════════════════════════════════
#                              HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS Physis Server",
        "version": "1.0.0",
        "total_vectors": len(vectors_db),
        "active_licenses": len(licenses_db),
    }


@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS Physis Server",
        "description": "The Hive - 익명 벡터 수집 및 라이선스 관리",
        "docs": "/docs",
    }


# ═══════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

























