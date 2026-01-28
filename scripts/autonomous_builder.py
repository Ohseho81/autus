#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
🤖 AUTUS Autonomous Builder
Claude 3.5 Sonnet이 자동으로 코드를 생성하는 스크립트
안전하게 ai-generated/ 폴더에 저장
═══════════════════════════════════════════════════════════════════════════════

실행: python3 scripts/autonomous_builder.py
"""

import os
import datetime
import requests
import time
import random

# ─────────────────────────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────────────────────────

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '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')
MODEL = "anthropic/claude-3.5-sonnet"
BASE_PATH = "/Users/oseho/Desktop/autus/ai-generated"
INTERVAL_SECONDS = 3600  # 1시간

# ─────────────────────────────────────────────────────────────────────
# 생성 작업 목록
# ─────────────────────────────────────────────────────────────────────

TASKS = [
    {
        "type": "components",
        "name": "TemperatureGauge",
        "prompt": """AUTUS 2.0의 온도 게이지 컴포넌트를 만들어줘.
- React + TypeScript + Framer Motion
- Tailwind CSS 사용
- 0-100도 범위, 색상: 빨강(0-40), 노랑(40-70), 초록(70-100)
- 애니메이션 있는 원형 게이지
- props: temperature, label, size"""
    },
    {
        "type": "components",
        "name": "CustomerCard",
        "prompt": """AUTUS 2.0의 고객 카드 컴포넌트를 만들어줘.
- React + TypeScript + Framer Motion
- Tailwind CSS, 다크 테마 (slate-800 배경)
- 고객 이름, 온도, TSEL 점수, 이탈 확률 표시
- 호버 시 확대 효과
- 클릭 시 onSelect 콜백"""
    },
    {
        "type": "components", 
        "name": "AlertBanner",
        "prompt": """AUTUS 2.0의 알림 배너 컴포넌트를 만들어줘.
- React + TypeScript + Framer Motion
- 타입: success, warning, danger, info
- 아이콘 + 메시지 + 닫기 버튼
- 슬라이드 인/아웃 애니메이션
- auto-dismiss 옵션"""
    },
    {
        "type": "components",
        "name": "DataChart",
        "prompt": """AUTUS 2.0의 간단한 바 차트 컴포넌트를 만들어줘.
- React + TypeScript + Framer Motion
- SVG 기반 (외부 라이브러리 없이)
- 데이터: [{label, value, color}] 배열
- 애니메이션으로 바가 올라오는 효과
- 반응형"""
    },
    {
        "type": "hooks",
        "name": "useTemperature",
        "prompt": """AUTUS 2.0의 온도 계산 훅을 만들어줘.
- TypeScript
- TSEL 점수(T,S,E,L)를 받아서 온도 계산
- 온도 = (T*0.25 + S*0.30 + E*0.25 + L*0.20)
- 상태(healthy/warning/critical) 반환
- 색상 코드 반환"""
    },
]

# ─────────────────────────────────────────────────────────────────────
# API 호출
# ─────────────────────────────────────────────────────────────────────

def call_claude(prompt: str) -> str:
    """Claude 3.5 Sonnet에게 코드 생성 요청"""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    
    system_prompt = """당신은 AUTUS 2.0의 코드 생성 AI입니다.
    
규칙:
1. React + TypeScript 코드만 생성
2. Tailwind CSS 사용
3. Framer Motion으로 애니메이션
4. 다크 테마 (slate-800/900 배경)
5. 완전한 코드만 출력 (설명 없이)
6. export default 포함
7. 필요한 import 모두 포함"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 2000,
        "temperature": 0.7,
    }
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        return response.json()['choices'][0]['message']['content']
    else:
        raise Exception(f"API 오류: {response.status_code} - {response.text}")

# ─────────────────────────────────────────────────────────────────────
# 코드 정리
# ─────────────────────────────────────────────────────────────────────

def clean_code(raw_code: str) -> str:
    """마크다운 코드 블록 제거"""
    code = raw_code
    
    # 코드 블록 시작 제거
    for lang in ['```tsx', '```typescript', '```jsx', '```js', '```']:
        code = code.replace(lang, '')
    
    # 앞뒤 공백 제거
    code = code.strip()
    
    return code

# ─────────────────────────────────────────────────────────────────────
# 파일 저장
# ─────────────────────────────────────────────────────────────────────

def save_component(task: dict, code: str) -> str:
    """생성된 코드를 파일로 저장"""
    timestamp = datetime.datetime.now().strftime('%m%d_%H%M')
    
    # 파일 확장자 결정
    ext = '.ts' if task['type'] == 'hooks' or task['type'] == 'utils' else '.tsx'
    
    # 파일 경로
    folder = os.path.join(BASE_PATH, task['type'])
    os.makedirs(folder, exist_ok=True)
    
    filename = f"{task['name']}_{timestamp}{ext}"
    filepath = os.path.join(folder, filename)
    
    # 코드 저장
    clean = clean_code(code)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(clean)
    
    return filepath

def save_log(task: dict, code: str, filepath: str):
    """빌드 로그 저장"""
    timestamp = datetime.datetime.now().strftime('%m%d_%H%M')
    log_folder = os.path.join(BASE_PATH, 'logs')
    os.makedirs(log_folder, exist_ok=True)
    
    log_path = os.path.join(log_folder, f"build_{timestamp}.md")
    
    log_content = f"""# Build Log - {datetime.datetime.now().isoformat()}

## Task
- Type: {task['type']}
- Name: {task['name']}

## Prompt
{task['prompt']}

## Generated File
{filepath}

## Code
```tsx
{clean_code(code)}
```
"""
    
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write(log_content)

# ─────────────────────────────────────────────────────────────────────
# 메인 루프
# ─────────────────────────────────────────────────────────────────────

def autonomous_build():
    """자동 빌드 실행"""
    # 랜덤하게 작업 선택
    task = random.choice(TASKS)
    
    print(f"🛠️ {datetime.datetime.now()} - 생성 중: {task['name']}")
    print(f"   타입: {task['type']}")
    
    try:
        # Claude에게 코드 생성 요청
        code = call_claude(task['prompt'])
        
        # 파일 저장
        filepath = save_component(task, code)
        
        # 로그 저장
        save_log(task, code, filepath)
        
        print(f"✅ 완료: {filepath}")
        
    except Exception as e:
        print(f"❌ 오류: {e}")

def main():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║  🤖 AUTUS Autonomous Builder                                  ║
║  Claude 3.5 Sonnet 자동 코드 생성                              ║
╠═══════════════════════════════════════════════════════════════╣
║  저장 위치: /autus/ai-generated/                              ║
║  주기: 1시간                                                   ║
║  Ctrl+C로 종료                                                 ║
╚═══════════════════════════════════════════════════════════════╝
""")
    
    # 첫 실행
    autonomous_build()
    
    # 반복 실행
    while True:
        print(f"\n⏰ 다음 빌드까지 {INTERVAL_SECONDS // 60}분 대기...")
        time.sleep(INTERVAL_SECONDS)
        autonomous_build()

if __name__ == "__main__":
    main()
