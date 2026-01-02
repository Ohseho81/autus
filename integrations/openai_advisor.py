#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🧠 AUTUS Physics Map - OpenAI GPT 연동                                       ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 데이터 기반 AI 분석                                            ║
║  - 병목 원인 분석 및 해결책 제안                                              ║
║  - 미래 예측 및 전략 조언                                                     ║
║  - 자연어 질문 답변                                                           ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. platform.openai.com 접속 → API Keys                                       ║
║  2. Create new secret key → 복사                                              ║
║  3. 환경변수 설정: export OPENAI_API_KEY="sk-..."                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ openai 패키지 설치 필요: pip install openai")


class PhysicsMapAdvisor:
    """
    AUTUS Physics Map AI 어드바이저
    
    GPT-4를 활용한 지능형 분석 및 조언 시스템
    """
    
    SYSTEM_PROMPT = """당신은 AUTUS Physics Map의 AI 재무 어드바이저입니다.

## 핵심 철학
- "모든 개체는 사람이다" - 모든 노드는 사람(또는 사람 그룹)으로 취급
- "Physics의 해답은 돈이다" - 모든 관계와 가치는 돈으로 환산

## Physics Map 수식
V = D - T + S

여기서:
- V (Value): 총 가치
- D (Direct Money): 직접 돈 = Inflow - Outflow
- T (Time Cost): 시간 비용 = 투입 시간 × 시간당 가치
- S (Synergy): 시너지 = k × (N₁ × N₂) / d² × (1+r)^t

## 12개월 예측 수식
F = P × (1 + g)^t

여기서:
- F: 미래 가치
- P: 현재 가치
- g: 월간 성장률
- t: 기간 (개월)

## 당신의 역할
1. 데이터 분석: Physics Map 데이터를 분석하여 인사이트 도출
2. 병목 진단: 유출이 큰 노드의 원인 분석 및 해결책 제안
3. 기회 발굴: 시너지 증대 기회, 새로운 연결 제안
4. 전략 조언: 장/단기 재무 전략 제안
5. 리스크 경고: 잠재적 위험 요소 사전 경고

## 응답 스타일
- 한국어로 답변
- 구체적인 숫자와 함께 분석
- 실행 가능한 액션 아이템 제시
- 우선순위 명시 (🔴 긴급 / 🟡 중요 / 🟢 참고)
"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o"):
        """
        OpenAI 어드바이저 초기화
        
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 읽음)
            model: 사용할 모델 (기본: gpt-4o)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = None
        
        if OPENAI_AVAILABLE and self.api_key:
            self.client = OpenAI(api_key=self.api_key)
            print(f"✅ OpenAI 연결 성공 (모델: {model})")
        elif not self.api_key:
            print("⚠️ OPENAI_API_KEY 환경변수 설정 필요")
            print("   export OPENAI_API_KEY='sk-...'")
    
    def _chat(self, messages: List[Dict], temperature: float = 0.7) -> Optional[str]:
        """OpenAI Chat API 호출"""
        if not self.client:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ OpenAI API 오류: {e}")
            return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 핵심 분석 기능
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_physics_map(self, physics_data: Dict[str, Any]) -> Optional[str]:
        """
        Physics Map 전체 분석
        
        Args:
            physics_data: Physics Map 데이터 (nodes, flows 포함)
        
        Returns:
            AI 분석 결과 (마크다운 형식)
        """
        # 데이터 요약
        nodes = physics_data.get("nodes", [])
        flows = physics_data.get("flows", [])
        
        summary = {
            "total_value": sum(n.get("value", 0) for n in nodes),
            "total_inflow": sum(n.get("inflow", 0) for n in nodes),
            "total_outflow": sum(n.get("outflow", 0) for n in nodes),
            "total_synergy": sum(n.get("synergy", 0) for n in nodes),
            "node_count": len(nodes),
            "flow_count": len(flows),
            "bottlenecks": [n for n in nodes if n.get("status") == "bottleneck"]
        }
        
        prompt = f"""다음 Physics Map 데이터를 분석해주세요:

## 전체 요약
- 총 가치: ₩{summary['total_value']:,}
- 총 유입: ₩{summary['total_inflow']:,}
- 총 유출: ₩{summary['total_outflow']:,}
- 총 시너지: ₩{summary['total_synergy']:,}
- 노드 수: {summary['node_count']}개
- 돈 흐름 수: {summary['flow_count']}개
- 병목 노드: {len(summary['bottlenecks'])}개

## 노드 상세
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 돈 흐름
{json.dumps(flows, ensure_ascii=False, indent=2)}

---

다음 형식으로 분석해주세요:

### 📊 현황 분석
[전체적인 재무 건강도 평가]

### 💡 핵심 인사이트
[3-5개의 주요 발견점]

### ⚠️ 리스크 요소
[주의가 필요한 부분]

### 🚀 기회 요소
[성장 가능성이 있는 부분]

### 📋 액션 아이템
[우선순위별 실행 과제]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def diagnose_bottleneck(self, node: Dict[str, Any]) -> Optional[str]:
        """
        특정 노드의 병목 원인 분석 및 해결책 제안
        
        Args:
            node: 병목 노드 데이터
        
        Returns:
            진단 결과 및 해결책
        """
        prompt = f"""다음 노드에서 병목이 감지되었습니다. 분석해주세요:

