#!/usr/bin/env python3
"""
Development Pack Runner (OpenAI 버전)
임시로 OpenAI GPT-4를 사용
"""
import yaml
import json
import os
from pathlib import Path
from typing import Dict, Any
from openai import OpenAI
from core.llm.retry import retry_with_backoff
from core.llm.cost_tracker import get_cost_tracker, CostLimitExceeded

class DevPackRunner:
    """Development Pack 실행 엔진 (OpenAI)"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY 필요")

        self.client = OpenAI(api_key=self.api_key)
        self.packs_dir = Path("packs/development")
        self.cost_tracker = get_cost_tracker()

    def load_pack(self, pack_name: str) -> Dict[str, Any]:
        pack_path = self.packs_dir / f"{pack_name}.yaml"

        if not pack_path.exists():
            raise FileNotFoundError(f"Pack not found: {pack_name}")

        with open(pack_path) as f:
            pack = yaml.safe_load(f)

        return pack

    def execute_cell(
        self,
        pack: Dict[str, Any],
        cell_name: str,
        inputs: Dict[str, Any] = None
    ) -> str:
        inputs = inputs or {}

        cells = pack.get("cells", [])
        cell = None
        for c in cells:
            if c.get("name") == cell_name:
                cell = c
                break

        if not cell:
            raise ValueError(f"Cell not found: {cell_name}")

        prompt_template = cell.get("prompt", "")
        prompt = prompt_template.format(**inputs)

        print(f"🤖 Calling OpenAI GPT-4 for cell: {cell_name}")

        # Rate limit 재시도와 비용 추적이 포함된 호출
        response = self._call_with_retry_and_tracking(prompt)

        result = response.choices[0].message.content

        print(f"✅ Cell completed: {cell_name}")

        return result

    @retry_with_backoff(max_retries=5, base_delay=60, max_delay=300)
    def _call_with_retry_and_tracking(self, prompt: str):
        """재시도 로직과 비용 추적이 포함된 API 호출"""
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=4000
        )

        # 비용 추적
        try:
            cost = self.cost_tracker.track(
                model="gpt-4",
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens
            )
            print(f"💰 Cost: ${cost:.4f} (Daily: ${self.cost_tracker.get_daily_cost():.2f})")
        except CostLimitExceeded as e:
            print(f"⚠️ {e}")
            raise

        return response

    def execute_pack(
        self,
        pack_name: str,
        inputs: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        inputs = inputs or {}

        print(f"🚀 Executing pack: {pack_name}")

        pack = self.load_pack(pack_name)
        results = {}

        cells = pack.get("cells", [])
        for cell in cells:
            cell_name = cell.get("name")
            cell_inputs = inputs.copy()

            if "input" in cell:
                prev_output_name = cell["input"]
                if prev_output_name in results:
                    cell_inputs[prev_output_name] = results[prev_output_name]

            result = self.execute_cell(pack, cell_name, cell_inputs)
            output_name = cell.get("output", cell_name)
            results[output_name] = result

        self.execute_actions(pack, results, inputs)

        print(f"✅ Pack completed: {pack_name}")

        return results

    def execute_actions(
        self,
        pack: Dict[str, Any],
        results: Dict[str, Any],
        inputs: Dict[str, Any]
    ):
        actions = pack.get("actions", [])

        for action in actions:
            action_type = action.get("type")

            if action_type == "write_file":
                path_template = action.get("path", "")
                content_template = action.get("content", "")

                all_vars = {**inputs, **results}
                path = path_template.format(**all_vars)
                content = content_template.format(**all_vars)

                if action.get("create_dirs", False):
                    Path(path).parent.mkdir(parents=True, exist_ok=True)

                with open(path, 'w') as f:
                    f.write(content)

                print(f"📝 File written: {path}")

            elif action_type == "log":
                message_template = action.get("message", "")
                all_vars = {**inputs, **results}
                message = message_template.format(**all_vars)
                print(f"📋 {message}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python openai_runner.py <pack_name> [inputs_json]")
        sys.exit(1)

    pack_name = sys.argv[1]
    inputs = {}

    if len(sys.argv) > 2:
        inputs = json.loads(sys.argv[2])

    runner = DevPackRunner()
    results = runner.execute_pack(pack_name, inputs)

    print("\n" + "="*50)
    print("Results:")
    print(json.dumps(results, indent=2, ensure_ascii=False))
