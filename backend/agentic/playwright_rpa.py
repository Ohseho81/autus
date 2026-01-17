"""
Playwright-based Browser RPA
============================

UiPath Task Capture 스타일의 웹 자동화

Features:
- 브라우저 액션 녹화 → Playwright 스크립트
- 녹화된 플로우 → AUTUS 노드 변환
- Unattended Bot 실행

Phase 2 목표: Agentic Depth 45 → 75점
"""

import asyncio
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel
from enum import Enum
import json


class ActionType(str, Enum):
    NAVIGATE = "navigate"
    CLICK = "click"
    FILL = "fill"
    SELECT = "select"
    SCREENSHOT = "screenshot"
    WAIT = "wait"
    SCROLL = "scroll"
    HOVER = "hover"
    PRESS = "press"
    EXTRACT = "extract"


class BrowserAction(BaseModel):
    """단일 브라우저 액션"""
    type: ActionType
    selector: Optional[str] = None
    value: Optional[str] = None
    url: Optional[str] = None
    wait_ms: int = 0
    screenshot: bool = False
    description: Optional[str] = None
    timestamp: datetime = None
    
    class Config:
        use_enum_values = True


class RecordedFlow(BaseModel):
    """녹화된 자동화 플로우"""
    id: str
    name: str
    description: Optional[str]
    actions: List[BrowserAction]
    created_at: datetime
    total_duration_ms: int
    success_rate: float = 100.0
    execution_count: int = 0


