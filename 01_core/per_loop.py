"""
PER Loop: Plan → Execute → Review

자동화 작업을 계획, 실행, 검토하는 사이클
"""
from __future__ import annotations

from typing import Dict, List, Any, Optional
from pathlib import Path
import json
import importlib.util

# DSL 모듈 동적 로드
_DSL_PATH = Path(__file__).parent / "dsl.py"
_dsl_module = None

def _load_dsl():
    """DSL 모듈 동적 로드"""
    global _dsl_module
    if _dsl_module is None:
        spec = importlib.util.spec_from_file_location("dsl", _DSL_PATH)
        if spec and spec.loader:
            _dsl_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(_dsl_module)
    return _dsl_module


class PERLoop:
    """Plan → Execute → Review 사이클"""

    def __init__(self):
        self.history: List[Dict[str, Any]] = []
        self.dsl = _load_dsl()

    def plan(self, goal: str) -> Dict[str, Any]:
        """
        목표를 단계별 계획으로 분해

        Args:
            goal: 달성하고자 하는 목표

        Returns:
            계획 딕셔너리 (steps, estimated_time 등)
        """
        # 간단한 휴리스틱: 목표를 키워드로 분석하여 기본 단계 생성
        goal_lower = goal.lower()

        steps = []

        # HTTP 요청 감지
        if "get " in goal_lower or "http" in goal_lower:
            steps.append({
                "action": "http_request",
                "description": "HTTP 요청 실행",
                "command": goal
            })
        # 파이프라인 감지
        elif "|" in goal:
            parts = goal.split("|")
            for i, part in enumerate(parts):
                steps.append({
                    "action": f"step_{i+1}",
                    "description": part.strip(),
                    "command": part.strip()
                })
        # 기본 실행
        else:
            steps.append({
                "action": "execute",
                "description": goal,
                "command": goal
            })

        return {
            "goal": goal,
            "steps": steps,
            "estimated_time": len(steps) * 2,  # 단계당 2초 추정
            "status": "planned"
        }

    def execute(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        계획 실행

        Args:
            plan: plan()에서 반환된 계획

        Returns:
            실행 결과 딕셔너리
        """
        if not self.dsl:
            return {
                "status": "error",
                "error": "DSL 모듈을 로드할 수 없습니다"
            }

        results = []
        context = {}

        for step in plan.get("steps", []):
            try:
                command = step.get("command", "")
                if command:
                    # DSL 실행
                    if hasattr(self.dsl, "run"):
                        result = self.dsl.run(command, context)
                        results.append({
                            "step": step.get("action"),
                            "status": "success",
                            "result": result
                        })
                        # 다음 단계를 위한 context 업데이트
                        if isinstance(result, dict):
                            context.update(result)
                    else:
                        results.append({
                            "step": step.get("action"),
                            "status": "error",
                            "error": "DSL.run() 메서드 없음"
                        })
            except Exception as e:
                results.append({
                    "step": step.get("action"),
                    "status": "error",
                    "error": str(e)
                })

        return {
            "plan": plan,
            "results": results,
            "status": "completed" if all(r.get("status") == "success" for r in results) else "partial"
        }

    def review(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        결과 분석 및 개선점 도출

        Args:
            result: execute()에서 반환된 결과

        Returns:
            검토 결과 딕셔너리 (improvements, next_steps 등)
        """
        plan = result.get("plan", {})
        results = result.get("results", [])

        success_count = sum(1 for r in results if r.get("status") == "success")
        total_count = len(results)
        success_rate = success_count / total_count if total_count > 0 else 0

        improvements = []
        next_steps = []

        # 실패한 단계 분석
        for r in results:
            if r.get("status") != "success":
                error = r.get("error", "Unknown error")
                improvements.append({
                    "step": r.get("step"),
                    "issue": error,
                    "suggestion": "에러 메시지를 확인하고 입력을 검증하세요"
                })

        # 성공률이 낮으면 재시도 제안
        if success_rate < 0.5:
            next_steps.append("계획을 더 작은 단계로 분해")
            next_steps.append("입력 데이터 검증 추가")

        return {
            "result": result,
            "success_rate": success_rate,
            "improvements": improvements,
            "next_steps": next_steps,
            "summary": f"{success_count}/{total_count} 단계 성공"
        }

    def run(self, goal: str) -> Dict[str, Any]:
        """
        완전한 PER 사이클 실행

        Args:
            goal: 달성하고자 하는 목표

        Returns:
            최종 검토 결과
        """
        # Plan
        plan = self.plan(goal)

        # Execute
        result = self.execute(plan)

        # Review
        review = self.review(result)

        # 히스토리에 저장
        cycle = {
            "goal": goal,
            "plan": plan,
            "result": result,
            "review": review
        }
        self.history.append(cycle)

        return review


# 테스트
if __name__ == "__main__":
    print("🧪 PER Loop 테스트\n")

    loop = PERLoop()

    # 테스트 1: 간단한 HTTP 요청
    print("테스트 1: HTTP 요청")
    review = loop.run("GET https://api.github.com/users/github")
    print(f"  성공률: {review['success_rate']:.1%}")
    print(f"  요약: {review['summary']}\n")

    # 테스트 2: 파이프라인
    print("테스트 2: 파이프라인")
    review = loop.run("echo hello | parse")
    print(f"  성공률: {review['success_rate']:.1%}")
    print(f"  요약: {review['summary']}\n")

    print(f"✅ 총 {len(loop.history)}개 사이클 실행됨")


