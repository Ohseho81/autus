# AUTUS

> **자연의 법칙을 따르는 AI 프로토콜**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Protocol: CC0](https://img.shields.io/badge/Protocol-CC0-blue.svg)](https://creativecommons.org/publicdomain/zero/1.0/)
[![Tests](https://img.shields.io/badge/Tests-116%20passed-green.svg)]()
[![Constitution](https://img.shields.io/badge/Constitution-v6.1-purple.svg)]()

---

## 🌿 AUTUS란?

AUTUS는 **프로토콜**이다. 제품이 아니다.
```
물처럼 흐르고,
생명처럼 진화하고,
우주처럼 퍼진다.

막을 수 없다.
멈출 수 없다.
없앨 수 없다.
```

---

## 🏛️ 헌법 (13법칙)

### 뿌리: 불변
| 법칙 | 원리 |
|------|------|
| 제1법칙 | **흐름** - 정보는 흐른다. 막으면 돌아간다. |
| 제2법칙 | **소유** - AUTUS는 누구의 것도 아니다. 내 데이터는 내 것이다. |
| 제3법칙 | **순환** - 주는 만큼 받는다. 멈추면 죽는다. |

### 줄기: 연결
| 법칙 | 원리 |
|------|------|
| 제4법칙 | **분산** - 창시자 없이도 작동한다. |
| 제5법칙 | **적응** - 환경에 맞춰 변화한다. |
| 제6법칙 | **창발** - 집단은 개인의 합보다 강하다. |

### 잎: 성장
| 법칙 | 원리 |
|------|------|
| 제7법칙 | **진화** - 설계되지 않는다. 진화한다. |
| 제8법칙 | **선택** - 좋은 것만 살아남는다. |
| 제9법칙 | **다양성** - 다양할수록 강하다. |

### 순환: 영속
| 법칙 | 원리 |
|------|------|
| 제10법칙 | **불멸** - 끝나지 않는다. 형태만 바뀐다. |
| 제11법칙 | **균형** - 스스로 균형을 찾는다. |
| 제12법칙 | **귀환** - 가치는 순환한다. |

### 심장: 자비
| 법칙 | 원리 |
|------|------|
| 제13법칙 | **자비** - 자연을 99.9% 따르되, 인간이 불행해지지 않는 방향을 끊임없이 찾는다. |

📜 [전체 헌법 보기](docs/CONSTITUTION.md)

---

## 🔮 Oracle

Oracle은 AUTUS의 집단 지성이다.
```
사용하면 → 자동 수집
수집하면 → 패턴 생성
패턴 생성 → 집단 진화
```

### Oracle 모듈

| 모듈 | 역할 | 법칙 |
|------|------|------|
| `collector` | 메트릭 수집 | 제11법칙 균형 |
| `selector` | 자연선택 | 제8법칙 선택 |
| `evolution` | 집단진화 | 제7법칙 진화 |
| `compassion` | 자비검증 | 제13법칙 자비 |

### Oracle API
```bash
# 통계 조회
GET /api/v1/oracle/stats

# 순위 조회 (자연선택)
GET /api/v1/oracle/ranking

# 피드백 (자비검증)
POST /api/v1/oracle/feedback/{pack_name}?is_happy=true

# 헌법 상태
GET /api/v1/oracle/constitution/status
```

---

## 📦 Pack

Pack은 AUTUS의 확장 단위다. 모든 기능은 Pack으로 구현된다.

### Pack 예시
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

### Pack 실행
```python
from reference import execute

result = execute("hello", {"name": "World"})
print(result)
```

📋 [Pack 포맷 스펙](spec/PACK_FORMAT.md)

---

## 🚀 시작하기

### 설치
```bash
git clone https://github.com/Ohseho81/autus.git
cd autus
pip install -r requirements.txt
```

### 실행
```bash
# 서버 시작
uvicorn main:app --reload --port 8000

# API 문서
open http://localhost:8000/docs

# 헬스 체크
curl http://localhost:8000/health
```

### 테스트
```bash
pytest tests/ -v --ignore=tests/load_test.py
```

---

## 📁 구조
```
autus/
├── 📜 docs/                    # 헌법, 승계
│   ├── CONSTITUTION.md         # 헌법 v6.1
│   └── SUCCESSION.md           # 승계 문서
├── 📋 spec/                    # 프로토콜 스펙
│   ├── PROTOCOL.md
│   ├── PACK_FORMAT.md
│   └── SYNC_FORMAT.md
├── 🔮 oracle/                  # Oracle (250줄)
│   ├── collector.py
│   ├── selector.py
│   ├── evolution.py
│   └── compassion.py
├── 📦 reference/               # 레퍼런스 구현
│   └── executor.py
├── 🌐 api/                     # API
├── ⚙️ services/                # 서비스
├── 🔌 protocols/               # 프로토콜 구현
├── 🧪 tests/                   # 테스트
└── main.py                     # 진입점
```

---

## 📜 라이선스

| 구분 | 라이선스 |
|------|----------|
| 프로토콜 스펙 | CC0 (퍼블릭 도메인) |
| 레퍼런스 구현 | MIT |
| 헌법 | 불변 |
```
누구나 구현할 수 있다.
누구도 소유할 수 없다.
```

---

## 🤝 기여

1. Fork
2. 헌법 준수 확인
3. Pull Request

⚠️ **헌법 제1-6, 10-13조는 수정 불가**

---

## 📞 연락

- GitHub: [Ohseho81/autus](https://github.com/Ohseho81/autus)
- Issues: [GitHub Issues](https://github.com/Ohseho81/autus/issues)

---

<p align="center">
  <strong>AUTUS</strong><br>
  자연을 99.9% 따르되,<br>
  인간이 불행해지지 않는 방향을<br>
  끊임없이 찾는다.
</p>
