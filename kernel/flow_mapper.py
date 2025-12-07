"""
ARL v1.0 - Flow Mapper
Auto-generates UI flow from rules
"""
from typing import List, Dict, Any

LIMEPASS_FLOW = [
    {"id": "UI-01-WELCOME", "purpose": "welcome", "rules": [], "fields": []},
    {"id": "UI-02-IDENTITY", "purpose": "collect", "rules": [], "fields": ["name", "birth", "gender", "email"]},
    {"id": "UI-03-ACADEMIC", "purpose": "collect", "rules": ["R-GPA-MIN", "R-MAJOR-FIT"], "fields": ["gpa", "major"]},
    {"id": "UI-04-LANGUAGE", "purpose": "collect", "rules": ["R-ENGLISH"], "fields": ["english_score", "korean_level"]},
    {"id": "UI-05-FINANCE", "purpose": "collect", "rules": ["R-VISA-FIN"], "fields": ["bank_balance_usd", "sponsor"]},
    {"id": "UI-06-HEALTH", "purpose": "collect", "rules": ["R-VISA-TB"], "fields": ["tb_status", "chronic_disease"]},
    {"id": "UI-07-INTENT", "purpose": "collect", "rules": ["R-INTENT-CLARITY"], "fields": ["intent", "research_area"]},
    {"id": "UI-08-DOCUMENTS", "purpose": "upload", "rules": ["R-DOC-COMPLETE"], "fields": ["passport", "transcript"]},
    {"id": "UI-09-SCORE", "purpose": "calculate", "rules": ["R-GPA-MIN", "R-VISA-FIN"], "fields": []},
    {"id": "UI-10-VISA", "purpose": "checklist", "rules": ["R-VISA-DOCS"], "fields": []},
    {"id": "UI-11-EMPLOYMENT", "purpose": "collect", "rules": ["R-EMP-FIT"], "fields": ["job_intent", "experience"]},
    {"id": "UI-12-ROADMAP", "purpose": "summary", "rules": [], "fields": []},
]

QUESTION_TEMPLATES = {
    "name": {"question": "What is your full name?", "type": "text"},
    "gpa": {"question": "What is your GPA?", "type": "number"},
    "major": {"question": "What was your major?", "type": "text"},
    "english_score": {"question": "Enter your English test score", "type": "number"},
    "korean_level": {"question": "What is your Korean level?", "type": "select", "options": ["None", "TOPIK 1-2", "TOPIK 3-4", "TOPIK 5-6"]},
    "bank_balance_usd": {"question": "How much savings do you have (USD)?", "type": "number"},
    "tb_status": {"question": "Have you been tested for TB?", "type": "select", "options": ["negative", "positive", "not_tested"]},
    "intent": {"question": "Why do you want to study/work in Korea?", "type": "textarea"},
}

def generate_flow(rule_set: List[Dict]) -> List[Dict]:
    """Generate UI flow from rules"""
    flow = []
    for step in LIMEPASS_FLOW:
        step_copy = step.copy()
        step_copy["questions"] = [
            {**QUESTION_TEMPLATES.get(f, {"question": f"Enter {f}", "type": "text"}), "field": f}
            for f in step.get("fields", [])
        ]
        flow.append(step_copy)
    return flow

def get_current_step(state: Dict, flow: List[Dict]) -> Dict:
    """Get current step based on state completion"""
    for step in flow:
        for field in step.get("fields", []):
            if field not in state or state[field] is None:
                return step
    return flow[-1]
