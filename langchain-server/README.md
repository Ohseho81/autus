# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```











# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```

# 🧠 AUTUS LangChain AI Server

Grok + Claude + GPT 통합 분석 API 서버

## 🚀 빠른 시작

```bash
cd langchain-server

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
# 아래 API 키들을 발급받아 입력

# 서버 실행
npm start
```

## 🔑 API 키 설정

`.env` 파일 생성:

```env
# OpenAI API Key (GPT-4o)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# Anthropic API Key (Claude)
# https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# xAI API Key (Grok)
# https://console.x.ai/
XAI_API_KEY=xai-your-grok-key

# Server Port
PORT=3001
```

## 📡 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 + 모델 상태 |
| POST | `/api/analyze` | 전체 최적화 분석 |
| POST | `/api/predict` | 12개월 돈 예측 |
| POST | `/api/automate` | 자동화 제안 |
| POST | `/api/bottleneck` | 병목 지점 탐지 |
| POST | `/api/synergy` | 시너지 최적화 |
| POST | `/api/node` | 노드별 개별 분석 |

## 📨 요청 예시

### 전체 분석

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id": "P01", "name": "오세호", "value": 56000000},
      {"id": "P02", "name": "김경희", "value": 25000000}
    ],
    "links": [
      {"source": "P01", "target": "P02", "value": 15000000, "synergy": 0.25}
    ]
  }'
```

### 12개월 예측

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [...],
    "links": [...],
    "months": 12,
    "synergyRate": 0.3
  }'
```

## 🤖 AI 모델 우선순위

- **분석/병목**: Claude (논리적 분석 우수)
- **예측/시너지**: GPT-4o (수치 계산 정확)
- **자동화**: Grok (실용적 제안)

API 키가 없는 모델은 자동으로 다음 모델로 대체됩니다.

## 🔧 시뮬레이션 모드

모든 API 키가 없어도 시뮬레이션 응답이 제공됩니다.
테스트 및 데모에 활용 가능.

## 📊 응답 형식

```json
{
  "model": "claude",
  "content": "## AI 분석 결과\n...",
  "success": true
}
```

## 🔗 프론트엔드 연동

`physics_map_langchain.html`에서 자동으로 이 서버에 연결됩니다.

```javascript
const result = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nodes, links })
});
```
















