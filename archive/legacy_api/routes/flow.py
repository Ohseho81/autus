from fastapi import APIRouter
from typing import Dict, List
from kernel.flow_mapper.generator import generate_flow, flow_to_dict, QUESTION_TEMPLATES
from kernel.flow_mapper.models import UIStep
from kernel.ui_dsl.screen_model import UIScreen, UIComponent
from kernel.ui_dsl.figma_export import screens_to_figma_document

router = APIRouter(prefix="/flow", tags=["Flow Mapper"])

@router.get("/limepass")
async def get_limepass_flow():
    """Generate LimePass 12-step flow"""
    rules = ["R-GPA-MIN", "R-MAJOR-FIT", "R-ENGLISH", "R-VISA-FIN", "R-VISA-TB", "R-INTENT", "R-DOC-COMPLETE", "R-EMP-FIT"]
    flow = generate_flow("LIMEPASS-PH-KR", rules)
    return flow_to_dict(flow)

@router.get("/kwangwoon")
async def get_kwangwoon_flow():
    """Generate PH→Kwangwoon Master Track flow"""
    rules = ["R-GPA-MIN", "R-MAJOR-FIT", "R-ENGLISH", "R-KOREAN", "R-VISA-FIN", "R-VISA-TB", "R-INTENT", "R-DOC-COMPLETE"]
    flow = generate_flow("PH-KW-MASTER", rules)
    return flow_to_dict(flow)

@router.post("/generate")
async def generate_custom_flow(data: Dict):
    """Generate custom flow from rules"""
    app_id = data.get("app_id", "CUSTOM-FLOW")
    rules = data.get("rules", [])
    flow = generate_flow(app_id, rules)
    return flow_to_dict(flow)

@router.get("/figma/{app_id}")
async def get_figma_document(app_id: str):
    """Generate Figma DSL document"""
    flow = generate_flow(app_id, [])
    
    screens = []
    for step in flow.steps:
        screen = UIScreen(id=step.id, title=step.id)
        
        if step.purpose == "welcome":
            screen.components.append(UIComponent(f"{step.id}-title", "heading", {"text": "Welcome to LimePass"}))
            screen.components.append(UIComponent(f"{step.id}-desc", "text", {"text": "Your path to Korea starts here"}))
        
        for q in step.questions:
            screen.components.append(UIComponent(f"{step.id}-{q.field}-label", "text", {"text": q.question_en}))
            screen.components.append(UIComponent(f"{step.id}-{q.field}-input", q.input_type, {"name": q.field, "options": q.options}))
        
        screen.components.append(UIComponent(f"{step.id}-next", "button", {"text": "Next", "action": "next"}))
        screens.append(screen)
    
    return screens_to_figma_document(app_id, screens)

@router.get("/templates")
async def get_question_templates():
    """Get all question templates"""
    return {
        "templates": {k: {"field": v.field, "question_en": v.question_en, "input_type": v.input_type, "options": v.options}
                      for k, v in QUESTION_TEMPLATES.items()}
    }
