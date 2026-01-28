# 🤖 크라톤(Kraton) AI 봇 - 종합 가이드

> AUTUS 시스템의 AI 실행 엔진
> Telegram: https://t.me/autus_kraton_bot

---

## 개요

**크라톤(Kraton)**은 AUTUS 플랫폼의 AI 비서로, Moltbot 엔진을 기반으로 구축된 Telegram 봇입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                      🤖 크라톤 아키텍처                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   사용자 (Telegram)                                             │
│        ↓                                                        │
│   @autus_kraton_bot                                             │
│        ↓                                                        │
│   Moltbot Gateway (localhost:18789)                             │
│        ↓                                                        │
│   ┌─────────────────────────────────────────┐                   │
│   │         LLM 모델 (Fallback Chain)        │                   │
│   │  1. Ollama (로컬) ← 기본                 │                   │
│   │  2. Gemini (클라우드)                    │                   │
│   │  3. Groq (클라우드)                      │                   │
│   │  4. Claude (유료 백업)                   │                   │
│   └─────────────────────────────────────────┘                   │
│        ↓                                                        │
│   AUTUS Backend (Supabase + FastAPI)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 접속 정보

| 항목 | 값 |
|------|-----|
| **봇 이름** | @autus_kraton_bot |
| **봇 링크** | https://t.me/autus_kraton_bot |
| **허용된 사용자** | 6733089824 (세호) |
| **Gateway 포트** | 18789 |

---

## 이름의 의미

**Kraton** = **K**nowledge + **R**elation + **A**utomation + **T**rust + **O**ptimization + **N**etwork

- **K**nowledge: 지식 기반 의사결정
- **R**elation: 관계 유지력 (R-Score)
- **A**utomation: 98% 자동화 실행
- **T**rust: 신뢰 지수 관리
- **O**ptimization: V-Index 최적화
- **N**etwork: 고객 네트워크 분석

---

## 핵심 기능

### 1. AUTUS 상태 조회
```
AUTUS V-Index 알려줘
오늘 churn 위험 학생 목록
approval_queue 현황
```

### 2. 실시간 모니터링
```
지금 위험 신호 있어?
오늘 Voice 감지된 거 있어?
경쟁사 동향 알려줘
```

### 3. 자동화 실행
```
김민수 학부모에게 상담 문자 보내줘
D학원 대응 전략 실행해
이번 주 리포트 생성해
```

### 4. 개발 지원
```
n8n 워크플로우 JSON 만들어줘
V-Engine 피드백 루프 설계해
API 엔드포인트 추가해줘
```

---

## LLM 모델 구성

### Primary (1순위) - 로컬
```yaml
모델: ollama/llama3.2:3b-instruct-q5_K_M
위치: 로컬 (Mac M3 Pro)
비용: 무료
크기: 2.3GB
속도: ~32 tokens/s
Context: 128K tokens
```

### Fallback Chain (2~4순위)
| 순위 | 모델 | 제공자 | 비용 |
|------|------|--------|------|
| 2 | gemini-2.5-flash | Google | 무료 |
| 3 | llama-3.3-70b-versatile | Groq | 무료 |
| 4 | claude-sonnet-4-5 | Anthropic | 유료 |

---

## 환경 설정

### 설정 파일
```
~/.moltbot/moltbot.json    # Moltbot 메인 설정
~/.clawdbot/agents/        # Agent 데이터
```

### 환경변수
```bash
# Ollama 최적화
OLLAMA_NUM_GPU_LAYERS=999
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_FLASH_ATTENTION=true

# API Keys
OLLAMA_API_KEY=ollama-local
GEMINI_API_KEY=your-key
GROQ_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
```

---

## 실행 방법

### 1. Ollama 시작 (백그라운드)
```bash
ollama serve
```

### 2. Gateway 시작
```bash
cd /Users/oseho/Desktop/autus/clawdbot

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

### 3. Telegram에서 사용
https://t.me/autus_kraton_bot

---

## AUTUS 연동

### Supabase 테이블
```sql
-- 크라톤이 접근하는 주요 테이블
- v_current          -- V-Index 현재값
- approval_queue     -- 승인 대기 큐
- customers          -- 고객 정보
- customer_temperatures  -- 온도 데이터
- voices             -- Voice 데이터
- alerts             -- 알림
- actions            -- 할일
```

### n8n 워크플로우 연동
```
- opinion_shaper.json     -- 여론 모듈
- churn_detection.json    -- 이탈 감지
- daily_report.json       -- 일일 리포트
```

---

## 역할별 접근

### C-Level (Owner)
```
전체 V-Index, 매출 분석, 글로벌 텔레메트리
마스터 비밀번호로 접근
```

### FSD (Manager)
```
판단 + 배분, 리스크 관리, 이탈 방지
C-Level 승인 코드로 접근
```

### Optimus (Operator)
```
자동 실행, Quick Tag, 학생 관리
FSD 승인 코드로 접근
```

---

## 비용 구조

| 항목 | 월 비용 |
|------|---------|
| Ollama (로컬) | ₩0 |
| Gemini Free | ₩0 |
| Groq Free | ₩0 |
| Claude (백업) | 사용량 |
| **합계** | **₩0 ~ ₩5,000** |

---

## 성능 지표

| 메트릭 | 값 |
|--------|-----|
| 평균 응답 시간 | 9~10초 |
| 토큰 처리 속도 | ~32 tokens/s |
| Context Window | 128K tokens |
| GPU 활용 | Metal (M3 Pro) |

---

## 문제 해결

### 봇 응답 없음
```bash
# Gateway 상태 확인
lsof -i :18789

# 재시작
pnpm moltbot gateway --port 18789 --force
```

### Ollama 연결 실패
```bash
# Ollama 상태 확인
curl http://127.0.0.1:11434/api/tags

# 재시작
ollama serve
```

### 모델 변경
```bash
# 다른 모델로 전환
pnpm moltbot models set ollama/llama3.2:3b-instruct-q5_K_M
```

---

## 관련 문서

- [MOLTBOT_SETUP.md](./MOLTBOT_SETUP.md) - Moltbot 세팅 상세
- [KRATON_SPEC.md](./KRATON_SPEC.md) - Kraton 기능 명세
- [KRATON_MVP_ARCHITECTURE.md](./KRATON_MVP_ARCHITECTURE.md) - MVP 아키텍처

---

## 로드맵

- [x] Telegram 봇 연동
- [x] Ollama 로컬 LLM 연동
- [x] Fallback 체인 구성
- [ ] Supabase 연동 테스트
- [ ] n8n 워크플로우 연동
- [ ] 학원 파일럿 자동화
- [ ] Voice 실시간 감지
- [ ] 자동 리포트 생성

---

**봇 링크**: https://t.me/autus_kraton_bot

*"측정할 수 없으면 관리할 수 없다" - 피터 드러커*
