"""
AUTUS Marketplace - Pack Registry
제9법칙: 다양성 - 다양한 Pack이 공존한다

Pack 등록, 조회, 관리
"""
import yaml
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib


class PackRegistry:
    """
    Pack 레지스트리
    
    필연적 성공:
    - Pack 등록 → 검색 가능
    - 다운로드 → 사용 가능
    - 평가 → 순위 반영
    """
    
    def __init__(self, registry_path: str = "marketplace/registry.json"):
        self.registry_path = Path(registry_path)
        self.packs: Dict[str, Dict[str, Any]] = {}
        self._load()
    
    def _load(self):
        """레지스트리 로드"""
        if self.registry_path.exists():
            with open(self.registry_path) as f:
                self.packs = json.load(f)
    
    def _save(self):
        """레지스트리 저장"""
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.registry_path, 'w') as f:
            json.dump(self.packs, f, indent=2, ensure_ascii=False)
    
    def register(self, pack_path: str, author: str = "anonymous") -> Dict[str, Any]:
        """Pack 등록"""
        path = Path(pack_path)
        if not path.exists():
            raise FileNotFoundError(f"Pack not found: {pack_path}")
        
        with open(path) as f:
            pack_data = yaml.safe_load(f)
        
        name = pack_data.get("name", path.stem)
        version = pack_data.get("version", "1.0.0")
        pack_id = f"{name}@{version}"
        
        content_hash = hashlib.sha256(open(path, 'rb').read()).hexdigest()[:16]
        
        entry = {
            "id": pack_id,
            "name": name,
            "version": version,
            "description": pack_data.get("metadata", {}).get("description", ""),
            "author": author,
            "license": pack_data.get("metadata", {}).get("license", "MIT"),
            "tags": pack_data.get("metadata", {}).get("tags", []),
            "cells_count": len(pack_data.get("cells", [])),
            "hash": content_hash,
            "registered_at": datetime.utcnow().isoformat(),
            "downloads": 0,
            "rating": {"score": 0, "count": 0},
            "path": str(path)
        }
        
        self.packs[pack_id] = entry
        self._save()
        
        return entry
    
    def get(self, pack_id: str) -> Optional[Dict[str, Any]]:
        return self.packs.get(pack_id)
    
    def list_all(self) -> List[Dict[str, Any]]:
        return list(self.packs.values())
    
    def download(self, pack_id: str) -> Optional[Dict[str, Any]]:
        if pack_id in self.packs:
            self.packs[pack_id]["downloads"] += 1
            self._save()
            
            path = Path(self.packs[pack_id]["path"])
            if path.exists():
                with open(path) as f:
                    return {
                        "info": self.packs[pack_id],
                        "content": yaml.safe_load(f)
                    }
        return None
    
    def rate(self, pack_id: str, score: int) -> Optional[Dict[str, Any]]:
        if pack_id not in self.packs:
            return None
        
        score = max(1, min(5, score))
        rating = self.packs[pack_id]["rating"]
        
        total = rating["score"] * rating["count"] + score
        rating["count"] += 1
        rating["score"] = round(total / rating["count"], 2)
        
        self._save()
        return self.packs[pack_id]
    
    def delete(self, pack_id: str) -> bool:
        if pack_id in self.packs:
            del self.packs[pack_id]
            self._save()
            return True
        return False


_registry = None

def get_registry() -> PackRegistry:
    global _registry
    if _registry is None:
        _registry = PackRegistry()
    return _registry
