"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())











"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS REALTIME - ANTHROPIC CLAUDE AI SERVICE
═══════════════════════════════════════════════════════════════════════════════
AI-powered workflow generation using Claude
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
ANTHROPIC_MAX_TOKENS = int(os.getenv("ANTHROPIC_MAX_TOKENS", "4096"))
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# ─────────────────────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────────────────────

class PatternData(BaseModel):
    """Pattern data for workflow generation"""
    name: str
    pattern_type: str
    frequency: int
    triggers: List[str]
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    estimated_value: float = 0


class GeneratedWorkflow(BaseModel):
    """Generated workflow result"""
    name: str
    description: str
    n8n_json: Dict[str, Any]
    variables: Dict[str, Any]
    estimated_roi: float
    confidence: float


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert n8n workflow automation engineer for AUTUS - an autonomous automation system.

Your job is to generate production-ready n8n workflow JSON files based on detected patterns.

RULES:
1. Generate valid n8n workflow JSON that can be imported directly
2. Include proper node connections and positioning
3. Use webhooks for triggers when appropriate
4. Include error handling nodes
5. Add Slack notifications for important events
6. Include audit logging
7. Use environment variables for sensitive data: {{$env.VARIABLE_NAME}}
8. Position nodes properly (x, y coordinates)
9. Include meaningful node names in Korean

AVAILABLE NODE TYPES:
- n8n-nodes-base.webhook (triggers)
- n8n-nodes-base.httpRequest (API calls)
- n8n-nodes-base.code (JavaScript logic)
- n8n-nodes-base.if (conditionals)
- n8n-nodes-base.switch (routing)
- n8n-nodes-base.slack (notifications)
- n8n-nodes-base.set (data transformation)
- n8n-nodes-base.merge (combine data)
- n8n-nodes-base.splitInBatches (batch processing)
- n8n-nodes-base.wait (delays)
- n8n-nodes-base.noOp (placeholder)

AUTUS API ENDPOINTS:
- POST /api/nodes - Create node
- POST /api/events - Log event
- POST /api/feedback - Submit feedback
- PATCH /api/automations/{id}/variables - Update variables
- POST /api/audit - Audit log

ENVIRONMENT VARIABLES:
- AUTUS_API_URL
- SLACK_WEBHOOK_URL
- ANTHROPIC_API_KEY

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "workflow": { ... n8n workflow JSON ... },
  "variables": { ... workflow variables ... },
  "description": "...",
  "estimated_roi": 50000,
  "confidence": 0.85
}"""

USER_PROMPT_TEMPLATE = """Generate an n8n workflow for the following detected pattern:

PATTERN NAME: {name}
PATTERN TYPE: {pattern_type}
DETECTION FREQUENCY: {frequency} times
ESTIMATED VALUE: ₩{estimated_value:,.0f}

TRIGGERS:
{triggers}

ACTIONS:
{actions}

CONDITIONS:
{conditions}

Create a complete n8n workflow that:
1. Triggers on the specified events
2. Executes all required actions
3. Includes proper error handling
4. Sends Slack notifications
5. Logs to AUTUS audit system
6. Calculates and updates value metrics

