# AUTUS Pack Format Specification
## Version 1.0.0

---

# 1. 개요

Pack은 AUTUS의 확장 단위다.
모든 기능은 Pack으로 구현된다.

---

# 2. 파일 구조
```
pack_name/
├── pack.yaml           # 필수: Pack 정의
├── README.md           # 권장: 설명
├── LICENSE             # 권장: 라이선스
└── tests/              # 권장: 테스트
    └── test_pack.yaml
```

---

# 3. pack.yaml 스키마

## 3.1 필수 필드
```yaml
autus: "1.0"            # string, 필수
name: "pack_name"       # string, 필수, ^[a-z][a-z0-9_]*$
version: "1.0.0"        # string, 필수, semver

cells:                  # array, 필수, 최소 1개
  - name: "cell_name"   # string, 필수
    type: "llm"         # enum: llm | http | local
    output: "result"    # string, 필수
```

## 3.2 선택 필드
```yaml
metadata:
  description: "string"
  author: "string"
  license: "string"
  tags: ["string"]
  homepage: "url"
  repository: "url"

config:
  timeout_ms: 30000     # number, 기본값
  retry_count: 3        # number, 기본값
  cache_ttl_s: 0        # number, 0 = 캐시 안함

dependencies:           # 다른 Pack 의존성
  - name: "other_pack"
    version: ">=1.0.0"

actions:                # 실행 후 액션
  - type: "write_file"
    path: "string"
    content: "string"
```

---

# 4. Cell 타입

## 4.1 LLM Cell
```yaml
- name: "generate"
  type: "llm"
  prompt: |
    당신은 {role}입니다.
    다음 작업을 수행하세요: {task}
  model: "claude-3"     # 선택, 기본값 있음
  temperature: 0.7      # 선택, 0.0-1.0
  max_tokens: 4000      # 선택
  output: "generated_text"
```

## 4.2 HTTP Cell
```yaml
- name: "fetch_data"
  type: "http"
  method: "GET"         # GET | POST | PUT | DELETE
  url: "https://api.example.com/data/{id}"
  headers:
    Authorization: "Bearer {token}"
  body: |               # POST/PUT용
    {"key": "{value}"}
  output: "api_response"
```

## 4.3 Local Cell
```yaml
- name: "process"
  type: "local"
  command: "python"
  args: ["script.py", "{input}"]
  working_dir: "./scripts"
  env:
    API_KEY: "{api_key}"
  output: "processed_data"
```

---

# 5. 변수 시스템

## 5.1 입력 변수
```yaml
# 사용자 입력
cells:
  - name: "greet"
    type: "llm"
    prompt: "안녕 {user_name}!"  # {user_name}은 실행 시 제공
    output: "greeting"
```

## 5.2 Cell 간 참조
```yaml
cells:
  - name: "step1"
    type: "llm"
    prompt: "데이터 분석: {raw_data}"
    output: "analysis"

  - name: "step2"
    type: "llm"
    prompt: "요약: {analysis}"   # step1의 output 참조
    input: "analysis"            # 명시적 의존성
    output: "summary"
```

## 5.3 예약 변수
```yaml
# 시스템 제공 변수
{_timestamp}      # 현재 시간 (ISO)
{_date}           # 현재 날짜
{_pack_name}      # Pack 이름
{_pack_version}   # Pack 버전
{_execution_id}   # 실행 ID (익명)
```

---

# 6. 액션

## 6.1 write_file
```yaml
actions:
  - type: "write_file"
    path: "output/{_date}_result.txt"
    content: "{summary}"
    create_dirs: true   # 디렉토리 자동 생성
```

## 6.2 log
```yaml
actions:
  - type: "log"
    level: "info"       # debug | info | warn | error
    message: "완료: {summary}"
```

## 6.3 notify
```yaml
actions:
  - type: "notify"
    title: "Pack 완료"
    body: "{summary}"
```

---

# 7. 에러 처리

## 7.1 Cell 레벨
```yaml
cells:
  - name: "risky_call"
    type: "http"
    url: "https://unstable-api.com"
    output: "data"
    on_error:
      retry: 3
      fallback: "default_value"
      continue: true    # 에러 시에도 계속 진행
```

## 7.2 Pack 레벨
```yaml
config:
  on_error: "stop"      # stop | continue | rollback
  error_handler: "error_cell"  # 에러 처리 Cell
```

---

# 8. 검증 규칙

## 8.1 이름 규칙
```
Pack 이름: ^[a-z][a-z0-9_]{2,50}$
Cell 이름: ^[a-z][a-z0-9_]{1,30}$
변수 이름: ^[a-z][a-z0-9_]*$
```

## 8.2 크기 제한
```
Pack 전체: < 1MB
pack.yaml: < 100KB
prompt: < 50KB
단일 output: < 10MB
```

## 8.3 보안 규칙
```yaml
# 금지 패턴
forbidden:
  - "eval("
  - "exec("
  - "rm -rf"
  - "DROP TABLE"
  - credentials in plain text
```

---

# 9. 예제

## 9.1 최소 Pack
```yaml
autus: "1.0"
name: "hello"
version: "1.0.0"

cells:
  - name: "greet"
    type: "llm"
    prompt: "Say hello to {name}"
    output: "greeting"
```

## 9.2 완전한 Pack
```yaml
autus: "1.0"
name: "code_reviewer"
version: "1.0.0"

metadata:
  description: "AI 코드 리뷰어"
  author: "anonymous"
  license: "MIT"
  tags: ["development", "code", "review"]

config:
  timeout_ms: 60000
  retry_count: 2

cells:
  - name: "analyze"
    type: "llm"
    prompt: |
      다음 코드를 분석하세요:
```
      {code}
```
      보안, 성능, 가독성 관점에서 분석해주세요.
    temperature: 0.3
    output: "analysis"

  - name: "suggest"
    type: "llm"
    prompt: |
      분석 결과: {analysis}
      
      개선 제안을 구체적으로 작성해주세요.
    input: "analysis"
    output: "suggestions"

  - name: "format"
    type: "llm"
    prompt: |
      다음 내용을 마크다운으로 정리:
      
      ## 분석
      {analysis}
      
      ## 제안
      {suggestions}
    input: "suggestions"
    output: "report"

actions:
  - type: "write_file"
    path: "reviews/{_date}_review.md"
    content: "{report}"
    create_dirs: true

  - type: "log"
    message: "코드 리뷰 완료"
```

---

# 10. 호환성

## 10.1 버전 호환

| Pack autus | 구현 autus | 호환 |
|------------|------------|------|
| 1.0 | 1.0 | ✅ |
| 1.0 | 1.1 | ✅ |
| 1.1 | 1.0 | ⚠️ 일부 |
| 2.0 | 1.x | ❌ |

## 10.2 검증 명령
```bash
autus pack validate pack.yaml
autus pack test pack.yaml
autus pack audit pack.yaml
```

---

# 서명
```
AUTUS Pack Format Specification

Version: 1.0.0
Status: Stable
License: CC0

"Pack은 레고 블록이다.
조합하면 무엇이든 된다."
```
