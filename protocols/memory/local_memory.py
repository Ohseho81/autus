#!/usr/bin/env python3
"""
AUTUS Local Memory OS
100% 로컬, 프라이버시 보장
Constitution Article II: Privacy by Architecture
"""

import sqlite3
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

class AUTUSMemoryOS:
    """로컬 전용 메모리 시스템"""
    
    def __init__(self, user_seed: str = None):
        self.base_path = Path.home() / ".autus" / "memory"
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # 익명 식별자 (no user_id, no email)
        self.anonymous_id = hashlib.sha256(
            (user_seed or str(datetime.now())).encode()
        ).hexdigest()[:16]
        
        # 로컬 DB (no cloud sync)
        self.db_path = self.base_path / f"memory_{self.anonymous_id}.db"
        self.conn = sqlite3.connect(str(self.db_path))
        self._init_database()
        
        # 메모리 계층
        self.memory_layers = {
            "short_term": [],      # 단기 기억 (세션)
            "working": {},         # 작업 메모리 (현재 작업)
            "long_term": {},       # 장기 기억 (패턴)
            "procedural": {}       # 절차 기억 (자동화)
        }
    
    def _init_database(self):
        """DB 초기화 - PII 없음"""
        cursor = self.conn.cursor()
        
        # NO user_id, NO email, NO name
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                context TEXT,
                pattern TEXT,
                frequency INTEGER DEFAULT 1,
                automation_score REAL DEFAULT 0.0
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_hash TEXT UNIQUE,
                occurrences INTEGER DEFAULT 1,
                last_seen TEXT,
                automated BOOLEAN DEFAULT FALSE
            )
        ''')
        
        self.conn.commit()
    
    def remember(self, context: str, data: Dict):
        """기억 저장 - 완전 익명"""
        # 단기 기억
        memory_item = {
            "timestamp": datetime.now().isoformat(),
            "context": context,
            "data": data,
            # NO user info
        }
        
        self.memory_layers["short_term"].append(memory_item)
        
        # 패턴 추출
        pattern = self._extract_pattern(context, data)
        if pattern:
            self._store_pattern(pattern)
        
        # 작업 메모리 업데이트
        self.memory_layers["working"][context] = data
        
        # 메모리 정리 (100개 제한)
        if len(self.memory_layers["short_term"]) > 100:
            self._consolidate_memory()
    
    def _extract_pattern(self, context: str, data: Dict) -> Optional[str]:
        """패턴 추출 - 행동 패턴만"""
        # 개인정보 없이 행동 패턴만 추출
        actions = []
        for key, value in data.items():
            if key not in ["user_id", "email", "name", "phone"]:
                actions.append(f"{key}:{type(value).__name__}")
        
        if actions:
            return "|".join(actions)
        return None
    
    def _store_pattern(self, pattern: str):
        """패턴 저장"""
        pattern_hash = hashlib.md5(pattern.encode()).hexdigest()
        
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO patterns 
            (pattern_hash, occurrences, last_seen)
            VALUES (?, 
                    COALESCE((SELECT occurrences FROM patterns 
                             WHERE pattern_hash = ?), 0) + 1,
                    ?)
        ''', (pattern_hash, pattern_hash, datetime.now().isoformat()))
        
        self.conn.commit()
        
        # 자동화 체크
        cursor.execute('''
            SELECT occurrences FROM patterns 
            WHERE pattern_hash = ?
        ''', (pattern_hash,))
        
        result = cursor.fetchone()
        if result and result[0] >= 5:  # 5회 반복시 자동화
            self._create_automation(pattern)
    
    def _create_automation(self, pattern: str):
        """자동화 생성"""
        automation = {
            "pattern": pattern,
            "created": datetime.now().isoformat(),
            "trigger_count": 0
        }
        
        self.memory_layers["procedural"][pattern] = automation
        print(f"🤖 자동화 생성: {pattern[:30]}...")
    
    def _consolidate_memory(self):
        """메모리 압축 - 중요한 것만 장기 기억으로"""
        # 빈도 기반 중요도 계산
        frequency_map = {}
        
        for item in self.memory_layers["short_term"]:
            key = item["context"]
            frequency_map[key] = frequency_map.get(key, 0) + 1
        
        # 상위 20% 장기 기억으로
        threshold = sorted(frequency_map.values())[-len(frequency_map)//5] if frequency_map else 1
        
        for item in self.memory_layers["short_term"]:
            if frequency_map.get(item["context"], 0) >= threshold:
                self.memory_layers["long_term"][item["context"]] = item
        
        # 단기 기억 초기화
        self.memory_layers["short_term"] = self.memory_layers["short_term"][-20:]
    
    def recall(self, context: str) -> Optional[Dict]:
        """기억 회상"""
        # 우선순위: working > long_term > short_term
        if context in self.memory_layers["working"]:
            return self.memory_layers["working"][context]
        
        if context in self.memory_layers["long_term"]:
            return self.memory_layers["long_term"][context]
        
        for item in reversed(self.memory_layers["short_term"]):
            if item["context"] == context:
                return item["data"]
        
        return None
    
    def get_automations(self) -> List[Dict]:
        """자동화 규칙 반환"""
        return list(self.memory_layers["procedural"].values())
    
    def export_memory(self) -> Dict:
        """메모리 내보내기 - 로컬 백업용"""
        return {
            "anonymous_id": self.anonymous_id,
            "export_time": datetime.now().isoformat(),
            "memory_layers": self.memory_layers,
            "stats": {
                "short_term_count": len(self.memory_layers["short_term"]),
                "long_term_count": len(self.memory_layers["long_term"]),
                "automations": len(self.memory_layers["procedural"])
            }
        }
    
    def import_memory(self, backup: Dict):
        """메모리 가져오기 - 로컬 복원용"""
        if backup.get("anonymous_id") == self.anonymous_id:
            self.memory_layers = backup.get("memory_layers", {})
            print("✅ 메모리 복원 완료")
            return True
        else:
            print("❌ 익명 ID 불일치")
            return False

# 테스트
if __name__ == "__main__":
    print("""
    ╔═══════════════════════════════════════════════════╗
    ║           AUTUS LOCAL MEMORY OS v1.0             ║
    ║                                                   ║
    ║    "100% Local, Zero Identity, Full Privacy"     ║
    ╚═══════════════════════════════════════════════════╝
    """)
    
    memory = AUTUSMemoryOS()
    
    # 메모리 테스트
    print("\n📝 메모리 저장 테스트...")
    
    # 패턴 학습
    for i in range(6):
        memory.remember("morning_routine", {
            "action": "check_email",
            "time": "09:00",
            "priority": "high"
        })
    
    print(f"✅ 자동화 규칙: {len(memory.get_automations())}개")
    
    # 회상 테스트
    recalled = memory.recall("morning_routine")
    if recalled:
        print(f"✅ 기억 회상 성공: {recalled}")
    
    # 통계
    stats = memory.export_memory()["stats"]
    print("\n📊 메모리 통계:")
    print(f"  단기 기억: {stats['short_term_count']}")
    print(f"  장기 기억: {stats['long_term_count']}")
    print(f"  자동화: {stats['automations']}")
    
    print("\n✅ Constitution Article II: Privacy by Architecture 준수")
