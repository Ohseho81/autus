"""
AUTUS Oracle - Collective Evolution
제7법칙: 진화 - 사용자가 진화시킨다

Lines: ~50 (필연적 성공 구조)
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib


class CollectiveEvolution:
    """
    집단진화 엔진
    
    필연적 성공:
    - 사용하면 → 패턴 수집
    - 패턴 수집 → 개선점 발견
    - 개선점 → 자동 진화
    """
    
    def __init__(self):
        self.patterns: Dict[str, List[Dict]] = {}
        self.improvements: List[Dict[str, Any]] = []
    
    def record_pattern(self, pack_name: str, inputs: Dict, outputs: Dict) -> str:
        """사용 패턴 기록 (익명화)"""
        pattern = {
            "timestamp": datetime.utcnow().isoformat(),
            "input_hash": self._hash(inputs),
            "output_hash": self._hash(outputs),
            "input_keys": list(inputs.keys()),
            "output_keys": list(outputs.keys())
        }
        
        if pack_name not in self.patterns:
            self.patterns[pack_name] = []
        self.patterns[pack_name].append(pattern)
        
        return pattern["input_hash"][:8]
    
    def _hash(self, data: Dict) -> str:
        """데이터 익명 해시 (내용 보존 안함)"""
        s = str(sorted(data.items()))
        return hashlib.sha256(s.encode()).hexdigest()
    
    def analyze(self, pack_name: str) -> Dict[str, Any]:
        """패턴 분석"""
        patterns = self.patterns.get(pack_name, [])
        if not patterns:
            return {"pack": pack_name, "patterns": 0}
        
        return {
            "pack": pack_name,
            "patterns": len(patterns),
            "unique_inputs": len(set(p["input_hash"] for p in patterns)),
            "unique_outputs": len(set(p["output_hash"] for p in patterns)),
            "common_input_keys": self._most_common([p["input_keys"] for p in patterns])
        }
    
    def _most_common(self, key_lists: List[List[str]]) -> List[str]:
        """가장 많이 사용되는 키"""
        from collections import Counter
        all_keys = [k for keys in key_lists for k in keys]
        return [k for k, _ in Counter(all_keys).most_common(5)]
    
    def suggest_improvement(self, pack_name: str) -> Optional[str]:
        """개선 제안"""
        analysis = self.analyze(pack_name)
        if analysis["patterns"] < 10:
            return None
        
        if analysis["unique_inputs"] > analysis["patterns"] * 0.8:
            return f"{pack_name}: 다양한 입력 패턴 - 유연성 좋음"
        
        return f"{pack_name}: {analysis['patterns']}개 패턴 분석됨"


# 싱글톤
_evolution = CollectiveEvolution()

def record(pack: str, inputs: Dict, outputs: Dict) -> str:
    return _evolution.record_pattern(pack, inputs, outputs)

def analyze(pack: str) -> Dict:
    return _evolution.analyze(pack)
