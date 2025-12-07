from typing import List, Dict
from dataclasses import dataclass, field, asdict
from .screen_model import UIScreen, UIComponent

@dataclass
class FigmaNode:
    id: str
    type: str
    name: str
    props: dict
    children: List["FigmaNode"] = field(default_factory=list)

@dataclass
class FigmaPage:
    id: str
    name: str
    children: List[FigmaNode] = field(default_factory=list)

@dataclass
class FigmaDocument:
    id: str
    name: str
    pages: List[FigmaPage] = field(default_factory=list)

TYPE_MAP = {
    "heading": "TEXT",
    "text": "TEXT",
    "text_input": "INPUT",
    "number_input": "INPUT",
    "textarea": "TEXTAREA",
    "select": "DROPDOWN",
    "checkbox": "CHECKBOX",
    "button": "BUTTON",
    "file_upload": "FILE_INPUT",
}

def component_to_figma_node(comp: UIComponent, parent_id: str) -> FigmaNode:
    return FigmaNode(
        id=f"{parent_id}-{comp.id}",
        type=TYPE_MAP.get(comp.type, "RECTANGLE"),
        name=comp.id,
        props=comp.props
    )

def screen_to_figma(screen: UIScreen) -> FigmaNode:
    frame = FigmaNode(
        id=f"FRAME-{screen.id}",
        type="FRAME",
        name=screen.title,
        props={"layoutMode": "VERTICAL", "itemSpacing": 16, "padding": 24}
    )
    for comp in screen.components:
        frame.children.append(component_to_figma_node(comp, frame.id))
    return frame

def screens_to_figma_document(app_id: str, screens: List[UIScreen]) -> Dict:
    page = FigmaPage(
        id=f"PAGE-{app_id}",
        name=f"{app_id}-flow",
        children=[screen_to_figma(s) for s in screens]
    )
    doc = FigmaDocument(
        id=f"DOC-{app_id}",
        name=f"{app_id}-ui",
        pages=[page]
    )
    return asdict(doc)
