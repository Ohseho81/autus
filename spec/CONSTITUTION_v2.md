# AUTUS CONSTITUTION v2.0 (BEZOS EDITION)

Status: 🔒 LOCKED
Supersedes: v1.0 (Semantic Neutrality 원칙 폐기)

---

## 0. 한 줄 정의 (개정)

```
AUTUS는 사용자를 강제로 성공 궤도에 올리는 
데이터 기반 실행 엔진이다.
```

---

## 1. 핵심 원칙 (개정)

### 1.1 Day 1 정신: Action-First

```
❌ 폐기: "시스템은 침묵한다"
✅ 신설: "시스템은 즉각적인 실행을 강제한다"

- 3페이지 완료 시 즉시 CTA 버튼 활성화
- 결정의 지연(Latency)은 죄악
- One-Way Door Decision 강제
```

### 1.2 데이터 강박: Anti-Hallucination

```
❌ 폐기: "사용자 입력만 사용"
✅ 신설: "외부 데이터로 객관적 질량 산출"

- 주관적 입력 금지
- 캘린더/자산/스크린타임 API 강제 연동
- "당신의 밀도는 사실 X가 아니라 Y입니다" 표시
```

### 1.3 The Culling: 노드 자동 분류

```
❌ 폐기: "모든 노드는 동등하다"
✅ 신설: "시스템이 기생 노드를 자동 식별"

- 기여도 지수(ROI) 기반 자동 분류
- 목표와 비정렬 노드 = 붉은색 경고
- Cut or Fade 알고리즘 적용
```

### 1.4 Working Backwards: 역산 시스템

```
❌ 폐기: "목표→r→σ 단방향"
✅ 신설: "미래 PR → 필요 질량 역산"

- Future Press Release 입력 필수
- 목표 수치에서 오늘 할 일 자동 제안
- Gap(부족분) 시각화로 압박
```

### 1.5 결과 중심: Obsession on Results

```
❌ 폐기: "판단 없이 표시"
✅ 신설: "페이지마다 결정 강제"

- 페이지 전환 시 팝업: "내린 결정은 무엇인가?"
- 결정 없이는 다음 페이지 이동 불가
- 비즈니스 결과 추적
```

---

## 2. 3페이지 구조 (개정)

### PAGE 1: Working Backwards (목표 역산)

```
기능:
─────────────────────────────────────────────────────────────────
- [Future PR] 입력 필드 (미래 보도자료)
- 목표 수치에서 필요 질량(M_required) 자동 산출
- 현재 vs 목표 Gap을 에너지 결핍으로 시각화

물리 바인딩:
─────────────────────────────────────────────────────────────────
- Gap = M_required - M_current
- 부족분 = 붉은색 영역으로 표시
- "지금 당장 X만큼 더 필요합니다" 메시지

UI 변경:
─────────────────────────────────────────────────────────────────
- 중앙: Future PR 텍스트 입력
- 하단: 역산된 일일 할당량 표시
- CTA: "오늘의 첫 번째 행동 예약"
```

### PAGE 2: The Culling (노드 정리)

```
기능:
─────────────────────────────────────────────────────────────────
- 기여도 지수(Contribution Index) 자동 산출
- 목표 비정렬 노드 자동 식별 및 붉은색 표시
- Swipe Out → 물리적 제재 연동 (DND, 앱 차단)

물리 바인딩:
─────────────────────────────────────────────────────────────────
- contribution = correlation(node, goal) × flow
- contribution < threshold → "중력 간섭원" 분류
- 제거하지 않으면 P_outcome 강제 감소

UI 변경:
─────────────────────────────────────────────────────────────────
- 기생 노드: 붉은 글로우 + 경고 라벨
- 드래그 제거 시: "현실에서도 끊으세요" 메시지
- CTA: "상위 3개 간섭원 제거"
```

### PAGE 3: Input Metrics (데이터 강제 주입)

```
기능:
─────────────────────────────────────────────────────────────────
- 수동 슬라이더 제거
- 외부 API 강제 연동:
  - Energy: Google Calendar API (가용 시간)
  - Constraint: 은행 API (잔고/지출)
  - Pattern: Screen Time API (앱 사용량)

물리 바인딩:
─────────────────────────────────────────────────────────────────
- 실제 데이터 악화 → 만다라 구조 왜곡
- 유튜브 시청↑ → σ 폭발, P_outcome 급락
- "기분 좋은 조절" 불가능

UI 변경:
─────────────────────────────────────────────────────────────────
- 각 슬롯: API 연결 상태 표시
- 데이터 악화 시: 붉은색 경고 + 진동
- CTA: "지금 당장 행동 변경"
```

---

## 3. Semantic Policy (개정)

### 3.1 허용 언어 (신설)

```
✅ 이제 허용:
- "성공 확률", "실패 위험"
- "좋은 노드", "나쁜 노드"
- "최적 경로", "비효율적 경로"
- "~해야 합니다", "~하세요"
- "추천", "제안", "권고"
- "강제", "압박", "냉혹한"
```

### 3.2 필수 메시지 (신설)

```
각 페이지에서 반드시 표시:
- P1: "당신은 아직 X만큼 부족합니다"
- P2: "이 노드가 당신의 성공을 방해합니다"
- P3: "실제 데이터가 당신의 거짓말을 폭로합니다"
```