class PlaywrightRPA:
    """
    Playwright 기반 브라우저 RPA
    
    Usage:
        rpa = PlaywrightRPA()
        
        # 녹화 시작
        rpa.start_recording()
        
        # 액션 기록
        rpa.record_action(BrowserAction(type="click", selector="#submit"))
        
        # 녹화 종료 → Flow 생성
        flow = rpa.stop_recording("Login Automation")
        
        # Flow 실행
        result = await rpa.execute_flow(flow)
        
        # Playwright 스크립트 생성
        script = rpa.generate_playwright_script(flow)
    """
    
    def __init__(self):
        self._recording = False
        self._recorded_actions: List[BrowserAction] = []
        self._recording_start: Optional[datetime] = None
        self._flows: Dict[str, RecordedFlow] = {}
    
    # ═══════════════════════════════════════════════════════════════
    # Recording
    # ═══════════════════════════════════════════════════════════════
    
    def start_recording(self) -> bool:
        """녹화 시작"""
        if self._recording:
            return False
        
        self._recording = True
        self._recorded_actions = []
        self._recording_start = datetime.now()
        return True
    
    def record_action(self, action: BrowserAction) -> bool:
        """액션 기록"""
        if not self._recording:
            return False
        
        action.timestamp = datetime.now()
        self._recorded_actions.append(action)
        return True
    
    def stop_recording(self, name: str, description: str = None) -> RecordedFlow:
        """녹화 종료 및 Flow 생성"""
        if not self._recording:
            raise ValueError("Not currently recording")
        
        self._recording = False
        
        # 총 시간 계산
        total_duration = (datetime.now() - self._recording_start).total_seconds() * 1000
        
        flow = RecordedFlow(
            id=f"flow_{int(datetime.now().timestamp())}",
            name=name,
            description=description,
            actions=self._recorded_actions.copy(),
            created_at=self._recording_start,
            total_duration_ms=int(total_duration)
        )
        
        self._flows[flow.id] = flow
        self._recorded_actions = []
        
        return flow
    
    # ═══════════════════════════════════════════════════════════════
    # Flow Execution (Simulated - 실제로는 Playwright 필요)
    # ═══════════════════════════════════════════════════════════════
    
    async def execute_flow(
        self,
        flow: RecordedFlow,
        headless: bool = True
    ) -> Dict[str, Any]:
        """
        플로우 실행
        
        Note: 실제 구현에서는 playwright.async_api 사용
        """
        # 시뮬레이션 결과
        results = []
        start_time = datetime.now()
        
        for i, action in enumerate(flow.actions):
            # 각 액션 "실행" (시뮬레이션)
            await asyncio.sleep(0.1)  # 실제로는 action 수행
            
            results.append({
                "step": i + 1,
                "action": action.type,
                "selector": action.selector,
                "status": "success",
                "duration_ms": 100
            })
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds() * 1000
        
        # Flow 통계 업데이트
        flow.execution_count += 1
        
        return {
            "flow_id": flow.id,
            "flow_name": flow.name,
            "status": "completed",
            "total_actions": len(flow.actions),
            "successful_actions": len(results),
            "duration_ms": int(duration),
            "executed_at": start_time.isoformat(),
            "results": results
        }
    
    # ═══════════════════════════════════════════════════════════════
    # Playwright Script Generation
    # ═══════════════════════════════════════════════════════════════
    
    def generate_playwright_script(
        self,
        flow: RecordedFlow,
        language: str = "python"
    ) -> str:
        """
        RecordedFlow → Playwright 스크립트 변환
        
        UiPath Task Capture와 유사한 기능
        """
        if language == "python":
            return self._generate_python_script(flow)
        elif language == "javascript":
            return self._generate_js_script(flow)
        else:
            raise ValueError(f"Unsupported language: {language}")
    
    def _generate_python_script(self, flow: RecordedFlow) -> str:
        """Python Playwright 스크립트 생성"""
        lines = [
            '"""',
            f'AUTUS Generated RPA Script: {flow.name}',
            f'Description: {flow.description or "N/A"}',
            f'Actions: {len(flow.actions)}',
            f'Generated: {datetime.now().isoformat()}',
            '"""',
            '',
            'import asyncio',
            'from playwright.async_api import async_playwright',
            '',
            '',
            f'async def {self._sanitize_name(flow.name)}():',
            '    async with async_playwright() as p:',
            '        browser = await p.chromium.launch(headless=True)',
            '        page = await browser.new_page()',
            '        ',
            '        try:',
        ]
        
        for i, action in enumerate(flow.actions):
            comment = f'            # Step {i+1}: {action.description or action.type}'
            lines.append(comment)
            
            if action.type == ActionType.NAVIGATE:
                lines.append(f'            await page.goto("{action.url}")')
            
            elif action.type == ActionType.CLICK:
                lines.append(f'            await page.click("{action.selector}")')
            
            elif action.type == ActionType.FILL:
                lines.append(f'            await page.fill("{action.selector}", "{action.value}")')
            
            elif action.type == ActionType.SELECT:
                lines.append(f'            await page.select_option("{action.selector}", "{action.value}")')
            
            elif action.type == ActionType.WAIT:
                lines.append(f'            await page.wait_for_timeout({action.wait_ms})')
            
            elif action.type == ActionType.SCREENSHOT:
                lines.append(f'            await page.screenshot(path="step_{i+1}.png")')
            
            elif action.type == ActionType.SCROLL:
                lines.append(f'            await page.evaluate("window.scrollBy(0, {action.value or 500})")')
            
            elif action.type == ActionType.HOVER:
                lines.append(f'            await page.hover("{action.selector}")')
            
            elif action.type == ActionType.PRESS:
                lines.append(f'            await page.press("{action.selector}", "{action.value}")')
            
            elif action.type == ActionType.EXTRACT:
                lines.append(f'            data = await page.inner_text("{action.selector}")')
                lines.append(f'            print(f"Extracted: {{data}}")')
            
            if action.wait_ms > 0 and action.type != ActionType.WAIT:
                lines.append(f'            await page.wait_for_timeout({action.wait_ms})')
            
            lines.append('')
        
        lines.extend([
            '            print("Flow completed successfully!")',
            '            return True',
            '        ',
            '        except Exception as e:',
            '            print(f"Error: {e}")',
            '            return False',
            '        ',
            '        finally:',
            '            await browser.close()',
            '',
            '',
            'if __name__ == "__main__":',
            f'    asyncio.run({self._sanitize_name(flow.name)}())',
        ])
        
        return '\n'.join(lines)
    
    def _generate_js_script(self, flow: RecordedFlow) -> str:
        """JavaScript Playwright 스크립트 생성"""
        lines = [
            '/**',
            f' * AUTUS Generated RPA Script: {flow.name}',
            f' * Description: {flow.description or "N/A"}',
            f' * Actions: {len(flow.actions)}',
            f' * Generated: {datetime.now().isoformat()}',
            ' */',
            '',
            "const { chromium } = require('playwright');",
            '',
            f'async function {self._sanitize_name(flow.name)}() {{',
            '  const browser = await chromium.launch({ headless: true });',
            '  const page = await browser.newPage();',
            '  ',
            '  try {',
        ]
        
        for i, action in enumerate(flow.actions):
            comment = f'    // Step {i+1}: {action.description or action.type}'
            lines.append(comment)
            
            if action.type == ActionType.NAVIGATE:
                lines.append(f'    await page.goto("{action.url}");')
            elif action.type == ActionType.CLICK:
                lines.append(f'    await page.click("{action.selector}");')
            elif action.type == ActionType.FILL:
                lines.append(f'    await page.fill("{action.selector}", "{action.value}");')
            elif action.type == ActionType.SELECT:
                lines.append(f'    await page.selectOption("{action.selector}", "{action.value}");')
            elif action.type == ActionType.WAIT:
                lines.append(f'    await page.waitForTimeout({action.wait_ms});')
            elif action.type == ActionType.SCREENSHOT:
                lines.append(f'    await page.screenshot({{ path: "step_{i+1}.png" }});')
            
            lines.append('')
        
        lines.extend([
            '    console.log("Flow completed successfully!");',
            '    return true;',
            '  } catch (e) {',
            '    console.error("Error:", e);',
            '    return false;',
            '  } finally {',
            '    await browser.close();',
            '  }',
            '}',
            '',
            f'{self._sanitize_name(flow.name)}();',
        ])
        
        return '\n'.join(lines)
    
    def _sanitize_name(self, name: str) -> str:
        """함수명으로 사용 가능하게 변환"""
        return ''.join(c if c.isalnum() else '_' for c in name).lower()
    
    # ═══════════════════════════════════════════════════════════════
    # AUTUS Integration: Convert to Canvas Nodes
    # ═══════════════════════════════════════════════════════════════
    
    def convert_to_autus_nodes(self, flow: RecordedFlow) -> List[Dict[str, Any]]:
        """
        RecordedFlow → AUTUS 캔버스 노드들로 변환
        
        각 액션이 하나의 노드가 됨
        """
        nodes = []
        
        for i, action in enumerate(flow.actions):
            node = {
                "id": f"{flow.id}_action_{i}",
                "flowId": flow.id,
                "type": "rpa_action",
                "actionType": action.type,
                "icon": self._get_action_icon(action.type),
                "name": action.description or f"{action.type}: {action.selector or action.url or ''}",
                "automation": 85,  # RPA는 기본적으로 높은 자동화율
                "k_value": 3.5,
                "position": {"x": 100 + i * 150, "y": 200},
                "data": {
                    "selector": action.selector,
                    "value": action.value,
                    "url": action.url,
                    "wait_ms": action.wait_ms
                }
            }
            nodes.append(node)
        
        return nodes
    
    def _get_action_icon(self, action_type: str) -> str:
        """액션 타입에 맞는 아이콘"""
        icons = {
            "navigate": "🌐",
            "click": "👆",
            "fill": "✏️",
            "select": "📋",
            "screenshot": "📸",
            "wait": "⏳",
            "scroll": "📜",
            "hover": "🎯",
            "press": "⌨️",
            "extract": "📤"
        }
        return icons.get(action_type, "🔧")
    
    # ═══════════════════════════════════════════════════════════════
    # AI Suggestion for RPA Optimization
    # ═══════════════════════════════════════════════════════════════
    
    def analyze_flow_for_optimization(self, flow: RecordedFlow) -> Dict[str, Any]:
        """
        플로우 분석 → 최적화 제안 (AUTUS AI용)
        """
        suggestions = []
        
        # 1. 중복 액션 체크
        action_types = [a.type for a in flow.actions]
        for i, action_type in enumerate(action_types):
            if i > 0 and action_type == action_types[i-1] == ActionType.WAIT:
                suggestions.append({
                    "type": "merge",
                    "description": f"Consecutive waits at steps {i} and {i+1} can be merged",
                    "confidence": 95
                })
        
        # 2. 불필요한 wait 체크
        total_wait = sum(a.wait_ms for a in flow.actions if a.type == ActionType.WAIT)
        if total_wait > 5000:
            suggestions.append({
                "type": "optimize",
                "description": f"Total wait time ({total_wait}ms) is high. Consider using smart waits.",
                "confidence": 80
            })
        
        # 3. Screenshot 많으면 경고
        screenshot_count = sum(1 for a in flow.actions if a.type == ActionType.SCREENSHOT)
        if screenshot_count > 3:
            suggestions.append({
                "type": "eliminate",
                "description": f"Many screenshots ({screenshot_count}). Consider keeping only error screenshots.",
                "confidence": 70
            })
        
        return {
            "flow_id": flow.id,
            "total_actions": len(flow.actions),
            "estimated_duration_ms": flow.total_duration_ms,
            "suggestions": suggestions,
            "optimization_potential": f"+{min(30, len(suggestions) * 10)}%"
        }


