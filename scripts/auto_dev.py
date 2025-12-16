"""
AUTUS Auto-Dev v1.0
자연어 → 코드 자동 생성
"""

import os
import sys
from pathlib import Path

# 프로젝트 루트 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# .env 로드
env_path = project_root / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

from oracle.llm_client import LLMClient

class AutoDev:
    def __init__(self):
        self.client = LLMClient()
        self.project_root = project_root
    
    def generate(self, request: str, output_path: str = None) -> dict:
        """자연어 요청으로 코드 생성"""
        
        if not self.client.enabled:
            return {"success": False, "error": "LLM not enabled. Set ANTHROPIC_API_KEY in .env"}
        
        prompt = f"""You are AUTUS Auto-Dev. Generate production-ready code.

REQUEST: {request}

RULES:
1. Generate complete, working code
2. Include all imports
3. Use modern best practices
4. Add brief comments
5. Output ONLY the code, no explanations before or after

If HTML: make it self-contained with inline CSS/JS, dark theme (#0a0a0f background).
If Python: make it a complete module with proper imports.
"""
        
        try:
            response = self.client.generate(prompt, max_tokens=4000)
            
            if not response.get("success"):
                return {"success": False, "error": response.get("error", "Unknown error")}
            
            code = response.get("content", "")
            
            # 코드 블록 추출
            if "```" in code:
                parts = code.split("```")
                for i, block in enumerate(parts):
                    if i % 2 == 1:
                        lines = block.split("\n")
                        if lines[0].strip() in ["html", "python", "javascript", "js", "css", "py"]:
                            code = "\n".join(lines[1:])
                        else:
                            code = block
                        break
            
            # 파일 저장
            if output_path:
                full_path = self.project_root / output_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                with open(full_path, "w") as f:
                    f.write(code.strip())
                return {"success": True, "path": str(full_path), "code": code}
            
            return {"success": True, "code": code}
            
        except Exception as e:
            return {"success": False, "error": str(e)}


if __name__ == "__main__":
    dev = AutoDev()
    
    if not dev.client.enabled:
        print("❌ LLM not enabled")
        print("Create .env file with: ANTHROPIC_API_KEY=your_key")
        sys.exit(1)
    
    print("✅ LLM Connected")
    
    if len(sys.argv) < 2:
        print("Usage: python3 auto_dev.py '<request>' [output_path]")
        sys.exit(1)
    
    request = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"🔄 Generating...")
    result = dev.generate(request, output)
    
    if result["success"]:
        if output:
            print(f"✅ Created: {output}")
        else:
            print(result["code"])
    else:
        print(f"❌ Error: {result['error']}")
