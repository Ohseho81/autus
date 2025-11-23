# runner.py 수정 스크립트
with open('core/pack/runner.py', 'r') as f:
    lines = f.readlines()

# 찾아서 수정
new_lines = []
skip_until = None

for i, line in enumerate(lines):
    # openai import 부분을 조건부로 변경
    if '    def _init_client(self):' in line:
        new_lines.append(line)
        new_lines.append('        """Initialize the appropriate LLM client"""\n')
        # 다음 라인들 처리
        j = i + 1
        # docstring 스킵
        while j < len(lines) and '"""' in lines[j]:
            j += 1
        
        # Anthropic 먼저 체크하도록 변경
        new_lines.append('        if self.provider == "anthropic":\n')
        new_lines.append('            try:\n')
        new_lines.append('                from anthropic import Anthropic\n')
        new_lines.append('                self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))\n')
        new_lines.append('            except ImportError:\n')
        new_lines.append('                raise ImportError("anthropic 패키지가 필요합니다: pip install anthropic")\n')
        new_lines.append('        elif self.provider == "openai":\n')
        new_lines.append('            try:\n')
        new_lines.append('                from openai import OpenAI\n')
        new_lines.append('                self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))\n')
        new_lines.append('            except ImportError:\n')
        new_lines.append('                raise ImportError("openai 패키지가 필요합니다: pip install openai")\n')
        new_lines.append('        else:\n')
        new_lines.append('            raise ValueError(f"Unsupported provider: {self.provider}")\n')
        
        # 원래 _init_client 메서드 끝까지 스킵
        j = i + 1
        indent_count = 0
        while j < len(lines):
            if lines[j].strip() and not lines[j].startswith('    '):
                break
            if lines[j].strip().startswith('def ') and lines[j].startswith('    '):
                break
            j += 1
        skip_until = j
        continue
    
    if skip_until and i < skip_until:
        continue
    
    new_lines.append(line)

with open('core/pack/runner.py', 'w') as f:
    f.writelines(new_lines)

print("✅ runner.py 수정 완료!")
