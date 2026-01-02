#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ⚡ AUTUS Physics Map - Make (Integromat) 연동                                ║
║                                                                               ║
║  기능:                                                                        ║
║  - Physics Map 이벤트 → Make Webhook 전송                                     ║
║  - 병목 감지 자동 알림                                                        ║
║  - 주간 리포트 자동 생성                                                      ║
║                                                                               ║
║  설정 방법:                                                                   ║
║  1. make.com 접속 → 새 시나리오 생성                                          ║
║  2. Webhooks → Custom webhook 추가                                            ║
║  3. Webhook URL 복사 → 아래 MAKE_WEBHOOK_URL에 붙여넣기                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum


class EventType(Enum):
    """Make로 전송할 이벤트 유형"""
    PHYSICS_UPDATE = "physics_update"      # Physics Map 업데이트
    BOTTLENECK_ALERT = "bottleneck_alert"  # 병목 감지
    WEEKLY_REPORT = "weekly_report"        # 주간 리포트
    NODE_ADDED = "node_added"              # 새 노드 추가
    FLOW_CHANGED = "flow_changed"          # 돈 흐름 변경
    PREDICTION = "prediction"              # 예측 알림
    MILESTONE = "milestone"                # 마일스톤 달성


@dataclass
class MakePayload:
    """Make Webhook 페이로드"""
    event_type: str
    timestamp: str
    data: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class MakeIntegration:
    """
    AUTUS Physics Map ↔ Make 연동 클라이언트
    """
    
    def __init__(self, webhook_url: str = None):
        """
        Make 연동 초기화
        
        Args:
            webhook_url: Make Webhook URL
        """
        self.webhook_url = webhook_url or os.getenv("MAKE_WEBHOOK_URL")
        
        if not self.webhook_url:
            print("⚠️ MAKE_WEBHOOK_URL 환경변수 또는 webhook_url 파라미터 필요")
            print("📋 설정 방법:")
            print("   1. make.com 접속")
            print("   2. Create a new scenario")
            print("   3. Webhooks → Custom webhook 추가")
            print("   4. URL 복사")
    
    def _send(self, payload: MakePayload) -> bool:
        """
        Make Webhook으로 데이터 전송
        """
        if not self.webhook_url:
            print("❌ Webhook URL 설정 필요")
            return False
        
        try:
            response = requests.post(
                self.webhook_url,
                json=asdict(payload),
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"✅ Make 전송 성공: {payload.event_type}")
                return True
            else:
                print(f"❌ Make 전송 실패: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Make 전송 오류: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Physics Map 이벤트 전송
    # ═══════════════════════════════════════════════════════════════════════════
    
    def send_physics_update(self, physics_data: Dict[str, Any]) -> bool:
        """
        Physics Map 업데이트 전송
        
        Make에서 받아서:
        - Google Sheets 저장
        - Notion 업데이트
        - 대시보드 갱신
        """
        # 요약 데이터 생성
        nodes = physics_data.get("nodes", [])
        total_value = sum(n.get("value", 0) for n in nodes)
        total_synergy = sum(n.get("synergy", 0) for n in nodes)
        bottlenecks = [n for n in nodes if n.get("status") == "bottleneck"]
        
        payload = MakePayload(
            event_type=EventType.PHYSICS_UPDATE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "total_value": total_value,
                "total_synergy": total_synergy,
                "node_count": len(nodes),
                "bottleneck_count": len(bottlenecks),
                "nodes": nodes[:10],  # 상위 10개만 (Make 제한 고려)
                "formula": "V = D - T + S"
            },
            metadata={
                "source": "AUTUS Physics Map",
                "version": "3.0"
            }
        )
        
        return self._send(payload)
    
    def send_bottleneck_alert(
        self, 
        node: Dict[str, Any],
        severity: str = "warning"
    ) -> bool:
        """
        병목 감지 알림 전송
        
        Make에서 받아서:
        - Slack/카카오톡 알림
        - 이메일 발송
        - 대시보드 경고 표시
        
        Args:
            node: 병목 노드 데이터
            severity: "warning" | "critical"
        """
        # 병목 분석
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        outflow_ratio = (outflow / inflow * 100) if inflow > 0 else 0
        
        payload = MakePayload(
            event_type=EventType.BOTTLENECK_ALERT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "node_id": node.get("id"),
                "node_name": node.get("name", node.get("label")),
                "role": node.get("role"),
                "location": node.get("location"),
                "inflow": inflow,
                "outflow": outflow,
                "outflow_ratio": round(outflow_ratio, 1),
                "value": node.get("value", 0),
                "severity": severity,
                "recommendation": self._get_bottleneck_recommendation(node)
            },
            metadata={
                "alert_type": "bottleneck",
                "requires_action": True
            }
        )
        
        return self._send(payload)
    
    def send_weekly_report(self, report_data: Dict[str, Any]) -> bool:
        """
        주간 리포트 전송
        
        Make에서 받아서:
        - PDF 생성
        - 이메일 발송
        - Notion 페이지 생성
        """
        payload = MakePayload(
            event_type=EventType.WEEKLY_REPORT.value,
            timestamp=datetime.now().isoformat(),
            data={
                "week_id": report_data.get("week_id"),
                "period": report_data.get("period"),
                "summary": {
                    "total_value": report_data.get("total_value"),
                    "value_change": report_data.get("value_change"),
                    "total_synergy": report_data.get("total_synergy"),
                    "synergy_change": report_data.get("synergy_change"),
                    "forecast_12m": report_data.get("forecast_12m")
                },
                "top_nodes": report_data.get("top_nodes", [])[:5],
                "bottlenecks": report_data.get("bottlenecks", []),
                "recommendations": report_data.get("recommendations", []),
                "kpi": report_data.get("kpi", {})
            },
            metadata={
                "report_type": "weekly",
                "auto_generated": True
            }
        )
        
        return self._send(payload)
    
    def send_prediction_alert(
        self,
        prediction: Dict[str, Any]
    ) -> bool:
        """
        예측 알림 전송 (새로운 기회/위험)
        """
        payload = MakePayload(
            event_type=EventType.PREDICTION.value,
            timestamp=datetime.now().isoformat(),
            data={
                "prediction_type": prediction.get("type"),  # "opportunity" | "risk"
                "target": prediction.get("target"),
                "current_value": prediction.get("current_value"),
                "predicted_value": prediction.get("predicted_value"),
                "confidence": prediction.get("confidence"),
                "timeframe": prediction.get("timeframe"),
                "action_required": prediction.get("action_required"),
                "details": prediction.get("details")
            }
        )
        
        return self._send(payload)
    
    def send_milestone(
        self,
        milestone_type: str,
        value: float,
        message: str
    ) -> bool:
        """
        마일스톤 달성 알림
        
        예: "총 가치 10억 돌파!", "시너지 1억 달성!"
        """
        payload = MakePayload(
            event_type=EventType.MILESTONE.value,
            timestamp=datetime.now().isoformat(),
            data={
                "milestone_type": milestone_type,
                "value": value,
                "message": message,
                "celebration": True
            }
        )
        
        return self._send(payload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _get_bottleneck_recommendation(self, node: Dict[str, Any]) -> str:
        """병목에 대한 추천 액션 생성"""
        inflow = node.get("inflow", 0)
        outflow = node.get("outflow", 0)
        
        if outflow > inflow * 0.5:
            return "🔴 긴급: 유출이 유입의 50% 초과. 비용 절감 또는 유입 증대 필요"
        elif outflow > inflow * 0.3:
            return "🟡 주의: 유출 비율 높음. 비용 구조 검토 권장"
        else:
            return "🟢 모니터링: 현재 수준 유지하되 지속 관찰 필요"
    
    def test_connection(self) -> bool:
        """
        Make 연결 테스트
        """
        payload = MakePayload(
            event_type="test",
            timestamp=datetime.now().isoformat(),
            data={
                "message": "AUTUS Physics Map 연결 테스트",
                "status": "connected"
            }
        )
        
        return self._send(payload)


# ═══════════════════════════════════════════════════════════════════════════════
# Make 시나리오 템플릿 (JSON Blueprint)
# ═══════════════════════════════════════════════════════════════════════════════

MAKE_SCENARIO_BLUEPRINT = {
    "name": "AUTUS Physics Map Automation",
    "description": "Physics Map 데이터 자동 처리",
    "modules": [
        {
            "id": 1,
            "module": "webhook",
            "name": "Physics Map Webhook",
            "description": "AUTUS에서 데이터 수신"
        },
        {
            "id": 2,
            "module": "router",
            "name": "이벤트 분기",
            "routes": [
                {"condition": "event_type == 'bottleneck_alert'", "target": 3},
                {"condition": "event_type == 'weekly_report'", "target": 4},
                {"condition": "event_type == 'physics_update'", "target": 5}
            ]
        },
        {
            "id": 3,
            "module": "slack",
            "name": "병목 알림 → Slack",
            "action": "post_message"
        },
        {
            "id": 4,
            "module": "google-docs",
            "name": "주간 리포트 → PDF",
            "action": "create_document"
        },
        {
            "id": 5,
            "module": "google-sheets",
            "name": "데이터 → Sheets 저장",
            "action": "add_row"
        }
    ]
}


# ═══════════════════════════════════════════════════════════════════════════════
# 사용 예제
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 환경변수 또는 직접 URL 입력
    # export MAKE_WEBHOOK_URL="https://hook.us1.make.com/xxxxx"
    
    make = MakeIntegration()
    
    # 연결 테스트
    # make.test_connection()
    
    # 병목 알림 예제
    bottleneck_node = {
        "id": "파트너A",
        "name": "미국 파트너",
        "role": "PARTNER",
        "location": "New York, USA",
        "inflow": 45000000,
        "outflow": 15000000,
        "value": 50000000,
        "status": "bottleneck"
    }
    
    # make.send_bottleneck_alert(bottleneck_node, severity="warning")
    
    # 주간 리포트 예제
    weekly_report = {
        "week_id": "2025-W01",
        "period": "2024-12-30 ~ 2025-01-05",
        "total_value": 709000000,
        "value_change": 15.2,
        "total_synergy": 22810000,
        "synergy_change": 8.5,
        "forecast_12m": 808000000,
        "top_nodes": [
            {"id": "당신", "value": 182886563},
            {"id": "학부모군", "value": 120000000}
        ],
        "bottlenecks": [
            {"id": "파트너A", "outflow_ratio": 33.3}
        ],
        "recommendations": [
            "파트너A 관계 재검토 필요",
            "학부모군 만족도 조사 권장"
        ]
    }
    
    # make.send_weekly_report(weekly_report)
    
    print("\n📋 Make 시나리오 설정 가이드:")
    print("1. make.com 접속 → Create a new scenario")
    print("2. 첫 번째 모듈: Webhooks → Custom webhook")
    print("3. 'Add' 클릭 → Webhook 이름 입력 → Save")
    print("4. 생성된 URL 복사")
    print("5. Router 추가 → 조건별 분기 설정")
    print("6. 각 분기에 원하는 액션 추가:")
    print("   - Slack: Send a Message")
    print("   - Google Sheets: Add a Row")
    print("   - Email: Send an Email")
    print("   - Notion: Create a Database Item")
    print("7. 시나리오 활성화 (ON)")
    
    print("\n🔗 Webhook URL을 환경변수로 설정:")
    print('   export MAKE_WEBHOOK_URL="https://hook.us1.make.com/your-webhook-id"')





