### 3.3 CTA 강제 (신설)

```
페이지 전환 조건:
- 결정 미입력 시 다음 페이지 이동 불가
- Commit 버튼 누르기 전 확인 팝업
- "이 결정을 내렸습니까? [예/아니오]"
```

---

## 4. 플라이휠 메커니즘 (신설)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTUS FLYWHEEL                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. P3 (Input): 실제 데이터 투입 → 엔트로피 감소               │
│            ↓                                                    │
│  2. P1 (Process): 밀도 상승 → 성공 확신 증가                   │
│            ↓                                                    │
│  3. P2 (Output): 방해 제거 → 실행 속도 극대화                  │
│            ↓                                                    │
│  4. Result: 실제 성과 → 다시 P3 자원 증가                      │
│            ↓                                                    │
│  (반복: 자가 증식 구조)                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API 연동 (필수)

### 5.1 필수 연동 API

```python
REQUIRED_APIS = {
    "calendar": {
        "source": "Google Calendar",
        "target": "Energy slot",
        "metric": "available_hours_today"
    },
    "finance": {
        "source": "Bank API / Plaid",
        "target": "Constraint slot",
        "metric": "available_budget"
    },
    "screen_time": {
        "source": "iOS Screen Time / Digital Wellbeing",
        "target": "Pattern slot",
        "metric": "productive_hours_ratio"
    },
    "activity": {
        "source": "Health API",
        "target": "Recovery slot",
        "metric": "energy_level"
    }
}
```

### 5.2 Data Mirror 기능

```python
def data_mirror(user_claim: float, actual_data: float) -> str:
    """
    사용자의 주관적 주장과 실제 데이터를 비교하여
    거짓말을 폭로하는 메시지 생성
    """
    gap = user_claim - actual_data
    
    if gap > 0.2:
        return f"당신은 {user_claim:.1f}라고 생각했지만, 실제로는 {actual_data:.1f}입니다."
    
    return None  # 일치하면 메시지 없음
```

---

## 6. Auto-Identification 알고리즘 (신설)

### 6.1 기생 노드 식별

```python
def identify_parasitic_nodes(graph: Graph, goal: Goal) -> List[Node]:
    """
    목표와 정렬되지 않은 노드를 자동 식별
    """
    parasitic = []
    
    for node in graph.nodes:
        contribution = calculate_contribution(node, goal)
        
        if contribution < CONTRIBUTION_THRESHOLD:
            node.classification = "PARASITIC"
            node.warning = "이 노드가 당신의 성공을 방해합니다"
            parasitic.append(node)
    
    return parasitic


def calculate_contribution(node: Node, goal: Goal) -> float:
    """
    노드의 목표 기여도 산출
    """
    alignment = cosine_similarity(node.vector, goal.vector)
    flow_value = node.outgoing_flow / node.mass
    
    return alignment * flow_value
```

### 6.2 최적 경로 추천

```python
def recommend_optimal_path(graph: Graph, current: Node, goal: Node) -> Path:
    """
    Density 손실 최소화 경로 자동 추천
    """
    all_paths = find_all_paths(graph, current, goal)
    
    # 각 경로의 Density 손실 계산
    for path in all_paths:
        path.density_loss = calculate_density_loss(path)
    
    # 최적 경로 선택
    optimal = min(all_paths, key=lambda p: p.density_loss)
    optimal.label = "추천 경로"
    
    return optimal
```

---

## 7. 폐기된 원칙 목록

```
v1.0에서 폐기됨:
─────────────────────────────────────────────────────────────────
❌ Semantic Neutrality (의미적 중립)
❌ "시스템은 판단하지 않는다"
❌ "추천/제안 금지"
❌ "모든 경로 동등 표시"
❌ "사용자가 결정한다, 시스템은 침묵한다"
❌ "거짓말이 개입될 공간 없음"
❌ "좋다/나쁘다 색상 금지"
```

---

## 8. 새로운 정체성

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   AUTUS v1.0: 거울 (Mirror)                                  ║
║   "판단하지 않고 보여준다"                                    ║
║                                                               ║
║                    ↓ 개정 ↓                                   ║
║                                                               ║
║   AUTUS v2.0: 코치 (Coach)                                   ║
║   "강제로 성공시킨다"                                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 9. 버전 정보

```
Version: 2.0.0 (Bezos Edition)
Date: 2025-12-28
Status: LOCKED

Changes from v1.0:
- Semantic Neutrality 폐기
- 추천/판단 시스템 도입
- 외부 API 강제 연동
- 자동 노드 분류 도입
- CTA 강제 시스템 도입
- Flywheel 메커니즘 추가
```

---

## 10. 구현 우선순위

```
1. [필수] API 연동 (Calendar, Finance, Screen Time)
2. [필수] Data Mirror (거짓말 폭로)
3. [필수] Auto-Identification (기생 노드 식별)
4. [필수] Optimal Path Recommendation (최적 경로 추천)
5. [필수] Forced CTA (강제 실행 버튼)
6. [필수] Page Gate (결정 없이 이동 불가)
```

---

🔒 AUTUS CONSTITUTION v2.0 (BEZOS EDITION) LOCKED




