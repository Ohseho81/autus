import os, time, requests, datetime

def autonomous_build():
    # 보안을 위해 직접 주입된 키를 우선 사용
    api_key = "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"
    
    print(f"🚀 {datetime.datetime.now()} - [Moltbot] 엔진 재생성 및 무한 발전 시작...")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AUTUS_BUILDER"
    }
    
    target_file = "/Users/oseho/Desktop/autus/frontend/src/components/Cockpit.tsx"
    os.makedirs(os.path.dirname(target_file), exist_ok=True)

    prompt = "Cockpit.tsx를 '미래 예측 UI'로 완성하세요. React/Tailwind/Framer-motion 코드만 출력."
    
    payload = {
        "model": "anthropic/claude-3.5-sonnet",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=120)
        data = response.json()
        
        if 'choices' in data:
            generated_code = data['choices'][0]['message']['content']
            clean_code = generated_code.replace("```tsx", "").replace("```jsx", "").replace("```", "").strip()
            with open(target_file, 'w') as f:
                f.write(clean_code)
            print(f"✅ [물리적 변화 성공] {datetime.datetime.now()} - 아우투스가 다시 숨을 쉽니다.")
        else:
            print(f"⚠️ 인증 오류: {data}")
            
    except Exception as e:
        print(f"❌ 연결 실패: {e}")

if __name__ == "__main__":
    while True:
        autonomous_build()
        time.sleep(3600)
