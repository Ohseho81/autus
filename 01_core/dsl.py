"""
AUTUS DSL 실행기
Cell = 문자열 명령어
"""
import re
import subprocess
import json

def run(command: str, context: dict = None):
    """
    DSL 명령어 실행
    
    예:
    run("GET api.github.com/users/github")
    run("weather seoul | slack")
    """
    context = context or {}
    
    # 파이프 분리
    if "|" in command:
        steps = [s.strip() for s in command.split("|")]
        result = None
        for step in steps:
            result = _execute_step(step, result, context)
        return result
    else:
        return _execute_step(command, None, context)

def _execute_step(step: str, input_data, context):
    """단일 스텝 실행"""
    
    # HTTP GET
    if step.upper().startswith("GET "):
        url = step[4:].strip()
        # 변수 치환
        for key, val in context.items():
            url = url.replace(f"${key}", str(val))
        
        print(f"  → GET {url}")
        
        try:
            import requests
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e), "url": url}
    
    # HTTP POST
    elif step.upper().startswith("POST "):
        url = step[5:].strip()
        
        print(f"  → POST {url}")
        
        try:
            import requests
            response = requests.post(url, json=input_data, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e), "url": url}
    
    # 파싱 (input_data 그대로 반환)
    elif step.lower() == "parse":
        print(f"  → Parse")
        return input_data
    
    # Shell 명령
    elif step.startswith("$"):
        cmd = step[1:].strip()
        print(f"  → Shell: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.stdout.strip()
    
    # Echo (테스트용)
    elif step.lower().startswith("echo "):
        text = step[5:].strip()
        print(f"  → Echo: {text}")
        return {"echo": text, "input": input_data}
    
    # 기타: 그대로 반환
    else:
        print(f"  → Pass-through: {step}")
        return {"step": step, "input": input_data}

# 테스트
if __name__ == "__main__":
    print("🧪 DSL 테스트\n")
    
    # 테스트 1: HTTP GET
    print("Test 1: HTTP GET")
    result = run("GET https://api.github.com/users/github")
    print(f"✅ {result.get('name', 'N/A')}\n")
    
    # 테스트 2: 파이프
    print("Test 2: Pipe")
    result = run("echo hello | parse")
    print(f"✅ {result}\n")
    
    # 테스트 3: 변수
    print("Test 3: Variables")
    result = run("echo $name", {"name": "AUTUS"})
    print(f"✅ {result}\n")
