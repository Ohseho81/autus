# 🎯 AUTUS = 오너의 조종석

---

## 핵심 철학

```
👑 OWNER (오너)
"목표를 던지고, 예외만 승인하고, 결과를 확인한다"
           │
           ▼
🎛️ AUTUS (조종석)
• 목표 수렴 (Convergence) - 모든 이벤트가 목표로 정렬
• 예외 관리 (Exception) - 필터 통과 못한 것만 보고
• 자동 실행 (Agentic) - 승인된 것은 알아서 처리
• 증거 기록 (Proof) - 모든 판단과 실행의 흔적
           │
           ▼
⚙️ CURSOR (제조 공장)
"AUTUS라는 엔진을 만들고 수리하는 엔지니어의 공간"
→ 오너는 여기 들어올 필요 없음
```

---

## 🎛️ 오너의 AUTUS 활동 3가지

### 1️⃣ 목표 던지기 (Goal Setting)

**"재원 150명, 이탈률 3% 이하, 학부모 만족도 4.5점"**

→ AUTUS가 알아서:
- 모든 이벤트를 목표 기준으로 우선순위 재배치
- 목표 달성에 필요한 전략 자동 추천
- 진행 상황 실시간 트래킹

### 2️⃣ 예외 승인 (Exception Approval)

- **일상적 업무** = 자동 처리 (오너에게 보고 안 함)
- **예외 상황** = 오너에게 "의사결정 요청"

**예시:**
```
⚠️ 예외 발생 #EX-2025-0128-003

상황: 김민수 학부모가 "경쟁사 할인 제안 받았다"고 언급
분석: 이탈 확률 42% → 68%로 급등
제한: 할인 제안은 오너 승인 필요 (정책 #P-007)

대안 A: 10% 할인 (월 -3만원, 유지 확률 85%)
대안 B: 무료 보충수업 제공 (비용 0, 유지 확률 70%)
대안 C: 가치 상담만 진행 (비용 0, 유지 확률 55%)

[A 승인] [B 승인] [C 승인] [직접 처리] [위임]
```

→ 오너: 버튼 하나 클릭
→ AUTUS: 승인된 대안 자동 실행, Proof Pack 기록

### 3️⃣ 결과 확인 (Result Review)

**매일/매주 요약 리포트 (Push 또는 Pull)**

```
📊 Weekly Report - 2025년 1월 4주차

목표 진행률:
• 재원 150명 목표: 132명 (88%) 🟡
• 이탈률 3%: 현재 5% 🔴
• 만족도 4.5: 현재 4.2 🟡

이번 주 처리:
• 자동 처리: 47건
• 오너 승인: 3건
• 성공률: 94%

다음 주 예상:
• 시험 시즌 σ↓ 예상
• D학원 프로모션 대응 필요
```

---

## 💰 비용 최적화 전략

### LLM 계층화

| 작업 유형 | 모델 | 비용 |
|-----------|------|------|
| 단순 분류/추출 | Ollama Local (Llama 3.1 8B) | $0 |
| 중간 추론 | Ollama Local (Llama 3.1 70B) | $0 |
| 복잡한 판단 | Claude Sonnet | $0.003/1K token |
| 고위험 결정 | Claude Opus | $0.015/1K token |

**예상 월 비용 (학원 132명 기준):**
- Local 처리 90%: $0
- Claude API 10%: ~$30/월
- **총 비용: 월 $30 이하**

### 인프라 비용

| 서비스 | 플랜 | 월 비용 |
|--------|------|---------|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| Redis (Upstash) | Free | $0 |
| Ollama | Self-hosted | $0 |
| Claude API | Pay-as-you-go | ~$30 |
| **총계** | | **~$75/월** |

💡 학원 1곳 기준 **월 $75로 완전 자동화 운영 가능**

---

## Ollama 설정

```bash
# 설치
curl -fsSL https://ollama.com/install.sh | sh

# 모델 다운로드
ollama pull llama3.1:8b      # 가벼운 작업용
ollama pull llama3.1:70b     # 추론 작업용
ollama pull deepseek-r1:7b   # 한국어 강화
```

**.env 설정:**
```env
LLM_PRIMARY=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL_LIGHT=llama3.1:8b
OLLAMA_MODEL_HEAVY=llama3.1:70b
LLM_FALLBACK=claude
ANTHROPIC_API_KEY=sk-...
```
