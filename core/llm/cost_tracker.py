"""
LLM API 비용 추적 시스템

토큰 사용량과 비용을 추적하여 예산 초과를 방지합니다.
"""
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, Optional
from pathlib import Path
import json


class CostLimitExceeded(Exception):
    """비용 한도 초과 예외"""
    pass


class CostTracker:
    """
    API 비용 추적 클래스

    일일/월간 비용을 추적하고 한도를 설정할 수 있습니다.
    """

    # 모델별 토큰당 비용 (USD)
    # 출처: OpenAI & Anthropic 공식 가격 (2024-11 기준)
    COSTS = {
        # OpenAI
        "gpt-4": {
            "input": 0.03 / 1000,  # $0.03 per 1K tokens
            "output": 0.06 / 1000   # $0.06 per 1K tokens
        },
        "gpt-4-turbo": {
            "input": 0.01 / 1000,
            "output": 0.03 / 1000
        },
        "gpt-3.5-turbo": {
            "input": 0.0015 / 1000,
            "output": 0.002 / 1000
        },
        # Anthropic
        "claude-3-opus": {
            "input": 0.015 / 1000,
            "output": 0.075 / 1000
        },
        "claude-3-sonnet": {
            "input": 0.003 / 1000,
            "output": 0.015 / 1000
        },
        "claude-3-haiku": {
            "input": 0.00025 / 1000,
            "output": 0.00125 / 1000
        }
    }

    def __init__(
        self,
        daily_limit: float = 10.0,
        monthly_limit: float = 100.0,
        storage_path: Optional[Path] = None
    ):
        """
        CostTracker 초기화

        Args:
            daily_limit: 일일 비용 한도 (USD)
            monthly_limit: 월간 비용 한도 (USD)
            storage_path: 사용량 저장 경로 (None이면 메모리만)
        """
        self.daily_limit = daily_limit
        self.monthly_limit = monthly_limit
        self.storage_path = storage_path or Path(".autus/cost_tracking.json")

        # 사용량 데이터
        self.usage: Dict[str, Dict] = defaultdict(lambda: {
            "input_tokens": 0,
            "output_tokens": 0,
            "calls": 0,
            "cost": 0.0
        })

        # 저장된 데이터 로드
        self._load_usage()

    def _load_usage(self):
        """저장된 사용량 데이터 로드"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r') as f:
                    saved_data = json.load(f)
                    # 날짜별로 변환
                    for date_str, data in saved_data.items():
                        self.usage[date_str] = data
            except Exception as e:
                print(f"⚠️ Failed to load cost tracking: {e}")

    def _save_usage(self):
        """사용량 데이터 저장"""
        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.storage_path, 'w') as f:
                json.dump(dict(self.usage), f, indent=2)
        except Exception as e:
            print(f"⚠️ Failed to save cost tracking: {e}")

    def track(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        save: bool = True
    ) -> float:
        """
        API 사용량 추적

        Args:
            model: 모델 이름
            input_tokens: 입력 토큰 수
            output_tokens: 출력 토큰 수
            save: 저장 여부

        Returns:
            이번 호출의 비용 (USD)

        Raises:
            CostLimitExceeded: 비용 한도 초과 시
        """
        # 모델 비용 가져오기
        if model not in self.COSTS:
            # 기본값 (gpt-3.5-turbo)
            model_costs = self.COSTS["gpt-3.5-turbo"]
            print(f"⚠️ Unknown model '{model}', using default costs")
        else:
            model_costs = self.COSTS[model]

        # 비용 계산
        cost = (
            input_tokens * model_costs["input"] +
            output_tokens * model_costs["output"]
        )

        # 일일 사용량 업데이트
        today = datetime.now().strftime("%Y-%m-%d")
        self.usage[today]["input_tokens"] += input_tokens
        self.usage[today]["output_tokens"] += output_tokens
        self.usage[today]["calls"] += 1
        self.usage[today]["cost"] += cost

        # 일일 한도 체크
        daily_cost = self.usage[today]["cost"]
        if daily_cost > self.daily_limit:
            raise CostLimitExceeded(
                f"Daily cost limit exceeded: ${daily_cost:.2f} / ${self.daily_limit:.2f}"
            )

        # 월간 한도 체크
        monthly_cost = self.get_monthly_cost()
        if monthly_cost > self.monthly_limit:
            raise CostLimitExceeded(
                f"Monthly cost limit exceeded: ${monthly_cost:.2f} / ${self.monthly_limit:.2f}"
            )

        # 저장
        if save:
            self._save_usage()

        return cost

    def get_daily_cost(self, date: Optional[str] = None) -> float:
        """
        특정 날짜의 비용 조회

        Args:
            date: 날짜 (YYYY-MM-DD), None이면 오늘
        """
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        return self.usage[date]["cost"]

    def get_monthly_cost(self) -> float:
        """현재 월의 총 비용"""
        month_start = datetime.now().replace(day=1).strftime("%Y-%m-%d")
        return sum(
            day["cost"]
            for date, day in self.usage.items()
            if date >= month_start
        )

    def get_usage_summary(self) -> Dict:
        """사용량 요약"""
        today = datetime.now().strftime("%Y-%m-%d")
        return {
            "today": {
                "cost": self.get_daily_cost(),
                "calls": self.usage[today]["calls"],
                "input_tokens": self.usage[today]["input_tokens"],
                "output_tokens": self.usage[today]["output_tokens"]
            },
            "monthly": {
                "cost": self.get_monthly_cost(),
                "days_active": len([
                    d for d in self.usage.keys()
                    if d >= datetime.now().replace(day=1).strftime("%Y-%m-%d")
                ])
            },
            "limits": {
                "daily": self.daily_limit,
                "monthly": self.monthly_limit
            }
        }

    def reset_daily(self):
        """일일 사용량 초기화 (테스트용)"""
        today = datetime.now().strftime("%Y-%m-%d")
        self.usage[today] = {
            "input_tokens": 0,
            "output_tokens": 0,
            "calls": 0,
            "cost": 0.0
        }
        self._save_usage()


# 전역 인스턴스
_global_tracker: Optional[CostTracker] = None


def get_cost_tracker() -> CostTracker:
    """전역 CostTracker 인스턴스 반환"""
    global _global_tracker
    if _global_tracker is None:
        _global_tracker = CostTracker()
    return _global_tracker

