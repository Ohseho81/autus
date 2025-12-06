"""
AUTUS Reference - Pack Executor (LLM 연동)
제4법칙: 분산 - 누구나 구현 가능한 레퍼런스
제7법칙: 진화 - 실제 AI와 연결

Lines: ~120 (필연적 성공 구조)
"""
import yaml
import time
import re
import httpx
from typing import Dict, Any, Optional
from pathlib import Path

# Oracle 연결 (필연적 수집)
try:
    from oracle import collector, evolution, compassion
    from oracle.llm_client import generate as llm_generate, is_enabled as llm_is_enabled
    ORACLE_ENABLED = True
    LLM_ENABLED = llm_is_enabled()
except ImportError:
    ORACLE_ENABLED = False
    LLM_ENABLED = False
    def llm_generate(prompt, **kwargs):
        return {"success": True, "content": f"[Mock] {prompt[:50]}..."}


class PackExecutor:
    """
    Pack 실행기 (레퍼런스 구현 + 실제 LLM)
    
    필연적 성공:
    - 스펙대로 구현 → 호환
    - LLM 연결 → 실제 AI 응답
    - Oracle 연결 → 자동 수집
    """
    
    def __init__(self, packs_dir: str = "packs"):
        self.packs_dir = Path(packs_dir)
        self.loaded: Dict[str, Dict] = {}
    
    def load(self, pack_name: str) -> Dict[str, Any]:
        """Pack 로드"""
        if pack_name in self.loaded:
            return self.loaded[pack_name]
        
        paths = [
            self.packs_dir / pack_name / "pack.yaml",
            self.packs_dir / f"{pack_name}.yaml",
            self.packs_dir / "development" / f"{pack_name}.yaml",
            self.packs_dir / "examples" / f"{pack_name}.yaml",
        ]
        
        for path in paths:
            if path.exists():
                with open(path) as f:
                    pack = yaml.safe_load(f)
                    self.loaded[pack_name] = pack
                    return pack
        
        raise FileNotFoundError(f"Pack not found: {pack_name}")
    
    def execute(self, pack_name: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Pack 실행"""
        start_time = time.time()
        success = False
        outputs = {}
        
        try:
            pack = self.load(pack_name)
            cells = pack.get("cells", [])
            context = {**inputs}
            
            for cell in cells:
                result = self._execute_cell(cell, context)
                output_name = cell.get("output", cell.get("name", "result"))
                context[output_name] = result
                outputs[output_name] = result
            
            success = True
            
        except Exception as e:
            outputs["error"] = str(e)
        
        finally:
            execution_time = (time.time() - start_time) * 1000
            
            if ORACLE_ENABLED:
                collector.record(pack_name, success, execution_time)
                evolution.record(pack_name, inputs, outputs)
        
        return {
            "success": success,
            "outputs": outputs,
            "execution_time_ms": round(execution_time, 2),
            "llm_enabled": LLM_ENABLED
        }
    
    def _execute_cell(self, cell: Dict, context: Dict) -> Any:
        """단일 Cell 실행"""
        cell_type = cell.get("type", "local")
        
        if cell_type == "llm":
            return self._execute_llm(cell, context)
        elif cell_type == "http":
            return self._execute_http(cell, context)
        elif cell_type == "local":
            return self._execute_local(cell, context)
        
        return None
    
    def _execute_llm(self, cell: Dict, context: Dict) -> str:
        """LLM Cell 실행 (실제 AI 호출)"""
        prompt = self._substitute(cell.get("prompt", ""), context)
        model = cell.get("model", "claude-sonnet-4-20250514")
        temperature = cell.get("temperature", 0.7)
        max_tokens = cell.get("max_tokens", 4000)
        
        result = llm_generate(
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        if result.get("success"):
            return result.get("content", "")
        else:
            return f"[Error] {result.get('error', 'Unknown error')}"
    
    def _execute_http(self, cell: Dict, context: Dict) -> str:
        """HTTP Cell 실행"""
        url = self._substitute(cell.get("url", ""), context)
        method = cell.get("method", "GET").upper()
        headers = cell.get("headers", {})
        
        try:
            with httpx.Client(timeout=30) as client:
                if method == "GET":
                    response = client.get(url, headers=headers)
                elif method == "POST":
                    body = self._substitute(cell.get("body", "{}"), context)
                    response = client.post(url, headers=headers, content=body)
                else:
                    response = client.request(method, url, headers=headers)
                
                return response.text
        except Exception as e:
            return f"[HTTP Error] {str(e)}"
    
    def _execute_local(self, cell: Dict, context: Dict) -> str:
        """Local Cell 실행"""
        command = self._substitute(cell.get("command", "echo 'ok'"), context)
        return f"[Local] {command}"
    
    def _substitute(self, template: str, context: Dict) -> str:
        """변수 치환 {var} → value"""
        def replacer(match):
            key = match.group(1)
            return str(context.get(key, f"{{{key}}}"))
        
        return re.sub(r'\{(\w+)\}', replacer, template)


# 전역 실행기
_executor = PackExecutor()

def execute(pack_name: str, inputs: Dict[str, Any] = None) -> Dict[str, Any]:
    """전역 실행 함수"""
    return _executor.execute(pack_name, inputs or {})

def load(pack_name: str) -> Dict[str, Any]:
    """전역 로드 함수"""
    return _executor.load(pack_name)
