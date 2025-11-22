"""
LLM 인터페이스 (Claude API)
"""
import os

def generate_cell(description: str) -> str:
    """
    Cell DSL 생성
    
    Args:
        description: Cell 설명
    
    Returns:
        DSL 명령어
    """
    
    # API 키 확인
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("⚠️  ANTHROPIC_API_KEY 환경변수 없음")
        print("   기본 명령어 반환")
        return f"echo {description}"
    
    try:
        import anthropic
        
        client = anthropic.Anthropic(api_key=api_key)
        
        prompt = f"""AUTUS Cell DSL로 다음 기능을 구현하세요:
{description}

규칙:
- GET url 형식 또는 POST url 형식
- 파이프 가능: cmd | parse | next
- 변수: $name 형식

예시:
"GET api.weather.com/$city"
"GET api.github.com/users/$user | parse"

DSL 명령어만 반환:"""
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text.strip().strip('"')
        
    except Exception as e:
        print(f"⚠️  LLM 생성 실패: {e}")
        return f"echo {description}"

def execute(intention: str, context=None):
    """
    LLM으로 의도 실행
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY 없음", "intention": intention}
    
    try:
        import anthropic
        
        client = anthropic.Anthropic(api_key=api_key)
        
        prompt = f"""
당신은 AUTUS Cell 실행기입니다.

의도: {intention}
입력: {context}

위 의도를 실행하고 결과를 JSON으로 반환하세요.
"""
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return message.content[0].text
        
    except Exception as e:
        return {"error": str(e), "intention": intention}

# 테스트
if __name__ == "__main__":
    print("🧪 LLM 테스트\n")
    
    # Cell 생성
    cell = generate_cell("서울 날씨 조회")
    print(f"✅ 생성된 Cell: {cell}\n")
