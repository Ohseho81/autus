#!/usr/bin/env python3
"""
AUTUS Spec-to-Code Generator
SPEC-1D/2P/3W → Pydantic Models, FastAPI Routes, Workflow Handlers
"""

import yaml
import os
from pathlib import Path
from datetime import datetime

SPECS_DIR = Path("docs/specs")
OUTPUT_DIR = Path("packs/generated")

def load_spec(spec_file: str) -> dict:
    """Load YAML spec file"""
    with open(SPECS_DIR / spec_file, 'r') as f:
        return yaml.safe_load(f)

def type_to_python(spec_type: str) -> str:
    """Convert spec type to Python type"""
    mapping = {
        'string': 'str',
        'int': 'int',
        'float': 'float',
        'datetime': 'datetime',
        'duration': 'timedelta',
        'geo': 'tuple[float, float]',
    }
    
    if spec_type.startswith('enum['):
        values = spec_type[5:-1].split(', ')
        return f"Literal[{', '.join(repr(v) for v in values)}]"
    
    if spec_type.endswith('.ref'):
        return 'str'  # Reference as ID string
    
    return mapping.get(spec_type, 'Any')

def generate_models(spec: dict) -> str:
    """Generate Pydantic models from SPEC-1D"""
    domain = spec.get('domain', 'unknown')
    
    lines = [
        '"""',
        f'Auto-generated Pydantic models for {domain}',
        f'Generated: {datetime.now().isoformat()}',
        '"""',
        '',
        'from pydantic import BaseModel, Field',
        'from typing import Optional, Literal, Any',
        'from datetime import datetime, timedelta',
        '',
    ]
    
    for entity in spec.get('entities', []):
        name = entity['name']
        key = entity.get('key', 'id')
        desc = entity.get('description', '')
        
        lines.append(f'class {name}(BaseModel):')
        lines.append(f'    """{desc}"""')
        lines.append(f'    {key}: str = Field(..., description="Primary key")')
        
        for attr in entity.get('attributes', []):
            attr_name = attr['name']
            attr_type = type_to_python(attr['type'])
            lines.append(f'    {attr_name}: Optional[{attr_type}] = None')
        
        lines.append('')
    
    return '\n'.join(lines)

def generate_events(spec: dict) -> str:
    """Generate event classes from SPEC-2P"""
    domain = spec.get('domain', 'unknown')
    
    lines = [
        '"""',
        f'Auto-generated events for {domain}',
        f'Generated: {datetime.now().isoformat()}',
        '"""',
        '',
        'from pydantic import BaseModel',
        'from typing import Optional, Any',
        'from datetime import datetime',
        '',
    ]
    
    for event in spec.get('events', []):
        name = event['name']
        desc = event.get('description', '')
        
        # Convert snake_case to PascalCase
        class_name = ''.join(word.title() for word in name.split('_')) + 'Event'
        
        lines.append(f'class {class_name}(BaseModel):')
        lines.append(f'    """{desc}"""')
        lines.append(f'    event_type: str = "{name}"')
        lines.append(f'    timestamp: datetime = None')
        
        for payload in event.get('payload', []):
            p_name = payload['name']
            p_type = type_to_python(payload['type'])
            lines.append(f'    {p_name}: Optional[{p_type}] = None')
        
        lines.append('')
    
    return '\n'.join(lines)

def generate_routes(objects_spec: dict, protocols_spec: dict) -> str:
    """Generate FastAPI routes from specs"""
    domain = objects_spec.get('domain', 'unknown')
    
    lines = [
        '"""',
        f'Auto-generated FastAPI routes for {domain}',
        f'Generated: {datetime.now().isoformat()}',
        '"""',
        '',
        'from fastapi import APIRouter, HTTPException',
        'from typing import List, Optional',
        f'from .models import *',
        f'from .events import *',
        '',
        f'router = APIRouter(prefix="/{domain}", tags=["{domain}"])',
        '',
    ]
    
    # CRUD routes for each entity
    for entity in objects_spec.get('entities', []):
        name = entity['name']
        name_lower = name.lower()
        key = entity.get('key', 'id')
        
        lines.append(f'# === {name} CRUD ===')
        lines.append('')
        
        # List
        lines.append(f'@router.get("/{name_lower}s", response_model=List[{name}])')
        lines.append(f'async def list_{name_lower}s():')
        lines.append(f'    """List all {name}s"""')
        lines.append(f'    return []  # TODO: Implement')
        lines.append('')
        
        # Get
        lines.append(f'@router.get("/{name_lower}s/{{{key}}}", response_model={name})')
        lines.append(f'async def get_{name_lower}({key}: str):')
        lines.append(f'    """Get {name} by {key}"""')
        lines.append(f'    raise HTTPException(404, "{name} not found")  # TODO: Implement')
        lines.append('')
        
        # Create
        lines.append(f'@router.post("/{name_lower}s", response_model={name})')
        lines.append(f'async def create_{name_lower}(item: {name}):')
        lines.append(f'    """Create new {name}"""')
        lines.append(f'    return item  # TODO: Implement')
        lines.append('')
        
        # Update
        lines.append(f'@router.put("/{name_lower}s/{{{key}}}", response_model={name})')
        lines.append(f'async def update_{name_lower}({key}: str, item: {name}):')
        lines.append(f'    """Update {name}"""')
        lines.append(f'    return item  # TODO: Implement')
        lines.append('')
        
        # Delete
        lines.append(f'@router.delete("/{name_lower}s/{{{key}}}")')
        lines.append(f'async def delete_{name_lower}({key}: str):')
        lines.append(f'    """Delete {name}"""')
        lines.append(f'    return {{"deleted": {key}}}  # TODO: Implement')
        lines.append('')
    
    # Event endpoints
    lines.append('# === Events ===')
    lines.append('')
    for event in protocols_spec.get('events', []):
        name = event['name']
        class_name = ''.join(word.title() for word in name.split('_')) + 'Event'
        
        lines.append(f'@router.post("/events/{name}")')
        lines.append(f'async def emit_{name}(event: {class_name}):')
        lines.append(f'    """Emit {name} event"""')
        lines.append(f'    return {{"emitted": "{name}"}}  # TODO: Implement')
        lines.append('')
    
    return '\n'.join(lines)

