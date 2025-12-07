from fastapi import APIRouter
from typing import Dict, List
from kernel.flow_mapper.generator import generate_flow, QUESTION_TEMPLATES
from kernel.ui_dsl.screen_model import UIScreen, UIComponent
from kernel.ui_dsl.figma_export import screens_to_figma_document

router = APIRouter(prefix="/ui", tags=["UI Export"])

SCREEN_TITLES = {
    "UI-01-WELCOME": "Welcome to LimePass",
    "UI-02-IDENTITY": "Basic Identity",
    "UI-03-ACADEMIC": "Academic Background",
    "UI-04-LANGUAGE": "Language Proficiency",
    "UI-05-FINANCE": "Financial Capacity",
    "UI-06-HEALTH": "Health & TB Status",
    "UI-07-INTENT": "Study Intent",
    "UI-08-DOCUMENTS": "Document Upload",
    "UI-09-SCORE": "Eligibility Score",
    "UI-10-VISA": "Visa Checklist",
    "UI-11-EMPLOYMENT": "Employment Fit",
    "UI-12-ROADMAP": "Your Roadmap",
}

def flow_to_screens(app_id: str) -> List[Dict]:
    flow = generate_flow(app_id, [])
    screens = []
    
    for step in flow.steps:
        screen = {
            "id": step.id,
            "title": SCREEN_TITLES.get(step.id, step.id),
            "layout": "single_column",
            "components": []
        }
        
        # Heading
        screen["components"].append({
            "id": f"{step.id}-heading",
            "type": "heading",
            "props": {"text": SCREEN_TITLES.get(step.id, step.id)}
        })
        
        # Questions
        for q in step.questions:
            screen["components"].append({
                "id": f"{step.id}-{q.field}-label",
                "type": "text",
                "props": {"text": q.question_en}
            })
            screen["components"].append({
                "id": f"{step.id}-{q.field}-input",
                "type": q.input_type,
                "props": {"name": q.field, "required": q.required, "options": q.options}
            })
        
        # Next button
        btn_text = "Start" if step.purpose == "welcome" else "Finish" if step.purpose == "summary" else "Next"
        screen["components"].append({
            "id": f"{step.id}-btn",
            "type": "button",
            "props": {"text": btn_text, "action": "next" if step.next_step_id else "finish"}
        })
        
        screens.append(screen)
    
    return screens

@router.get("/{app_id}/screens")
async def get_screens(app_id: str):
    """Generate screens.json for app"""
    screens = flow_to_screens(app_id)
    return {"app_id": app_id, "screens": screens, "total": len(screens)}

@router.get("/{app_id}/figma")
async def get_figma_document(app_id: str):
    """Generate Figma DSL document"""
    screens = flow_to_screens(app_id)
    
    # Convert to UIScreen objects
    ui_screens = []
    for s in screens:
        screen = UIScreen(id=s["id"], title=s["title"])
        for c in s["components"]:
            screen.components.append(UIComponent(
                id=c["id"],
                type=c["type"],
                props=c["props"]
            ))
        ui_screens.append(screen)
    
    figma_doc = screens_to_figma_document(app_id, ui_screens)
    return figma_doc
