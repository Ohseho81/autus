"""
ARL v1.0 - Flow Mapper
Auto-generates UI flow from rules
"""
from typing import List, Dict, Any

LIMEPASS_FLOW = [
    {
        "id": "UI-01-WELCOME",
        "purpose": "welcome",
        "rules": [{"condition": "true", "action": "show_welcome"}],
        "fields": []
    },
    {
        "id": "UI-02-IDENTITY",
        "purpose": "collect",
        "rules": [
            {"condition": "name && email", "action": "proceed_to_next"},
            {"condition": "not email.match('^[^@]+@[^@]+\\\\.[^@]+$')", "action": "show_error_invalid_email"}
        ],
        "fields": [
            {"name": "name", "validation": {"type": "string", "min_length": 2, "max_length": 100}},
            {"name": "birth", "validation": {"type": "date", "min_date": "1960-01-01", "max_date": "today"}},
            {"name": "gender", "validation": {"type": "enum", "values": ["M", "F", "Other"]}},
            {"name": "email", "validation": {"type": "email", "pattern": "^[^@]+@[^@]+\\\\.[^@]+$"}}
        ]
    },
    {
        "id": "UI-03-ACADEMIC",
        "purpose": "collect",
        "rules": [
            {"condition": "gpa >= 2.5", "action": "proceed_to_next"},
            {"condition": "gpa < 2.5", "action": "show_warning_low_gpa"}
        ],
        "fields": [
            {"name": "gpa", "validation": {"type": "number", "min": 0, "max": 4.0}},
            {"name": "major", "validation": {"type": "string", "min_length": 2, "max_length": 100}}
        ]
    },
    {
        "id": "UI-04-LANGUAGE",
        "purpose": "collect",
        "rules": [
            {"condition": "english_score > 100", "action": "proceed_to_next"},
            {"condition": "english_score <= 100", "action": "show_warning_language"}
        ],
        "fields": [
            {"name": "english_score", "validation": {"type": "number", "min": 0, "max": 150}},
            {"name": "korean_level", "validation": {"type": "enum", "values": ["None", "TOPIK 1-2", "TOPIK 3-4", "TOPIK 5-6"]}}
        ]
    },
    {
        "id": "UI-05-FINANCE",
        "purpose": "collect",
        "rules": [
            {"condition": "bank_balance_usd > 30000", "action": "proceed_to_next"},
            {"condition": "bank_balance_usd <= 30000", "action": "show_error_insufficient_funds"}
        ],
        "fields": [
            {"name": "bank_balance_usd", "validation": {"type": "number", "min": 0}},
            {"name": "sponsor", "validation": {"type": "string"}}
        ]
    },
    {
        "id": "UI-06-HEALTH",
        "purpose": "collect",
        "rules": [
            {"condition": "tb_status == 'negative'", "action": "proceed_to_next"},
            {"condition": "tb_status != 'negative'", "action": "show_error_health"}
        ],
        "fields": [
            {"name": "tb_status", "validation": {"type": "enum", "values": ["negative", "positive", "not_tested"]}},
            {"name": "chronic_disease", "validation": {"type": "string"}}
        ]
    },
    {
        "id": "UI-07-INTENT",
        "purpose": "collect",
        "rules": [
            {"condition": "intent.length > 100", "action": "proceed_to_next"},
            {"condition": "intent.length <= 100", "action": "show_error_intent_too_short"}
        ],
        "fields": [
            {"name": "intent", "validation": {"type": "textarea", "min_length": 100, "max_length": 1000}},
            {"name": "research_area", "validation": {"type": "string"}}
        ]
    },
    {
        "id": "UI-08-DOCUMENTS",
        "purpose": "upload",
        "rules": [
            {"condition": "passport && transcript", "action": "proceed_to_next"},
            {"condition": "not passport || not transcript", "action": "show_error_missing_docs"}
        ],
        "fields": [
            {"name": "passport", "validation": {"type": "file", "formats": ["pdf", "jpg"], "max_size_mb": 5}},
            {"name": "transcript", "validation": {"type": "file", "formats": ["pdf"], "max_size_mb": 5}}
        ]
    },
    {
        "id": "UI-09-SCORE",
        "purpose": "calculate",
        "rules": [
            {"condition": "gpa >= 3.5 && english_score > 100", "action": "set_score_high"},
            {"condition": "gpa >= 2.5 && english_score > 80", "action": "set_score_medium"}
        ],
        "fields": []
    },
    {
        "id": "UI-10-VISA",
        "purpose": "checklist",
        "rules": [
            {"condition": "all_requirements_met", "action": "proceed_to_interview"}
        ],
        "fields": []
    },
    {
        "id": "UI-11-EMPLOYMENT",
        "purpose": "collect",
        "rules": [
            {"condition": "job_intent && experience > 0", "action": "proceed_to_next"}
        ],
        "fields": [
            {"name": "job_intent", "validation": {"type": "string", "min_length": 10}},
            {"name": "experience", "validation": {"type": "number", "min": 0, "max": 60}}
        ]
    },
    {
        "id": "UI-12-ROADMAP",
        "purpose": "summary",
        "rules": [
            {"condition": "true", "action": "show_summary"}
        ],
        "fields": []
    },
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
