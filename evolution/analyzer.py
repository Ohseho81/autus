"""
AUTUS Evolution - Code Analyzer
제7법칙: 진화 - 코드 분석 및 개선점 발견

메타-순환 개발의 첫 단계: 자기 코드 분석
"""
import ast
import os
from pathlib import Path
from typing import Dict, Any, List, Optional


class CodeAnalyzer:
    """
    코드 분석기
    
    필연적 성공:
    - 코드 읽기 → 구조 파악
    - 구조 파악 → 개선점 발견
    - 개선점 → 자동 제안
    """
    
    def __init__(self, base_path: str = "."):
        self.base_path = Path(base_path)
    
    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """단일 파일 분석"""
        path = Path(file_path)
        if not path.exists():
            return {"error": f"File not found: {file_path}"}
        
        content = path.read_text()
        
        result = {
            "path": str(path),
            "lines": len(content.splitlines()),
            "size_bytes": len(content.encode()),
            "functions": [],
            "classes": [],
            "imports": [],
            "complexity": 0,
            "issues": []
        }
        
        try:
            tree = ast.parse(content)
            result["functions"] = self._extract_functions(tree)
            result["classes"] = self._extract_classes(tree)
            result["imports"] = self._extract_imports(tree)
            result["complexity"] = self._calculate_complexity(tree)
            result["issues"] = self._find_issues(tree, content)
        except SyntaxError as e:
            result["issues"].append({
                "type": "syntax_error",
                "message": str(e),
                "severity": "error"
            })
        
        return result
    
    def analyze_directory(self, dir_path: str = ".") -> Dict[str, Any]:
        """디렉토리 분석"""
        path = Path(dir_path)
        files = list(path.rglob("*.py"))
        
        # 제외 패턴
        exclude = ["__pycache__", ".venv", "archive", "node_modules"]
        files = [f for f in files if not any(e in str(f) for e in exclude)]
        
        results = {
            "total_files": len(files),
            "total_lines": 0,
            "total_functions": 0,
            "total_classes": 0,
            "files": [],
            "summary": {}
        }
        
        for f in files[:50]:  # 최대 50개
            analysis = self.analyze_file(str(f))
            results["files"].append(analysis)
            results["total_lines"] += analysis.get("lines", 0)
            results["total_functions"] += len(analysis.get("functions", []))
            results["total_classes"] += len(analysis.get("classes", []))
        
        results["summary"] = {
            "avg_lines_per_file": results["total_lines"] // max(len(files), 1),
            "avg_functions_per_file": results["total_functions"] // max(len(files), 1)
        }
        
        return results
    
    def analyze_pack(self, pack_path: str) -> Dict[str, Any]:
        """Pack 분석"""
        import yaml
        
        path = Path(pack_path)
        if not path.exists():
            return {"error": f"Pack not found: {pack_path}"}
        
        with open(path) as f:
            pack = yaml.safe_load(f)
        
        cells = pack.get("cells", [])
        
        return {
            "name": pack.get("name", "unknown"),
            "version": pack.get("version", "0.0.0"),
            "cells_count": len(cells),
            "cells": [
                {
                    "name": c.get("name"),
                    "type": c.get("type", "local"),
                    "has_prompt": bool(c.get("prompt")),
                    "prompt_length": len(c.get("prompt", ""))
                }
                for c in cells
            ],
            "suggestions": self._suggest_pack_improvements(pack)
        }
    
    def _extract_functions(self, tree: ast.AST) -> List[Dict]:
        """함수 추출"""
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    "name": node.name,
                    "args": len(node.args.args),
                    "lines": node.end_lineno - node.lineno + 1 if node.end_lineno else 0,
                    "has_docstring": ast.get_docstring(node) is not None
                })
        return functions
    
    def _extract_classes(self, tree: ast.AST) -> List[Dict]:
        """클래스 추출"""
        classes = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                classes.append({
                    "name": node.name,
                    "methods": methods,
                    "method_count": len(methods),
                    "has_docstring": ast.get_docstring(node) is not None
                })
        return classes
    
    def _extract_imports(self, tree: ast.AST) -> List[str]:
        """임포트 추출"""
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                imports.append(node.module or "")
        return imports
    
    def _calculate_complexity(self, tree: ast.AST) -> int:
        """복잡도 계산 (간단한 버전)"""
        complexity = 1
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.For, ast.While, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(node, ast.BoolOp):
                complexity += len(node.values) - 1
        return complexity
    
    def _find_issues(self, tree: ast.AST, content: str) -> List[Dict]:
        """이슈 발견"""
        issues = []
        
        # 너무 긴 함수
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if node.end_lineno and (node.end_lineno - node.lineno) > 50:
                    issues.append({
                        "type": "long_function",
                        "name": node.name,
                        "lines": node.end_lineno - node.lineno,
                        "severity": "warning",
                        "suggestion": "함수를 더 작은 단위로 분리하세요"
                    })
                
                # docstring 없음
                if not ast.get_docstring(node):
                    issues.append({
                        "type": "missing_docstring",
                        "name": node.name,
                        "severity": "info",
                        "suggestion": "docstring을 추가하세요"
                    })
        
        return issues
    
    def _suggest_pack_improvements(self, pack: Dict) -> List[Dict]:
        """Pack 개선 제안"""
        suggestions = []
        
        cells = pack.get("cells", [])
        
        # 셀이 없음
        if len(cells) == 0:
            suggestions.append({
                "type": "empty_pack",
                "message": "Pack에 셀이 없습니다",
                "action": "셀을 추가하세요"
            })
        
        # 프롬프트가 너무 짧음
        for cell in cells:
            prompt = cell.get("prompt", "")
            if len(prompt) < 20:
                suggestions.append({
                    "type": "short_prompt",
                    "cell": cell.get("name"),
                    "message": "프롬프트가 너무 짧습니다",
                    "action": "더 상세한 프롬프트를 작성하세요"
                })
        
        return suggestions


# 싱글톤
_analyzer = None

def get_analyzer() -> CodeAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = CodeAnalyzer()
    return _analyzer
