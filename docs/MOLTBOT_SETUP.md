# AUTUS × Moltbot 세팅 현황

> 최종 업데이트: 2026-01-28

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTUS + Moltbot 아키텍처                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Telegram (@autus_kraton_bot)                                  │
│         ↓                                                       │
│   Moltbot Gateway (localhost:18789)                             │
│         ↓                                                       │
│   LLM Fallback Chain:                                           │
│     1. Ollama (로컬, 무료) ─────────────────────┐               │
│     2. Gemini (클라우드, 무료)                   │ 자동 전환     │
│     3. Groq (클라우드, 무료)                     │               │
│     4. Claude (클라우드, 유료) ←─────────────────┘               │
│         ↓                                                       │
│   AUTUS Backend (Supabase + FastAPI)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 하드웨어 환경

| 항목 | 값 |
|------|-----|
| Mac | Apple M3 Pro |
| RAM | 18GB |
| Ollama 버전 | v0.13.0 |
| Moltbot 버전 | 2026.1.27-beta.1 |

## LLM 모델 설정

### Primary Model (1순위)
```
ollama/llama3.2:3b-instruct-q5_K_M
├── 위치: 로컬 (Mac)
├── 비용: 무료
├── 크기: 2.3GB
├── Context Window: 128K tokens
├── 속도: ~32 tokens/s
└── 최적화: Q5_K_M 양자화
```

### Fallback Chain (2~4순위)
| 순위 | 모델 | 제공자 | 비용 | 용도 |
|------|------|--------|------|------|
| 2 | gemini-2.5-flash | Google | 무료 | Ollama 실패 시 |
| 3 | llama-3.3-70b-versatile | Groq | 무료 | Gemini 할당량 초과 시 |
| 4 | claude-sonnet-4-5 | Anthropic | 유료 | 최후 백업 |

## Telegram 봇 설정

| 항목 | 값 |
|------|-----|
| 봇 이름 | @autus_kraton_bot |
| 봇 링크 | https://t.me/autus_kraton_bot |
| 허용된 사용자 ID | 6733089824 |
| 그룹 정책 | open |

## Gateway 설정

| 항목 | 값 |
|------|-----|
| 포트 | 18789 |
| 모드 | local |
| 바인드 | loopback |
| 인증 | token |

## 환경변수

```bash
# Ollama (로컬)
OLLAMA_API_KEY=ollama-local
OLLAMA_BASE_URL=http://127.0.0.1:11434/v1

# Ollama 최적화
OLLAMA_NUM_GPU_LAYERS=999
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_FLASH_ATTENTION=true

# Gemini (무료)
GEMINI_API_KEY=AIzaSyAG...

# Groq (무료)
GROQ_API_KEY=gsk_HOKC...

# Claude (유료 백업)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## 설정 파일 위치

| 파일 | 경로 |
|------|------|
| Moltbot 설정 | `~/.moltbot/moltbot.json` |
| Agent 디렉토리 | `~/.clawdbot/agents/main/agent` |
| 로그 파일 | `/tmp/moltbot/moltbot-YYYY-MM-DD.log` |
| Clawdbot 소스 | `/Users/oseho/Desktop/autus/clawdbot` |

## 실행 방법

### Gateway 시작
```bash
cd /Users/oseho/Desktop/autus/clawdbot

# 환경변수 설정 후 실행
export OLLAMA_NUM_GPU_LAYERS=999
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_FLASH_ATTENTION=true
export OLLAMA_API_KEY="ollama-local"
export GEMINI_API_KEY="your-key"
export GROQ_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"

pnpm moltbot gateway --port 18789 --force
```

### 상태 확인
```bash
# 모델 상태
pnpm moltbot models status

# 로그 확인
tail -f /tmp/moltbot/moltbot-$(date +%Y-%m-%d).log

# 포트 확인
lsof -i :18789
```

### Ollama 관리
```bash
# 모델 목록
ollama list

# 모델 실행 테스트
ollama run llama3.2:3b-instruct-q5_K_M

# 모델 다운로드
ollama pull llama3.2:3b-instruct-q5_K_M
```

## 비용 구조

| 항목 | 월 비용 |
|------|---------|
| Ollama (로컬) | **₩0** |
| Gemini Free Tier | **₩0** |
| Groq Free Tier | **₩0** |
| Claude (백업) | 사용량 따라 |
| **총 예상** | **₩0 ~ ₩5,000** |

## 성능 지표

| 메트릭 | 값 |
|--------|-----|
| 평균 응답 시간 | 9~10초 |
| 토큰 처리 속도 | ~32 tokens/s |
| Context Window | 128K tokens |
| GPU 활용 | Metal (M3 Pro) |

## 문제 해결

### Ollama 연결 실패
```bash
# Ollama 서버 상태 확인
curl http://127.0.0.1:11434/api/tags

# Ollama 재시작
ollama serve
```

### Gateway 재시작
```bash
# 기존 프로세스 종료 후 재시작
pnpm moltbot gateway --port 18789 --force
```

### 모델 변경
```bash
# moltbot.json에서 primary 모델 변경
# "primary": "ollama/llama3.2:3b-instruct-q5_K_M"

# 또는 CLI로 변경
pnpm moltbot models set ollama/llama3.2:3b-instruct-q5_K_M
```

## 다음 단계

- [ ] Supabase 연동 테스트 (V-Index 조회)
- [ ] n8n 워크플로우 연동
- [ ] 학원 파일럿 자동화
- [ ] approval_queue 쓰기 테스트

---

**문의**: Telegram @autus_kraton_bot
