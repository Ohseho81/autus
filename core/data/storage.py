"""
Data Storage - 로컬 데이터 저장 (Privacy by Architecture)
"""

import json
import yaml
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from .base import DataPoint, DataSession, UsagePattern, DataStats

class LocalStorage:
    """로컬 전용 데이터 저장소"""
    
    def __init__(self, storage_path: str = "data/local"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        self.sessions_path = self.storage_path / "sessions"
        self.patterns_path = self.storage_path / "patterns"
        self.stats_path = self.storage_path / "stats"
        
        for path in [self.sessions_path, self.patterns_path, self.stats_path]:
            path.mkdir(exist_ok=True)
    
    def save_session(self, session: DataSession):
        """세션 저장"""
        session_file = self.sessions_path / f"{session.session_id}.json"
        
        data = {
            'session_id': session.session_id,
            'started_at': session.started_at.isoformat(),
            'ended_at': session.ended_at.isoformat() if session.ended_at else None,
            'events': [event.to_dict() for event in session.events],
            'summary': session.summary
        }
        
        with open(session_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def load_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """세션 로드"""
        session_file = self.sessions_path / f"{session_id}.json"
        
        if not session_file.exists():
            return None
        
        with open(session_file, 'r') as f:
            return json.load(f)
    
    def save_patterns(self, patterns: Dict[str, UsagePattern]):
        """패턴 저장"""
        patterns_file = self.patterns_path / "patterns.yaml"
        
        data = {
            'updated_at': datetime.now().isoformat(),
            'patterns': {}
        }
        
        for pattern_id, pattern in patterns.items():
            data['patterns'][pattern_id] = {
                'pattern_type': pattern.pattern_type,
                'frequency': pattern.frequency,
                'last_seen': pattern.last_seen.isoformat(),
                'first_seen': pattern.first_seen.isoformat(),
                'effectiveness': pattern.effectiveness,
                'examples_count': len(pattern.examples)
            }
        
        with open(patterns_file, 'w') as f:
            yaml.dump(data, f, default_flow_style=False)
    
    def load_patterns(self) -> Optional[Dict[str, Any]]:
        """패턴 로드"""
        patterns_file = self.patterns_path / "patterns.yaml"
        
        if not patterns_file.exists():
            return None
        
        with open(patterns_file, 'r') as f:
            return yaml.safe_load(f)
    
    def get_storage_info(self) -> Dict[str, Any]:
        """저장소 정보"""
        return {
            'storage_path': str(self.storage_path),
            'sessions_count': len(list(self.sessions_path.glob("*.json"))),
            'has_patterns': (self.patterns_path / "patterns.yaml").exists()
        }
    
    def list_sessions(self) -> List[str]:
        """세션 목록"""
        return [f.stem for f in self.sessions_path.glob("*.json")]
    
    def clear_all(self):
        """모든 데이터 삭제"""
        import shutil
        if self.storage_path.exists():
            shutil.rmtree(self.storage_path)
            self.storage_path.mkdir(parents=True, exist_ok=True)
            for path in [self.sessions_path, self.patterns_path, self.stats_path]:
                path.mkdir(exist_ok=True)
