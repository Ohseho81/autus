from dataclasses import dataclass, field
from typing import List, Optional, Dict, Literal

Severity = Literal["blocker", "warning", "info"]

@dataclass
class QuestionTemplate:
    field: str
    question_en: str
    question_kr: str = ""
    question_ph: str = ""
    input_type: str = "text"
    options: Optional[List[str]] = None
    required: bool = True

@dataclass
class UIStep:
    id: str
    purpose: str
    rule_ids: List[str] = field(default_factory=list)
    questions: List[QuestionTemplate] = field(default_factory=list)
    severity: Optional[Severity] = None
    next_step_id: Optional[str] = None

@dataclass
class UIFlow:
    app_id: str
    steps: List[UIStep] = field(default_factory=list)
