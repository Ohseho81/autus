"""
AUTUS Evolution - Pack Improver
제7법칙: 진화 - Pack 자동 개선
제8법칙: 선택 - 좋은 것을 더 좋게

기존 Pack 분석 및 자동 개선
"""
import yaml
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import copy

try:
    from oracle.llm_client import generate as llm_generate, is_enabled as llm_is_enabled
    from oracle.collector import MetricCollector
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    def llm_generate(prompt, **kwargs):
        return {"success": True, "content": ""}
    def llm_is_enabled():
        return False


class PackImprover:
    """
    Pack 자동 개선기
    
    필연적 성공:
    - 분석 → 문제 발견
    - 문제 발견 → 개선안 생성
    - 개선안 → 자동 적용
    """
    
    def __init__(self, packs_dir: str = "packs"):
        self.packs_dir = Path(packs_dir)
        self.improved_dir = self.packs_dir / "improved"
        self.improved_dir.mkdir(parents=True, exist_ok=True)
    
    def analyze(self, pack_path: str) -> Dict[str, Any]:
        """Pack 분석 및 개선점 발견"""
        path = Path(pack_path)
        if not path.exists():
            return {"error": f"Pack not found: {pack_path}"}
        
        with open(path) as f:
            pack = yaml.safe_load(f)
        
        issues = []
        suggestions = []
        score = 100
        
        # 1. 메타데이터 검사
        metadata = pack.get("metadata", {})
        if not metadata.get("description"):
            issues.append({"type": "missing_description", "severity": "warning"})
            suggestions.append("메타데이터에 설명 추가 필요")
            score -= 10
        
        if not metadata.get("tags"):
            issues.append({"type": "missing_tags", "severity": "info"})
            suggestions.append("검색을 위한 태그 추가 권장")
            score -= 5
        
        # 2. 셀 검사
        cells = pack.get("cells", [])
        if len(cells) == 0:
            issues.append({"type": "no_cells", "severity": "error"})
            suggestions.append("최소 1개의 셀 필요")
            score -= 30
        
        for i, cell in enumerate(cells):
            cell_name = cell.get("name", f"cell_{i}")
            
            # 프롬프트 품질
            prompt = cell.get("prompt", "")
            if len(prompt) < 10:
                issues.append({
                    "type": "short_prompt",
                    "cell": cell_name,
                    "severity": "warning"
                })
                suggestions.append(f"{cell_name}: 프롬프트가 너무 짧음")
                score -= 10
            
            # output 정의 확인
            if not cell.get("output"):
                issues.append({
                    "type": "missing_output",
                    "cell": cell_name,
                    "severity": "info"
                })
                suggestions.append(f"{cell_name}: output 정의 권장")
                score -= 5
        
        return {
            "pack_name": pack.get("name", "unknown"),
            "version": pack.get("version", "0.0.0"),
            "score": max(0, score),
            "grade": self._score_to_grade(score),
            "issues": issues,
            "suggestions": suggestions,
            "can_improve": len(suggestions) > 0
        }
    
    def improve(self, pack_path: str, auto_apply: bool = False) -> Dict[str, Any]:
        """Pack 개선"""
        path = Path(pack_path)
        if not path.exists():
            return {"error": f"Pack not found: {pack_path}"}
        
        with open(path) as f:
            original = yaml.safe_load(f)
        
        improved = copy.deepcopy(original)
        changes = []
        
        # 1. 메타데이터 개선
        if "metadata" not in improved:
            improved["metadata"] = {}
            changes.append("metadata 섹션 추가")
        
        if not improved["metadata"].get("description"):
            improved["metadata"]["description"] = f"Pack: {improved.get('name', 'unknown')}"
            changes.append("기본 설명 추가")
        
        if not improved["metadata"].get("author"):
            improved["metadata"]["author"] = "AUTUS"
            changes.append("author 추가")
        
        if not improved["metadata"].get("license"):
            improved["metadata"]["license"] = "MIT"
            changes.append("license 추가")
        
        # 2. 셀 개선
        cells = improved.get("cells", [])
        for i, cell in enumerate(cells):
            if not cell.get("name"):
                cell["name"] = f"cell_{i}"
                changes.append(f"셀 {i}에 이름 추가")
            
            if not cell.get("output"):
                cell["output"] = f"{cell.get('name', f'cell_{i}')}_result"
                changes.append(f"{cell.get('name')}: output 추가")
            
            if not cell.get("type"):
                cell["type"] = "llm"
                changes.append(f"{cell.get('name')}: type 추가")
        
        # 3. 버전 업데이트
        old_version = improved.get("version", "1.0.0")
        new_version = self._bump_version(old_version)
        improved["version"] = new_version
        changes.append(f"버전 업데이트: {old_version} → {new_version}")
        
        # 4. 개선 기록
        improved["metadata"]["improved_at"] = datetime.utcnow().isoformat()
        improved["metadata"]["improvements"] = changes
        
        result = {
            "original_path": str(path),
            "changes": changes,
            "changes_count": len(changes),
            "improved": improved
        }
        
        # 저장
        if auto_apply:
            improved_path = self.improved_dir / path.name
            with open(improved_path, 'w') as f:
                yaml.dump(improved, f, allow_unicode=True, default_flow_style=False)
            result["improved_path"] = str(improved_path)
            result["saved"] = True
        else:
            result["saved"] = False
        
        return result
    
    def improve_with_llm(self, pack_path: str) -> Dict[str, Any]:
        """LLM으로 Pack 개선"""
        if not LLM_AVAILABLE or not llm_is_enabled():
            return self.improve(pack_path, auto_apply=True)
        
        path = Path(pack_path)
        if not path.exists():
            return {"error": f"Pack not found: {pack_path}"}
        
        with open(path) as f:
            original = f.read()
        
        prompt = f"""다음 AUTUS Pack을 개선해주세요.

현재 Pack:
```yaml
{original}
```

개선 사항:
1. 프롬프트를 더 명확하고 상세하게
2. 누락된 필드 추가
3. 에러 처리 개선
4. 설명 보강

개선된 YAML만 출력하세요. 설명 없이 순수 YAML만 출력하세요."""

        result = llm_generate(prompt, temperature=0.3, max_tokens=3000)
        
        if not result.get("success"):
            return self.improve(pack_path, auto_apply=True)
        
        content = result.get("content", "")
        
        try:
            # 마크다운 제거
            if "```yaml" in content:
                content = content.split("```yaml")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            improved = yaml.safe_load(content)
            
            # 저장
            improved_path = self.improved_dir / path.name
            with open(improved_path, 'w') as f:
                yaml.dump(improved, f, allow_unicode=True, default_flow_style=False)
            
            return {
                "success": True,
                "original_path": str(path),
                "improved_path": str(improved_path),
                "method": "llm",
                "improved": improved
            }
            
        except Exception as e:
            return self.improve(pack_path, auto_apply=True)
    
    def batch_improve(self, directory: str = None) -> Dict[str, Any]:
        """여러 Pack 일괄 개선"""
        dir_path = Path(directory) if directory else self.packs_dir
        
        results = []
        improved_count = 0
        
        for pack_file in dir_path.rglob("*.yaml"):
            if "improved" in str(pack_file) or "generated" in str(pack_file):
                continue
            
            result = self.improve(str(pack_file), auto_apply=True)
            if result.get("saved"):
                improved_count += 1
            results.append({
                "file": str(pack_file),
                "changes": result.get("changes_count", 0)
            })
        
        return {
            "total_packs": len(results),
            "improved_count": improved_count,
            "results": results
        }
    
    def _score_to_grade(self, score: int) -> str:
        """점수를 등급으로"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def _bump_version(self, version: str) -> str:
        """버전 증가"""
        try:
            parts = version.split(".")
            parts[-1] = str(int(parts[-1]) + 1)
            return ".".join(parts)
        except:
            return "1.0.1"


# 싱글톤
_improver = None

def get_improver() -> PackImprover:
    global _improver
    if _improver is None:
        _improver = PackImprover()
    return _improver
