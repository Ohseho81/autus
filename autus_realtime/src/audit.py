"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries












"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


"""
AUTUS Audit Log
===============
Append-only JSONL 감사 로그
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


def append_audit(path: str, entry: Dict[str, Any]) -> None:
    """감사 로그 추가"""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    
    entry["_ts"] = datetime.now().isoformat()
    
    with open(p, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def read_audit(path: str) -> list:
    """감사 로그 읽기"""
    p = Path(path)
    if not p.exists():
        return []
    
    entries = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))
    return entries


















