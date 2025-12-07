"""
AUTUS Evolution - Pack Generator
제3법칙: 메타-순환 - AUTUS가 AUTUS를 개발

자연어 설명으로 Pack 자동 생성
"""
import yaml
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

try:
    from oracle.llm_client import generate as llm_generate, is_enabled as llm_is_enabled
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    def llm_generate(prompt, **kwargs):
        return {"success": True, "content": ""}
    def llm_is_enabled():
        return False


class PackGenerator:
    """
    Pack 자동 생성기
    
    필연적 성공:
    - 설명 입력 → Pack 생성
    - LLM 사용 → 지능적 생성
    - 템플릿 사용 → 일관된 품질
    """
    
    def __init__(self, output_dir: str = "packs/generated"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate(
        self,
        name: str,
        description: str,
        use_llm: bool = True
    ) -> Dict[str, Any]:
        """Pack 생성"""
        
        if use_llm and LLM_AVAILABLE and llm_is_enabled():
            return self._generate_with_llm(name, description)
        else:
            return self._generate_from_template(name, description)
    
    def _generate_with_llm(self, name: str, description: str) -> Dict[str, Any]:
        """LLM으로 Pack 생성"""
        prompt = f"""다음 설명을 바탕으로 AUTUS Pack YAML을 생성해주세요.

Pack 이름: {name}
설명: {description}

AUTUS Pack 형식:
```yaml
autus: "1.0"
name: "{name}"
version: "1.0.0"

metadata:
  description: "설명"
  author: "AUTUS"
  license: "MIT"
  tags: []

cells:
  - name: "cell_name"
    type: "llm"  # llm, http, local 중 하나
    prompt: "프롬프트 내용 {{변수}}"
    output: "output_name"
```

YAML만 출력하세요. 설명이나 마크다운 블록 없이 순수 YAML만 출력하세요."""

        result = llm_generate(prompt, temperature=0.3, max_tokens=2000)
        
        if not result.get("success"):
            return self._generate_from_template(name, description)
        
        content = result.get("content", "")
        
        # YAML 파싱 시도
        try:
            # 마크다운 코드블록 제거
            if "```yaml" in content:
                content = content.split("```yaml")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            pack_data = yaml.safe_load(content)
            
            # 파일 저장
            file_path = self.output_dir / f"{name}.yaml"
            with open(file_path, 'w') as f:
                yaml.dump(pack_data, f, allow_unicode=True, default_flow_style=False)
            
            return {
                "success": True,
                "pack": pack_data,
                "path": str(file_path),
                "method": "llm"
            }
            
        except Exception as e:
            return self._generate_from_template(name, description)
    
    def _generate_from_template(self, name: str, description: str) -> Dict[str, Any]:
        """템플릿으로 Pack 생성"""
        pack_data = {
            "autus": "1.0",
            "name": name,
            "version": "1.0.0",
            "metadata": {
                "description": description,
                "author": "AUTUS",
                "license": "MIT",
                "tags": self._extract_tags(description),
                "generated_at": datetime.utcnow().isoformat()
            },
            "cells": [
                {
                    "name": "main",
                    "type": "llm",
                    "prompt": f"{description}\n\n입력: {{input}}",
                    "output": "result"
                }
            ]
        }
        
        # 파일 저장
        file_path = self.output_dir / f"{name}.yaml"
        with open(file_path, 'w') as f:
            yaml.dump(pack_data, f, allow_unicode=True, default_flow_style=False)
        
        return {
            "success": True,
            "pack": pack_data,
            "path": str(file_path),
            "method": "template"
        }
    
    def generate_from_code(self, code: str, name: str = None) -> Dict[str, Any]:
        """코드에서 Pack 생성"""
        import ast
        
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return {"success": False, "error": "Invalid Python code"}
        
        # 함수 추출
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                docstring = ast.get_docstring(node) or ""
                functions.append({
                    "name": node.name,
                    "docstring": docstring,
                    "args": [arg.arg for arg in node.args.args]
                })
        
        if not functions:
            return {"success": False, "error": "No functions found"}
        
        # Pack 생성
        pack_name = name or f"code_pack_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        cells = []
        for func in functions:
            cells.append({
                "name": func["name"],
                "type": "llm",
                "prompt": func["docstring"] or f"Execute {func['name']}",
                "output": f"{func['name']}_result"
            })
        
        pack_data = {
            "autus": "1.0",
            "name": pack_name,
            "version": "1.0.0",
            "metadata": {
                "description": f"Generated from code with {len(functions)} functions",
                "author": "AUTUS",
                "license": "MIT",
                "generated_at": datetime.utcnow().isoformat()
            },
            "cells": cells
        }
        
        file_path = self.output_dir / f"{pack_name}.yaml"
        with open(file_path, 'w') as f:
            yaml.dump(pack_data, f, allow_unicode=True, default_flow_style=False)
        
        return {
            "success": True,
            "pack": pack_data,
            "path": str(file_path),
            "functions_found": len(functions)
        }
    
    def _extract_tags(self, description: str) -> List[str]:
        """설명에서 태그 추출"""
        keywords = ["api", "data", "ai", "ml", "web", "automation", "analysis"]
        tags = []
        desc_lower = description.lower()
        for kw in keywords:
            if kw in desc_lower:
                tags.append(kw)
        return tags[:5]


# 싱글톤
_generator = None

def get_generator() -> PackGenerator:
    global _generator
    if _generator is None:
        _generator = PackGenerator()
    return _generator