# ═══════════════════════════════════════════════════════════════
# Example Flow Templates
# ═══════════════════════════════════════════════════════════════

EXAMPLE_FLOWS = {
    "login_flow": RecordedFlow(
        id="template_login",
        name="Generic Login Flow",
        description="Template for website login automation",
        actions=[
            BrowserAction(type=ActionType.NAVIGATE, url="https://example.com/login", description="Open login page"),
            BrowserAction(type=ActionType.FILL, selector="#username", value="{{username}}", description="Enter username"),
            BrowserAction(type=ActionType.FILL, selector="#password", value="{{password}}", description="Enter password"),
            BrowserAction(type=ActionType.CLICK, selector="#submit", description="Click login button"),
            BrowserAction(type=ActionType.WAIT, wait_ms=2000, description="Wait for redirect"),
        ],
        created_at=datetime.now(),
        total_duration_ms=5000
    ),
    "form_fill_flow": RecordedFlow(
        id="template_form",
        name="Generic Form Fill Flow",
        description="Template for form automation",
        actions=[
            BrowserAction(type=ActionType.NAVIGATE, url="https://example.com/form", description="Open form page"),
            BrowserAction(type=ActionType.FILL, selector="input[name='name']", value="{{name}}", description="Fill name"),
            BrowserAction(type=ActionType.FILL, selector="input[name='email']", value="{{email}}", description="Fill email"),
            BrowserAction(type=ActionType.SELECT, selector="select[name='country']", value="{{country}}", description="Select country"),
            BrowserAction(type=ActionType.CLICK, selector="button[type='submit']", description="Submit form"),
            BrowserAction(type=ActionType.SCREENSHOT, description="Capture confirmation"),
        ],
        created_at=datetime.now(),
        total_duration_ms=8000
    )
}
