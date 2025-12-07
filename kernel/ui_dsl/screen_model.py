from dataclasses import dataclass, field
from typing import List, Literal

LayoutType = Literal["single_column", "two_column", "centered"]

@dataclass
class UIComponent:
    id: str
    type: str
    props: dict

@dataclass
class UIScreen:
    id: str
    title: str
    layout: LayoutType = "single_column"
    components: List[UIComponent] = field(default_factory=list)