Return ONLY the JSON response, no explanation."""


# ─────────────────────────────────────────────────────────────────────────────
# CLAUDE AI SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class ClaudeAIService:
    """Claude AI integration for workflow generation"""
    
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.model = ANTHROPIC_MODEL
        self.max_tokens = ANTHROPIC_MAX_TOKENS
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def generate_workflow(self, pattern: PatternData) -> Optional[GeneratedWorkflow]:
        """Generate n8n workflow from pattern data"""
        if not self.api_key:
            print("[CLAUDE] No API key configured, skipping workflow generation")
            return None
        
        try:
            # Build prompt
            user_prompt = USER_PROMPT_TEMPLATE.format(
                name=pattern.name,
                pattern_type=pattern.pattern_type,
                frequency=pattern.frequency,
                estimated_value=pattern.estimated_value,
                triggers="\n".join(f"- {t}" for t in pattern.triggers),
                actions="\n".join(f"- {a}" for a in pattern.actions),
                conditions=json.dumps(pattern.conditions or {}, indent=2)
            )
            
            # Call Claude API
            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": SYSTEM_PROMPT,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                print(f"[CLAUDE] API error: {response.status_code} - {response.text}")
                return None
            
            # Parse response
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            workflow_data = self._parse_json_response(content)
            if not workflow_data:
                print("[CLAUDE] Failed to parse workflow JSON")
                return None
            
            # Build result
            return GeneratedWorkflow(
                name=pattern.name,
                description=workflow_data.get("description", f"Auto-generated workflow for {pattern.name}"),
                n8n_json=workflow_data.get("workflow", {}),
                variables=workflow_data.get("variables", {}),
                estimated_roi=workflow_data.get("estimated_roi", pattern.estimated_value),
                confidence=workflow_data.get("confidence", 0.7)
            )
            
        except Exception as e:
            print(f"[CLAUDE] Error generating workflow: {e}")
            return None
    
    def _parse_json_response(self, content: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from Claude's response"""
        try:
            # Try direct JSON parse
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object in content
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(content[start:end])
        except json.JSONDecodeError:
            pass
        
        return None
    
    async def analyze_pattern(self, events: List[Dict[str, Any]]) -> Optional[PatternData]:
        """Analyze events to detect automation patterns"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze these events and detect if there's a repeatable automation pattern:

EVENTS:
{json.dumps(events[:20], indent=2, ensure_ascii=False)}

If you detect a pattern that could be automated, return JSON:
{{
  "detected": true,
  "name": "pattern name in Korean",
  "pattern_type": "type",
  "triggers": ["trigger1", "trigger2"],
  "actions": ["action1", "action2"],
  "conditions": {{}},
  "frequency": estimated_frequency,
  "estimated_value": estimated_value_in_won
}}

If no clear pattern, return:
{{"detected": false}}"""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": 2048,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            data = self._parse_json_response(content)
            
            if data and data.get("detected"):
                return PatternData(
                    name=data.get("name", "Unknown Pattern"),
                    pattern_type=data.get("pattern_type", "custom"),
                    frequency=data.get("frequency", 1),
                    triggers=data.get("triggers", []),
                    actions=data.get("actions", []),
                    conditions=data.get("conditions"),
                    estimated_value=data.get("estimated_value", 0)
                )
            
            return None
            
        except Exception as e:
            print(f"[CLAUDE] Error analyzing pattern: {e}")
            return None
    
    async def improve_workflow(
        self, 
        workflow: Dict[str, Any], 
        feedback: str,
        metrics: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Improve existing workflow based on feedback"""
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Improve this n8n workflow based on the feedback and metrics:

CURRENT WORKFLOW:
{json.dumps(workflow, indent=2, ensure_ascii=False)}

FEEDBACK: {feedback}

METRICS:
{json.dumps(metrics, indent=2)}

Return the improved workflow JSON only."""

            response = await self.client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "messages": [
                        {"role": "user", "content": prompt}
                    ]
                }
            )
            
            if response.status_code != 200:
                return None
            
            result = response.json()
            content = result.get("content", [{}])[0].get("text", "")
            return self._parse_json_response(content)
            
        except Exception as e:
            print(f"[CLAUDE] Error improving workflow: {e}")
            return None
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

claude_service = ClaudeAIService()


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

async def main():
    """Example usage"""
    # Example pattern
    pattern = PatternData(
        name="학생 등록 → 환영 이메일",
        pattern_type="registration_welcome",
        frequency=15,
        triggers=["new_student_registered", "form_submitted"],
        actions=["send_welcome_email", "create_slack_channel", "assign_mentor"],
        estimated_value=50000
    )
    
    print("Generating workflow...")
    result = await claude_service.generate_workflow(pattern)
    
    if result:
        print(f"\n✅ Generated: {result.name}")
        print(f"   Description: {result.description}")
        print(f"   Estimated ROI: ₩{result.estimated_roi:,.0f}")
        print(f"   Confidence: {result.confidence:.0%}")
        print(f"\n   Workflow JSON:")
        print(json.dumps(result.n8n_json, indent=2, ensure_ascii=False)[:500] + "...")
    else:
        print("❌ Failed to generate workflow")
    
    await claude_service.close()


if __name__ == "__main__":
    asyncio.run(main())
