def generate_workflows(spec: dict) -> str:
    """Generate workflow handlers from SPEC-3W"""
    domain = spec.get('domain', 'unknown')
    
    lines = [
        '"""',
        f'Auto-generated workflow handlers for {domain}',
        f'Generated: {datetime.now().isoformat()}',
        '"""',
        '',
        'from typing import Dict, Any',
        'import logging',
        '',
        'logger = logging.getLogger(__name__)',
        '',
    ]
    
    for workflow in spec.get('workflows', []):
        name = workflow['name']
        desc = workflow.get('description', '')
        trigger = workflow.get('trigger', 'manual')
        
        lines.append(f'class {name.title().replace("_", "")}Workflow:')
        lines.append(f'    """')
        lines.append(f'    {desc}')
        lines.append(f'    Trigger: {trigger}')
        lines.append(f'    """')
        lines.append(f'    ')
        lines.append(f'    def __init__(self):')
        lines.append(f'        self.name = "{name}"')
        lines.append(f'        self.trigger = "{trigger}"')
        lines.append(f'    ')
        lines.append(f'    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:')
        lines.append(f'        """Execute workflow"""')
        lines.append(f'        results = {{}}')
        lines.append(f'        ')
        
        for i, step in enumerate(workflow.get('steps', [])):
            step_name = step['name']
            action = step.get('action', step_name)
            lines.append(f'        # Step {i+1}: {step_name}')
            lines.append(f'        results["{step_name}"] = await self.{step_name}(context)')
            lines.append(f'        logger.info(f"{step_name} completed")')
            lines.append(f'        ')
        
        lines.append(f'        return results')
        lines.append(f'    ')
        
        # Generate step methods
        for step in workflow.get('steps', []):
            step_name = step['name']
            action = step.get('action', '')
            lines.append(f'    async def {step_name}(self, context: Dict[str, Any]) -> Any:')
            lines.append(f'        """{action}"""')
            lines.append(f'        # TODO: Implement')
            lines.append(f'        return None')
            lines.append(f'    ')
        
        lines.append('')
    
    return '\n'.join(lines)

def generate_init(domain: str) -> str:
    """Generate __init__.py"""
    return f'''"""
Auto-generated pack for {domain}
"""

from .models import *
from .events import *
from .routes import router
from .workflows import *
'''

def main():
    """Main generator"""
    print("=== AUTUS Spec-to-Code Generator ===\n")
    
    # Load specs
    objects_spec = load_spec("SPEC-1D-emo_hub_objects.yaml")
    protocols_spec = load_spec("SPEC-2P-emo_hub_protocols.yaml")
    workflows_spec = load_spec("SPEC-3W-emo_hub_workflows.yaml")
    
    domain = objects_spec.get('domain', 'emo_hub')
    output_dir = OUTPUT_DIR / domain
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate files
    print(f"[1] Generating models...")
    models_code = generate_models(objects_spec)
    (output_dir / "models.py").write_text(models_code)
    print(f"    → {output_dir}/models.py")
    
    print(f"[2] Generating events...")
    events_code = generate_events(protocols_spec)
    (output_dir / "events.py").write_text(events_code)
    print(f"    → {output_dir}/events.py")
    
    print(f"[3] Generating routes...")
    routes_code = generate_routes(objects_spec, protocols_spec)
    (output_dir / "routes.py").write_text(routes_code)
    print(f"    → {output_dir}/routes.py")
    
    print(f"[4] Generating workflows...")
    workflows_code = generate_workflows(workflows_spec)
    (output_dir / "workflows.py").write_text(workflows_code)
    print(f"    → {output_dir}/workflows.py")
    
    print(f"[5] Generating __init__.py...")
    init_code = generate_init(domain)
    (output_dir / "__init__.py").write_text(init_code)
    print(f"    → {output_dir}/__init__.py")
    
    print(f"\n=== Complete! Generated {domain} pack ===")
    print(f"Location: {output_dir}")

if __name__ == "__main__":
    main()
