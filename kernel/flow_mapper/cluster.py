from typing import Dict, List
from collections import defaultdict

RULE_GROUP_MAP = {
    "R-GPA": "UI-03-ACADEMIC",
    "R-MAJOR": "UI-03-ACADEMIC",
    "R-ENGLISH": "UI-04-LANGUAGE",
    "R-KOREAN": "UI-04-LANGUAGE",
    "R-FIN": "UI-05-FINANCE",
    "R-VISA-FIN": "UI-05-FINANCE",
    "R-HEALTH": "UI-06-HEALTH",
    "R-VISA-TB": "UI-06-HEALTH",
    "R-INTENT": "UI-07-INTENT",
    "R-DOC": "UI-08-DOCUMENTS",
    "R-VISA": "UI-10-VISA",
    "R-EMP": "UI-11-EMPLOYMENT",
}

DEFAULT_STEPS = [
    ("UI-01-WELCOME", "welcome"),
    ("UI-02-IDENTITY", "collect"),
    ("UI-03-ACADEMIC", "collect"),
    ("UI-04-LANGUAGE", "collect"),
    ("UI-05-FINANCE", "collect"),
    ("UI-06-HEALTH", "collect"),
    ("UI-07-INTENT", "collect"),
    ("UI-08-DOCUMENTS", "upload"),
    ("UI-09-SCORE", "calculate"),
    ("UI-10-VISA", "checklist"),
    ("UI-11-EMPLOYMENT", "collect"),
    ("UI-12-ROADMAP", "summary"),
]

def classify_rule(rule_id: str) -> str:
    for prefix, step_id in RULE_GROUP_MAP.items():
        if rule_id.startswith(prefix):
            return step_id
    return "UI-09-SCORE"

def cluster_rules(rule_ids: List[str]) -> Dict[str, List[str]]:
    buckets = defaultdict(list)
    for rid in rule_ids:
        step_id = classify_rule(rid)
        buckets[step_id].append(rid)
    return dict(buckets)
