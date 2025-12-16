from fastapi import APIRouter
from typing import Dict, List
from kernel.flow_mapper import generate_flow, QUESTION_TEMPLATES

router = APIRouter(prefix="/ui", tags=["UI Export"])

TITLES = {
    "UI-01-WELCOME": "Welcome", "UI-02-IDENTITY": "Identity", "UI-03-ACADEMIC": "Academic",
    "UI-04-LANGUAGE": "Language", "UI-05-FINANCE": "Finance", "UI-06-HEALTH": "Health",
    "UI-07-INTENT": "Intent", "UI-08-DOCUMENTS": "Documents", "UI-09-SCORE": "Score",
    "UI-10-VISA": "Visa", "UI-11-EMPLOYMENT": "Employment", "UI-12-ROADMAP": "Roadmap"
}

@router.get("/{app_id}/screens")
async def get_screens(app_id: str):
    flow = generate_flow(app_id, [])
    screens = []
    for step in flow.steps:
        screen = {"id": step.id, "title": TITLES.get(step.id, step.id), "layout": "single_column", "components": []}
        screen["components"].append({"id": f"{step.id}-heading", "type": "heading", "props": {"text": TITLES.get(step.id)}})
        for q in step.questions:
            screen["components"].append({"id": f"{step.id}-{q.field}-label", "type": "text", "props": {"text": q.question_en}})
            screen["components"].append({"id": f"{step.id}-{q.field}-input", "type": q.input_type, "props": {"name": q.field}})
        screen["components"].append({"id": f"{step.id}-btn", "type": "button", "props": {"text": "Next"}})
        screens.append(screen)
    return {"app_id": app_id, "screens": screens}

@router.get("/{app_id}/figma")
async def get_figma(app_id: str):
    """Export UI flow as Figma document structure"""
    flow = generate_flow([])
    figma_doc = {
        "id": f"figma_{app_id}",
        "name": f"UI Flow - {app_id}",
        "type": "document",
        "frames": []
    }
    
    for step in flow:
        frame = {
            "id": f"frame_{step['id']}",
            "name": step['id'],
            "type": "frame",
            "children": []
        }
        figma_doc["frames"].append(frame)
    
    return figma_doc