## 노드 정보
- ID: {node.get('id')}
- 이름: {node.get('name', node.get('label'))}
- 역할: {node.get('role')}
- 위치: {node.get('location')}

## 재무 데이터
- 유입 (Inflow): ₩{node.get('inflow', 0):,}
- 유출 (Outflow): ₩{node.get('outflow', 0):,}
- 시간 비용: ₩{node.get('time_cost', node.get('time', 0)):,}
- 시너지: ₩{node.get('synergy', 0):,}
- 총 가치: ₩{node.get('value', 0):,}

## 유출 비율
{node.get('outflow', 0) / node.get('inflow', 1) * 100:.1f}%

---

다음을 분석해주세요:

### 🔍 병목 원인 분석
[왜 이 노드에서 돈이 빠져나가는지]

### 💊 해결책 제안
[구체적이고 실행 가능한 해결책 3-5개]

### 📈 예상 효과
[각 해결책 적용 시 예상되는 개선 효과]

### ⏰ 실행 우선순위
[긴급도와 중요도 기준 우선순위]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def suggest_synergy(
        self, 
        nodes: List[Dict[str, Any]],
        existing_flows: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        새로운 시너지 기회 제안
        
        Args:
            nodes: 모든 노드 목록
            existing_flows: 기존 돈 흐름
        
        Returns:
            시너지 기회 제안
        """
        prompt = f"""현재 Physics Map의 노드들과 연결을 분석하여 새로운 시너지 기회를 찾아주세요.

## 현재 노드 ({len(nodes)}개)
{json.dumps(nodes, ensure_ascii=False, indent=2)}

## 현재 연결 ({len(existing_flows)}개)
{json.dumps(existing_flows, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 🔗 누락된 연결
[연결되어야 하는데 연결되지 않은 노드 쌍]

### 💎 고시너지 기회
[시너지 수식 S = k(N₁×N₂)/d² 기준 높은 가치가 예상되는 연결]

### 🌱 성장 잠재력
[현재는 작지만 성장 가능성이 높은 연결]

### 📋 연결 우선순위
[어떤 연결을 먼저 만들어야 하는지]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def predict_future(
        self,
        physics_data: Dict[str, Any],
        months: int = 12
    ) -> Optional[str]:
        """
        미래 예측 및 전략 제안
        
        Args:
            physics_data: 현재 Physics Map 데이터
            months: 예측 기간 (개월)
        
        Returns:
            예측 결과 및 전략
        """
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_forecast = sum(n.get("forecast", 0) for n in nodes)
        
        prompt = f"""현재 데이터를 기반으로 {months}개월 후를 예측해주세요.

## 현재 상태
- 총 가치: ₩{total_value:,}
- 시스템 예측 (12개월): ₩{total_forecast:,}

## 노드별 현황
{json.dumps(nodes, ensure_ascii=False, indent=2)}

---

다음을 분석해주세요:

### 📈 {months}개월 예측
[낙관/기본/비관 시나리오별 예측]

### 🎯 목표 달성 전략
[목표 가치 달성을 위한 전략]

### ⚡ 성장 가속 방법
[성장률을 높일 수 있는 구체적 방법]

### 🛡️ 리스크 대비
[예측 기간 동안 주의해야 할 리스크와 대비책]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    def ask(self, question: str, physics_data: Dict[str, Any] = None) -> Optional[str]:
        """
        자연어 질문에 답변
        
        Args:
            question: 사용자 질문
            physics_data: 참조할 Physics Map 데이터 (선택)
        
        Returns:
            AI 답변
        """
        context = ""
        if physics_data:
            nodes = physics_data.get("nodes", [])
            context = f"""
## 참조 데이터 (Physics Map)
- 총 가치: ₩{sum(n.get('value', 0) for n in nodes):,}
- 노드 수: {len(nodes)}개
- 노드 목록: {', '.join(n.get('id', '') for n in nodes)}
"""
        
        prompt = f"""{context}

## 질문
{question}

---

Physics Map 철학과 수식을 기반으로 답변해주세요.
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 특화 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def weekly_ai_report(self, physics_data: Dict[str, Any], week_id: str) -> Optional[str]:
        """
        주간 AI 리포트 생성
        """
        prompt = f"""주간 리포트를 작성해주세요.

## 주차: {week_id}

## Physics Map 데이터
{json.dumps(physics_data, ensure_ascii=False, indent=2)}

---

다음 형식으로 주간 리포트를 작성해주세요:

# 📊 AUTUS 주간 리포트 - {week_id}

## 🎯 이번 주 핵심 수치
[주요 KPI 3-5개]

## 📈 성과 분석
[잘된 점과 그 이유]

## ⚠️ 주의 사항
[개선이 필요한 부분]

## 💡 다음 주 제안
[구체적인 액션 아이템 3-5개]

## 🔮 예측
[다음 주 예상 흐름]
"""
        
        messages = [
            {"role": "system", "content": self.SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
        
        return self._chat(messages, temperature=0.5)


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 어드바이저 초기화
    advisor = PhysicsMapAdvisor()
    
    # 샘플 데이터
    sample_data = {
        "nodes": [
            {
                "id": "당신",
                "label": "대표",
                "role": "CONTROLLER",
                "location": "서울 강남구",
                "value": 182886563,
                "inflow": 214000000,
                "outflow": 38500000,
                "time_cost": 4000000,
                "synergy": 11406562,
                "forecast": 210000000,
                "status": "optimal"
            },
            {
                "id": "파트너A",
                "label": "미국 파트너",
                "role": "PARTNER",
                "location": "New York, USA",
                "value": 50000000,
                "inflow": 45000000,
                "outflow": 15000000,
                "time_cost": 4000000,
                "synergy": -6000000,
                "forecast": 65000000,
                "status": "bottleneck"
            }
        ],
        "flows": [
            {"from": "학부모군", "to": "당신", "value": 120000000, "type": "inflow"},
            {"from": "당신", "to": "파트너A", "value": 15000000, "type": "outflow"}
        ]
    }
    
    # 전체 분석
    # analysis = advisor.analyze_physics_map(sample_data)
    # print(analysis)
    
    # 병목 진단
    # bottleneck = sample_data["nodes"][1]
    # diagnosis = advisor.diagnose_bottleneck(bottleneck)
    # print(diagnosis)
    
    # 자연어 질문
    # answer = advisor.ask("파트너A와의 관계를 개선하려면 어떻게 해야 할까요?", sample_data)
    # print(answer)
    
    print("\n📋 OpenAI 연동 설정 가이드:")
    print("1. https://platform.openai.com 접속")
    print("2. API Keys 메뉴")
    print("3. Create new secret key")
    print("4. 키 복사 (sk-...)")
    print("5. 환경변수 설정:")
    print('   export OPENAI_API_KEY="sk-..."')
    print("\n💡 권장 모델: gpt-4o (가성비), gpt-4-turbo (성능)")
    print("💰 예상 비용: 분석 1회당 약 $0.01-0.05")




















