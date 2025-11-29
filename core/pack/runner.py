"""
from __future__ import annotations

Development Pack Runner
LLM Provider를 선택할 수 있는 통합 Pack 실행 엔진
"""
import yaml
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional

# Custom exceptions for LLM provider and pack errors
class LLMProviderError(Exception):
    """Raised when there is an LLM provider configuration or usage error."""
    pass

class PackNotFoundError(Exception):
    """Raised when a requested Pack is not found."""
    pass

try:
    import sys
    ROOT = Path(__file__).resolve().parent.parent.parent
    sys.path.insert(0, str(ROOT))
    from config import PACKS_DEVELOPMENT_DIR
except ImportError:
    # fallback
    PACKS_DEVELOPMENT_DIR = Path("packs/development")


class DevPackRunner:
    """Development Pack 실행 엔진 (통합 버전)"""

    def __init__(self, provider: str = "auto", api_key: Optional[str] = None) -> None:
        """
        초기화

        Args:
            provider: "anthropic", "openai", "auto" (자동 감지)
            api_key: API 키 (없으면 환경변수에서)
        """
        self.provider = provider
        self.api_key = api_key
        self.client = None
        self.packs_dir = PACKS_DEVELOPMENT_DIR

        # Provider 설정
        if provider == "auto":
            # 환경변수에서 자동 감지
            if os.getenv("ANTHROPIC_API_KEY"):
                self.provider = "anthropic"
            elif os.getenv("OPENAI_API_KEY"):
                self.provider = "anthropic"
            else:
                raise LLMProviderError("API 키를 찾을 수 없습니다. ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 설정하세요.")

        # LLM 클라이언트 초기화
        self._init_client()

    def _init_client(self) -> None:
        """Initialize the appropriate LLM client"""
        if self.provider == "anthropic":
            try:
                from anthropic import Anthropic
                self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            except ImportError:
                raise LLMProviderError("anthropic 패키지가 필요합니다: pip install anthropic")
        elif self.provider == "openai":
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            except ImportError:
                raise LLMProviderError("openai 패키지가 필요합니다: pip install openai")
        else:
            raise LLMProviderError(f"Unsupported provider: {self.provider}")
    def load_pack(self, pack_name: str) -> Dict[str, Any]:
        """
        Pack YAML 로드

        Args:
            pack_name: Pack 이름 (예: architect_pack)

        Returns:
            Pack 정의 딕셔너리
        """
        pack_path = self.packs_dir / f"{pack_name}.yaml"

        if not pack_path.exists():
            raise PackNotFoundError(f"Pack not found: {pack_name} at {pack_path}")

        with open(pack_path, 'r', encoding='utf-8') as f:
            pack = yaml.safe_load(f)

        return pack

    def execute_cell(
        self,
        pack: Dict[str, Any],
        cell_name: str,
        inputs: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Cell 실행 (LLM API 호출)

        Args:
            pack: Pack 정의
            cell_name: 실행할 Cell 이름
            inputs: Cell에 전달할 입력값

        Returns:
            Cell 실행 결과
        """
        inputs = inputs or {}

        # Cell 찾기
        cells = pack.get("cells", [])
        cell = None
        for c in cells:
            if c.get("name") == cell_name:
                cell = c
                break

        if not cell:
            raise ValueError(f"Cell not found: {cell_name}")

        # 프롬프트 생성
        prompt_template = cell.get("prompt", "")
        try:
            prompt = prompt_template.format(**inputs)
        except KeyError as e:
            raise ValueError(f"프롬프트 템플릿 변수 누락: {e}")

        # LLM 설정
        llm_config = pack.get("llm", {})

        print(f"🤖 Calling {self.provider.upper()} API for cell: {cell_name}")

        # Provider별 API 호출
        if self.provider == "anthropic":
            model = llm_config.get("model", "claude-sonnet-4-20250514")
            temperature = llm_config.get("temperature", 0.3)
            max_tokens = llm_config.get("max_tokens", 8000)

            message = self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            result = message.content[0].text

        elif self.provider == "openai":
            model = llm_config.get("model", "gpt-4")
            temperature = llm_config.get("temperature", 0.3)
            max_tokens = llm_config.get("max_tokens", 4000)

            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )

            result = response.choices[0].message.content

        else:
            raise ValueError(f"지원하지 않는 provider: {self.provider}")

        print(f"✅ Cell completed: {cell_name}")

        return result

    def execute_pack(
        self,
        pack_name: str,
        inputs: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Pack 전체 실행 (모든 Cell 순차 실행)

        Args:
            pack_name: Pack 이름
            inputs: 초기 입력값

        Returns:
            전체 실행 결과
        """
        inputs = inputs or {}

        print(f"🚀 Executing pack: {pack_name}")

        # Pack 로드
        pack = self.load_pack(pack_name)

        # 결과 저장
        results = {}

        # Cell 순차 실행
        cells = pack.get("cells", [])
        for cell in cells:
            cell_name = cell.get("name")

            # 이전 Cell 출력을 다음 Cell 입력으로
            cell_inputs = inputs.copy()

            # input 필드가 있으면 이전 결과 사용
            if "input" in cell:
                prev_output_name = cell["input"]
                if prev_output_name in results:
                    cell_inputs[prev_output_name] = results[prev_output_name]

            # Cell 실행
            result = self.execute_cell(pack, cell_name, cell_inputs)

            # 결과 저장
            output_name = cell.get("output", cell_name)
            results[output_name] = result

        # 액션 실행
        self.execute_actions(pack, results, inputs)

        print(f"✅ Pack completed: {pack_name}")

        return results

    def execute_actions(
        self,
        pack: Dict[str, Any],
        results: Dict[str, Any],
        inputs: Dict[str, Any]
    ):
        """
        Pack 액션 실행 (파일 쓰기 등)

        Args:
            pack: Pack 정의
            results: Cell 실행 결과들
            inputs: 초기 입력값
        """
        actions = pack.get("actions", [])

        for action in actions:
            action_type = action.get("type")

            if action_type == "write_file":
                # 파일 쓰기
                path_template = action.get("path", "")
                content_template = action.get("content", "")

                # 템플릿 렌더링
                all_vars = {**inputs, **results}
                try:
                    path = path_template.format(**all_vars)
                    content = content_template.format(**all_vars)
                except KeyError as e:
                    print(f"⚠️  액션 변수 누락: {e}, 스킵")
                    continue

                # 디렉토리 생성
                if action.get("create_dirs", False):
                    Path(path).parent.mkdir(parents=True, exist_ok=True)

                # 파일 쓰기
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)

                print(f"📝 File written: {path}")

            elif action_type == "log":
                # 로그 출력
                message_template = action.get("message", "")
                all_vars = {**inputs, **results}
                try:
                    message = message_template.format(**all_vars)
                    level = action.get("level", "info")
                    print(f"📋 [{level.upper()}] {message}")
                except KeyError as e:
                    print(f"⚠️  로그 변수 누락: {e}")


# CLI 인터페이스
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python runner.py <pack_name> [inputs_json] [--provider anthropic|openai]")
        sys.exit(1)

    pack_name = sys.argv[1]
    inputs = {}
    provider = "auto"

    # 인자 파싱
    for i, arg in enumerate(sys.argv[2:], 2):
        if arg == "--provider" and i + 1 < len(sys.argv):
            provider = sys.argv[i + 1]
        elif arg.startswith("{"):
            inputs = json.loads(arg)

    # 실행
    try:
        runner = DevPackRunner(provider=provider)
        results = runner.execute_pack(pack_name, inputs)

        print("\n" + "="*50)
        print("Results:")
        print(json.dumps(results, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
