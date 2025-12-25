#!/usr/bin/env python3
"""
AUTUS Core - Data Connector
===========================
데이터 소스 연결 추상화
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime


class DataConnector(ABC):
    """데이터 커넥터 추상 클래스"""
    
    CONNECTOR_TYPE: str = "base"
    
    def __init__(self):
        self.connected = False
        self.last_sync = None
    
    @abstractmethod
    def connect(self) -> bool:
        """연결"""
        pass
    
    @abstractmethod
    def fetch(self, query: str = None) -> Dict:
        """데이터 조회"""
        pass
    
    @abstractmethod
    def push(self, data: Dict) -> bool:
        """데이터 저장"""
        pass
    
    def sync(self) -> Dict:
        """동기화"""
        data = self.fetch()
        self.last_sync = datetime.now().isoformat()
        return data


class MockConnector(DataConnector):
    """Mock 커넥터 (테스트용)"""
    
    CONNECTOR_TYPE = "mock"
    
    def __init__(self, mock_data: Dict = None):
        super().__init__()
        self.mock_data = mock_data or {}
    
    def connect(self) -> bool:
        self.connected = True
        return True
    
    def fetch(self, query: str = None) -> Dict:
        return self.mock_data
    
    def push(self, data: Dict) -> bool:
        self.mock_data.update(data)
        return True


class JSONFileConnector(DataConnector):
    """JSON 파일 커넥터"""
    
    CONNECTOR_TYPE = "json_file"
    
    def __init__(self, filepath: str):
        super().__init__()
        self.filepath = filepath
    
    def connect(self) -> bool:
        import os
        self.connected = os.path.exists(self.filepath)
        return self.connected
    
    def fetch(self, query: str = None) -> Dict:
        import json
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    
    def push(self, data: Dict) -> bool:
        import json
        try:
            with open(self.filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except:
            return False
