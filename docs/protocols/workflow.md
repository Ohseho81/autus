# Workflow Graph Protocol

> AUTUS Workflow Graph Standard - 개인 행동 패턴을 그래프로 표현하는 표준

---

## 개요

Workflow Graph Protocol은 모든 SaaS 회사가 지원해야 하는 개인 행동 패턴 표준 형식입니다. 사용자의 자동화 워크플로우를 노드와 엣지로 표현합니다.

---

## 구조

### WorkflowGraph 클래스

```python
from protocols.workflow import WorkflowGraph

# 노드와 엣지로 그래프 생성
nodes = [
    {'id': '1', 'type': 'trigger', 'name': 'wake_up'},
    {'id': '2', 'type': 'action', 'name': 'check_email'}
]
edges = [
    {'source': '1', 'target': '2', 'type': 'sequence'}
]

graph = WorkflowGraph(nodes, edges)
```

---

## 주요 메서드

### `validate() -> bool`

워크플로우 그래프의 유효성을 검증합니다.

```python
if graph.validate():
    print("✅ Valid workflow graph")
else:
    print("❌ Invalid workflow graph")
```

**검증 규칙**:
- 모든 노드는 `id`와 `type` 필드를 가져야 함
- 모든 엣지는 `source`와 `target` 필드를 가져야 함

### `to_json() -> str`

워크플로우 그래프를 JSON 형식으로 변환합니다.

```python
json_str = graph.to_json()
# {"nodes": [...], "edges": [...]}
```

### `from_json(json_str: str) -> WorkflowGraph`

JSON 문자열로부터 WorkflowGraph를 생성합니다.

```python
json_str = '{"nodes": [...], "edges": [...]}'
graph = WorkflowGraph.from_json(json_str)
```

---

## 노드 타입

- **trigger**: 워크플로우 시작 트리거
- **action**: 실행할 액션
- **condition**: 조건 분기
- **delay**: 지연
- **notification**: 알림

---

## 엣지 타입

- **sequence**: 순차 실행
- **conditional**: 조건부 분기
- **if_true**: 조건이 참일 때
- **if_false**: 조건이 거짓일 때
- **parallel**: 병렬 실행

---

## 사용 예시

### 예시 1: 아침 루틴

```python
from protocols.workflow import WorkflowGraph

nodes = [
    {'id': '1', 'type': 'trigger', 'name': 'wake_up', 'time': '07:00'},
    {'id': '2', 'type': 'action', 'name': 'check_email', 'app': 'gmail'},
    {'id': '3', 'type': 'condition', 'name': 'has_urgent', 'threshold': 'high'},
    {'id': '4', 'type': 'action', 'name': 'notify_slack', 'app': 'slack'}
]

edges = [
    {'source': '1', 'target': '2', 'type': 'sequence'},
    {'source': '2', 'target': '3', 'type': 'conditional'},
    {'source': '3', 'target': '4', 'type': 'if_true'}
]

graph = WorkflowGraph(nodes, edges)

if graph.validate():
    # JSON으로 저장
    json_str = graph.to_json()
    print(json_str)
```

### 예시 2: JSON에서 로드

```python
json_str = '''
{
  "nodes": [
    {"id": "1", "type": "trigger", "name": "wake_up"},
    {"id": "2", "type": "action", "name": "check_email"}
  ],
  "edges": [
    {"source": "1", "target": "2", "type": "sequence"}
  ]
}
'''

graph = WorkflowGraph.from_json(json_str)
assert graph.validate()
```

---

## 테스트

```bash
# 모든 테스트 실행
pytest tests/protocols/workflow/test_workflow.py -v

# 커버리지 확인
pytest tests/protocols/workflow/test_workflow.py --cov=protocols/workflow
```

**테스트 결과**: ✅ 11개 테스트 모두 통과

---

## 표준 형식

### JSON 스키마

```json
{
  "nodes": [
    {
      "id": "string (required)",
      "type": "string (required)",
      "name": "string (optional)",
      "...": "additional metadata"
    }
  ],
  "edges": [
    {
      "source": "string (required)",
      "target": "string (required)",
      "type": "string (optional)",
      "...": "additional metadata"
    }
  ]
}
```

---

## 파일 형식

워크플로우 그래프는 `.autus.graph.json` 파일로 저장됩니다.

```
.autus/
└── workflow.graph.json
```

---

## 참고

- [AUTUS Constitution](../CONSTITUTION.md)
- [Protocol Standards](../../README.md#core-protocols)

---

*Last Updated: 2024-11-22*
*Version: 1.0.0*





