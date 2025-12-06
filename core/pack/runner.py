import os
import yaml
import json
from pathlib import Path

# Load .env file
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)  # override=True to reload .env changes
except ImportError:
    print("⚠️ python-dotenv not installed. Run: pip install python-dotenv")


class PackRunner:
    """AUTUS Pack Engine - Execute development packs"""
    
    def __init__(self):
        self.packs_dir = Path("packs/development")
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        
        # Check API key validity (must start with sk-ant-)
        is_valid = (
            self.api_key and 
            self.api_key.startswith("sk-ant-") and 
            len(self.api_key) > 20
        )
        
        if is_valid:
            self.mock_mode = False
            print(f"✅ API Key loaded (ends with ...{self.api_key[-8:]})")
        else:
            self.mock_mode = True
            self._print_api_warning()
    
    def _print_api_warning(self):
        """Print clear warning about missing API key."""
        print("\n" + "=" * 60)
        print("⚠️  ANTHROPIC_API_KEY not configured!")
        print("=" * 60)
        print("Running in MOCK MODE - no actual AI calls will be made.")
        print("")
        print("To enable live mode:")
        print("  1. Get API key: https://console.anthropic.com/settings/keys")
        print("  2. Create .env file in project root:")
        print("     echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env")
        print("  3. Restart the server")
        print("=" * 60 + "\n")
    
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
