from typing import List, Dict
from .models import UIFlow, UIStep, QuestionTemplate
from .cluster import DEFAULT_STEPS, cluster_rules

QUESTION_TEMPLATES = {
    "name": QuestionTemplate("name", "What is your full name?", "이름을 입력하세요", "Ano ang pangalan mo?"),
    "email": QuestionTemplate("email", "Email address", "이메일 주소", "Email address", "email"),
    "birth": QuestionTemplate("birth", "Date of birth", "생년월일", "Petsa ng kapanganakan", "date"),
    "gpa": QuestionTemplate("gpa", "What is your GPA?", "학점(GPA)은?", "Ano ang GPA mo?", "number"),
    "major": QuestionTemplate("major", "What was your major?", "전공은?", "Ano ang kurso mo?"),
    "english_score": QuestionTemplate("english_score", "English test score (IELTS/TOEFL)", "영어 점수", "English score", "number"),
    "korean_level": QuestionTemplate("korean_level", "Korean level", "한국어 수준", "Antas ng Korean", "select", ["None", "TOPIK 1-2", "TOPIK 3-4", "TOPIK 5-6"]),
    "bank_balance_usd": QuestionTemplate("bank_balance_usd", "Savings (USD)", "예금 잔액(USD)", "Savings (USD)", "number"),
    "sponsor": QuestionTemplate("sponsor", "Do you have a sponsor?", "후원자가 있나요?", "May sponsor ka ba?", "select", ["Yes", "No"]),
    "tb_status": QuestionTemplate("tb_status", "TB test result", "결핵 검사 결과", "TB test result", "select", ["negative", "positive", "not_tested"]),
    "intent": QuestionTemplate("intent", "Why Korea?", "한국을 선택한 이유", "Bakit Korea?", "textarea"),
    "job_intent": QuestionTemplate("job_intent", "Career goal", "커리어 목표", "Career goal", "textarea"),
}

STEP_FIELDS = {
    "UI-02-IDENTITY": ["name", "email", "birth"],
    "UI-03-ACADEMIC": ["gpa", "major"],
    "UI-04-LANGUAGE": ["english_score", "korean_level"],
    "UI-05-FINANCE": ["bank_balance_usd", "sponsor"],
    "UI-06-HEALTH": ["tb_status"],
    "UI-07-INTENT": ["intent"],
    "UI-11-EMPLOYMENT": ["job_intent"],
}

def generate_flow(app_id: str, rule_ids: List[str] = None) -> UIFlow:
    rule_ids = rule_ids or []
    clustered = cluster_rules(rule_ids)
    
    steps = []
    for step_id, purpose in DEFAULT_STEPS:
        step = UIStep(
            id=step_id,
            purpose=purpose,
            rule_ids=clustered.get(step_id, [])
        )
        
        fields = STEP_FIELDS.get(step_id, [])
        for f in fields:
            if f in QUESTION_TEMPLATES:
                step.questions.append(QUESTION_TEMPLATES[f])
        
        steps.append(step)
    
    for i in range(len(steps) - 1):
        steps[i].next_step_id = steps[i + 1].id
    
    return UIFlow(app_id=app_id, steps=steps)

def flow_to_dict(flow: UIFlow) -> Dict:
    return {
        "app_id": flow.app_id,
        "steps": [
            {
                "id": s.id,
                "purpose": s.purpose,
                "rule_ids": s.rule_ids,
                "questions": [
                    {"field": q.field, "question_en": q.question_en, "input_type": q.input_type, "options": q.options}
                    for q in s.questions
                ],
                "next_step_id": s.next_step_id
            }
            for s in flow.steps
        ],
        "total_steps": len(flow.steps)
    }
