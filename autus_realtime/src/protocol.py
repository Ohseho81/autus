"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None












"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None


"""
AUTUS Realtime Protocol (v0 LOCK)
=================================
WS 프로토콜 정의

메시지 타입:
- STATE_SNAPSHOT: 접속 직후 1회 (전체 상태)
- STATE_PATCH: 필요 시 (델타만)
- INPUT_APPLY: UI → 서버 (드래그 입력)
- PREDICT_RESULT: 서버 → UI (예측 결과)
- ERROR: 에러

입력 타입 (v0 고정):
- SWAP: 팀 교체
- ALLOC: 시간 배분
"""

from __future__ import annotations
from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ═══════════════════════════════════════════════════════════════════════════
# 타입 정의 (LOCK)
# ═══════════════════════════════════════════════════════════════════════════

MsgType = Literal["STATE_SNAPSHOT", "STATE_PATCH", "INPUT_APPLY", "PREDICT_RESULT", "ERROR"]
InputType = Literal["SWAP", "ALLOC"]  # v0 locked


# ═══════════════════════════════════════════════════════════════════════════
# 메타 키 (파티션)
# ═══════════════════════════════════════════════════════════════════════════

class MetaKey(BaseModel):
    """파티션 키 (industry/customer/project)"""
    industry_id: str = "GENERIC"
    customer_id: str
    project_id: str


# ═══════════════════════════════════════════════════════════════════════════
# 맵 상태
# ═══════════════════════════════════════════════════════════════════════════

class MapNode(BaseModel):
    """맵 노드 (사람 + 돈)"""
    person_id: str
    lat: float
    lng: float
    money_label: float


class MapState(BaseModel):
    """맵 상태"""
    nodes: List[MapNode] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# KPI 상태
# ═══════════════════════════════════════════════════════════════════════════

class KPIState(BaseModel):
    """KPI 상태 (3개 숫자 + 1개 리스트)"""
    net_7d_pred: float
    entropy_7d_pred: float
    velocity_7d_pred: float
    best_team_score_pred: float
    best_team: List[str]


# ═══════════════════════════════════════════════════════════════════════════
# 스냅샷 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class SnapshotPayload(BaseModel):
    """STATE_SNAPSHOT 페이로드"""
    map: Dict[str, Any]
    kpi: KPIState
    meta: MetaKey


# ═══════════════════════════════════════════════════════════════════════════
# 입력 페이로드 (드래그 → 물리 입력)
# ═══════════════════════════════════════════════════════════════════════════

class SwapPayload(BaseModel):
    """SWAP 입력: 팀 교체"""
    out: str
    in_: str = Field(alias="in")
    
    class Config:
        populate_by_name = True


class AllocDelta(BaseModel):
    """ALLOC 입력: 시간 배분 델타"""
    person_id: str
    delta_minutes: float


class InputApplyPayload(BaseModel):
    """INPUT_APPLY 페이로드"""
    input_type: InputType
    meta: MetaKey
    swap: Optional[SwapPayload] = None
    alloc: Optional[List[AllocDelta]] = None


# ═══════════════════════════════════════════════════════════════════════════
# 메시지 Envelope
# ═══════════════════════════════════════════════════════════════════════════

class Envelope(BaseModel):
    """공통 메시지 envelope"""
    type: MsgType
    ts: str
    payload: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════
# 패치 페이로드
# ═══════════════════════════════════════════════════════════════════════════

class PatchPayload(BaseModel):
    """STATE_PATCH 페이로드 (델타만)"""
    map: Optional[Dict[str, Any]] = None
    kpi: Optional[Dict[str, Any]] = None


class PredictResultPayload(BaseModel):
    """PREDICT_RESULT 페이로드"""
    kpi: KPIState
    patch: Optional[PatchPayload] = None

















