import os, time, requests, datetime

# [주의] API 키 인증 방식을 직접 주입 방식으로 최적화
def autonomous_build():
    # 환경변수에서 키를 가져오되, 실패에 대비한 로직 추가
    api_key = os.getenv('OPENROUTER_API_KEY')
    
    if not api_key:
        print("❌ 에러: OPENROUTER_API_KEY를 찾을 수 없습니다. export 명령어를 다시 확인하세요.")
        return

    print(f"🚀 {datetime.datetime.now()} - [Moltbot] 인증 복구 및 무한 발전 재시도...")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AUTUS_BUILDER"
    }
    
    target_file = "/Users/oseho/Desktop/autus/frontend/src/components/Cockpit.tsx"
    
    prompt = "Cockpit.tsx를 '미래 예측 UI'로 완성하세요. React/Tailwind/Framer-motion 코드만 출력."
    
    payload = {
        "model": "anthropic/claude-3.5-sonnet",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        # 인증 헤더를 더 정교하게 구성하여 401 에러 원천 차단
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions", 
            headers=headers, 
            json=payload, 
            timeout=120
        )
        
        if response.status_code == 200:
            data = response.json()
            generated_code = data['choices'][0]['message']['content']
            clean_code = generated_code.replace("```tsx", "").replace("```jsx", "").replace("```", "").strip()
            
            with open(target_file, 'w') as f:
                f.write(clean_code)
            print(f"✅ [물리적 변화 성공] {datetime.datetime.now()} - 인증 통과 및 시스템 진화 완료.")
        else:
            print(f"⚠️ 인증/서버 응답 오류 ({response.status_code}): {response.text}")
            
    except Exception as e:
        print(f"❌ 연결 오류: {e}")

if __name__ == "__main__":
    while True:
        autonomous_build()
        time.sleep(3600)
