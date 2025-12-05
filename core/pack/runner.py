import os
import yaml
import json
from pathlib import Path

class PackRunner:
    """AUTUS Pack Engine - Execute development packs"""
    
    def __init__(self):
        self.packs_dir = Path("packs/development")
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.mock_mode = not self.api_key or "your-api-key" in str(self.api_key) or self.api_key == "여기에_실제_키"
    
    def load_pack(self, pack_name: str) -> dict:
        pack_path = self.packs_dir / f"{pack_name}.yaml"
        if not pack_path.exists():
            raise FileNotFoundError(f"Pack not found: {pack_name}")
        with open(pack_path) as f:
            return yaml.safe_load(f)
    
    def _mock_response(self, cell: dict, inputs: dict) -> str:
        cell_name = cell.get("name", "unknown")
        if cell_name == "analyze_feature":
            feature = inputs.get("feature_description", "unknown")
            return json.dumps({
                "summary": f"Implement {feature}",
                "files": ["src/feature.py", "tests/test_feature.py"],
                "dependencies": ["fastapi"],
                "complexity": "medium",
                "steps": ["1. Design", "2. Implement", "3. Test"]
            })
        return json.dumps({"cell": cell_name, "status": "mock"})
    
    def execute_cell(self, cell: dict, inputs: dict, llm_config: dict) -> str:
        if self.mock_mode:
            return self._mock_response(cell, inputs)
        from anthropic import Anthropic
        client = Anthropic()
        prompt = cell["prompt"]
        for key, value in inputs.items():
            prompt = prompt.replace(f"{{{key}}}", str(value))
        response = client.messages.create(
            model=llm_config.get("model", "claude-sonnet-4-20250514"),
            max_tokens=llm_config.get("max_tokens", 4000),
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text
    
    def execute_pack(self, pack_name: str, inputs: dict) -> dict:
        pack = self.load_pack(pack_name)
        results = {}
        current_inputs = inputs.copy()
        for cell in pack["cells"]:
            output = self.execute_cell(cell, current_inputs, pack.get("llm", {}))
            output_key = cell.get("output", cell["name"])
            results[output_key] = output
            current_inputs[output_key] = output
        return {"pack": pack_name, "results": results, "status": "success", "mode": "mock" if self.mock_mode else "live"}
    
    def list_packs(self) -> list:
        if self.packs_dir.exists():
            return [f.stem for f in self.packs_dir.glob("*.yaml")]
        return []
