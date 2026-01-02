"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()












"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()


"""
AUTUS State Store
=================
상태 저장소
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional
import json
from pathlib import Path


@dataclass
class RealtimeState:
    """실시간 상태"""
    current_team: List[str] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_kpi: Dict[str, Any] = field(default_factory=dict)
    meta: Dict[str, str] = field(default_factory=dict)


class StateStore:
    """상태 저장소"""
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: Optional[RealtimeState] = None
    
    def get(self) -> Optional[RealtimeState]:
        """메모리에서 상태 가져오기"""
        return self._state
    
    def load(self) -> Optional[RealtimeState]:
        """파일에서 상태 로드"""
        if not self.path.exists():
            return None
        
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._state = RealtimeState(
                current_team=data.get("current_team", []),
                nodes=data.get("nodes", {}),
                last_kpi=data.get("last_kpi", {}),
                meta=data.get("meta", {})
            )
            return self._state
        except Exception:
            return None
    
    def save(self, state: RealtimeState) -> None:
        """상태 저장"""
        self._state = state
        self.path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(asdict(state), f, ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """상태 초기화"""
        self._state = None
        if self.path.exists():
            self.path.unlink()

















