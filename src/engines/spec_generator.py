"""
AUTUS Spec Generator
Generates YAML specs from detected needs

Detected Need → YAML Spec → specs/auto/ folder
"""

import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass

from engines.need_detector import DetectedNeed, NeedPriority


@dataclass
class GeneratedSpec:
    """Represents a generated spec."""
    spec_id: str
    name: str
    file_path: str
    content: Dict[str, Any]
    generated_at: datetime
    need_id: str


# Spec templates by type
SPEC_TEMPLATES = {
    "error_monitor": {
        "layer": "4_packs",
        "pillar": "impact",
        "features": [
            "Error rate monitoring",
            "Alert notifications",
            "Error aggregation",
            "Root cause analysis"
        ],
        "requirements": [
            "Monitor error rates across all services",
            "Send alerts when threshold exceeded",
            "Aggregate errors by type and source",
            "Provide diagnostic information"
        ],
        "api_endpoints": [
            "GET /monitor/errors",
            "GET /monitor/alerts",
            "POST /monitor/threshold"
        ],
        "files": [
            "core/monitor/error_tracker.py",
            "core/monitor/alerter.py"
        ]
    },
    "device_handler": {
        "layer": "3_worlds",
        "pillar": "information",
        "features": [
            "Device registration",
            "Event processing",
            "Status tracking",
            "Data validation"
        ],
        "requirements": [
            "Register new devices automatically",
            "Process device events",
            "Track device status",
            "Validate incoming data"
        ],
        "api_endpoints": [
            "POST /devices/register",
            "GET /devices/{device_id}",
            "POST /devices/{device_id}/events"
        ],
        "files": [
            "core/devices/handler.py",
            "core/devices/registry.py"
        ]
    },
    "auto_scaler": {
        "layer": "4_packs",
        "pillar": "impact",
        "features": [
            "Traffic monitoring",
            "Auto-scaling triggers",
            "Resource management",
            "Load balancing hints"
        ],
        "requirements": [
            "Monitor traffic in real-time",
            "Trigger scaling based on thresholds",
            "Manage resource allocation",
            "Provide load balancing recommendations"
        ],
        "api_endpoints": [
            "GET /scale/status",
            "POST /scale/trigger",
            "GET /scale/metrics"
        ],
        "files": [
            "core/scale/monitor.py",
            "core/scale/trigger.py"
        ]
    },
    "event_handler": {
        "layer": "3_worlds",
        "pillar": "information",
        "features": [
            "Event routing",
            "Event processing",
            "Event storage",
            "Event replay"
        ],
        "requirements": [
            "Route events to appropriate handlers",
            "Process events asynchronously",
            "Store events for audit",
            "Support event replay"
        ],
        "api_endpoints": [
            "POST /events/process",
            "GET /events/{event_id}",
            "POST /events/replay"
        ],
        "files": [
            "core/events/router.py",
            "core/events/processor.py"
        ]
    },
    "anomaly_detector": {
        "layer": "4_packs",
        "pillar": "intent",
        "features": [
            "Statistical anomaly detection",
            "Pattern recognition",
            "Alert generation",
            "Trend analysis"
        ],
        "requirements": [
            "Detect statistical anomalies",
            "Recognize unusual patterns",
            "Generate alerts for anomalies",
            "Analyze trends over time"
        ],
        "api_endpoints": [
            "GET /anomaly/detect",
            "GET /anomaly/alerts",
            "GET /anomaly/trends"
        ],
        "files": [
            "core/anomaly/detector.py",
            "core/anomaly/analyzer.py"
        ]
    }
}


class SpecGenerator:
    """
    Generates YAML specs from detected needs.
    
    Saves specs to specs/auto/ folder and can update backlog.
    """
    
    def __init__(self, specs_dir: str = "specs/auto"):
        self.specs_dir = Path(specs_dir)
        self.specs_dir.mkdir(parents=True, exist_ok=True)
        self.generated_specs: List[GeneratedSpec] = []
    
    def generate(self, need: DetectedNeed) -> Optional[GeneratedSpec]:
        """
        Generate a spec from a detected need.
        
        Args:
            need: The detected need
            
        Returns:
            GeneratedSpec if successful, None otherwise
        """
        # Get base template
        template_key = self._get_template_key(need.spec_template)
        template = SPEC_TEMPLATES.get(template_key, self._get_default_template())
        
        # Build spec content
        spec_content = self._build_spec(need, template)
        
        # Generate file path
        file_name = f"{need.spec_template}.yaml"
        file_path = self.specs_dir / file_name
        
        # Save to file
        with open(file_path, 'w') as f:
            yaml.dump(spec_content, f, default_flow_style=False, allow_unicode=True)
        
        # Create record
        generated = GeneratedSpec(
            spec_id=f"spec_{need.spec_template}",
            name=need.name,
            file_path=str(file_path),
            content=spec_content,
            generated_at=datetime.now(timezone.utc),
            need_id=need.need_id
        )
        
        self.generated_specs.append(generated)
        
        return generated
    
    def _get_template_key(self, spec_template: str) -> str:
        """Extract template key from spec template name."""
        # Handle templates like "device_handler_temp" → "device_handler"
        for key in SPEC_TEMPLATES.keys():
            if spec_template.startswith(key):
                return key
        return spec_template
    
    def _get_default_template(self) -> Dict[str, Any]:
        """Get default template for unknown spec types."""
        return {
            "layer": "4_packs",
            "pillar": "information",
            "features": ["Auto-generated feature"],
            "requirements": ["Implement the required functionality"],
            "api_endpoints": [],
            "files": ["core/auto/handler.py"]
        }
    
    def _build_spec(self, need: DetectedNeed, template: Dict) -> Dict[str, Any]:
        """Build complete spec content."""
        return {
            "name": need.name,
            "description": need.description,
            "layer": template.get("layer", "4_packs"),
            "pillar": template.get("pillar", "information"),
            "priority": need.priority.value,
            "auto_generated": True,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "triggered_by": need.triggered_by.value,
            "features": template.get("features", []),
            "requirements": template.get("requirements", []),
            "api_endpoints": template.get("api_endpoints", []),
            "files": template.get("files", []),
            "metadata": {
                "need_id": need.need_id,
                "pattern_details": need.details.get("pattern_details", {}),
                "confidence": need.details.get("pattern_confidence", 0)
            }
        }
    
    def add_to_backlog(
        self,
        spec: GeneratedSpec,
        backlog_path: str = "specs/backlog.yaml"
    ) -> bool:
        """
        Add generated spec to backlog.
        
        Args:
            spec: The generated spec
            backlog_path: Path to backlog file
            
        Returns:
            True if successful
        """
        backlog_file = Path(backlog_path)
        
        # Load existing backlog
        if backlog_file.exists():
            with open(backlog_file) as f:
                backlog = yaml.safe_load(f) or {}
        else:
            backlog = {"features": []}
        
        # Check if already exists
        existing_ids = {f.get("id") for f in backlog.get("features", [])}
        if spec.spec_id in existing_ids:
            return False
        
        # Create backlog entry
        entry = {
            "id": spec.spec_id,
            "name": spec.name,
            "description": spec.content.get("description", ""),
            "priority": self._priority_to_number(spec.content.get("priority", "medium")),
            "status": "pending",
            "layer": spec.content.get("layer", "4_packs"),
            "pillar": spec.content.get("pillar", "information"),
            "auto_generated": True,
            "spec_file": spec.file_path,
            "created_at": spec.generated_at.isoformat()
        }
        
        backlog.setdefault("features", []).append(entry)
        
        # Save backlog
        with open(backlog_file, 'w') as f:
            yaml.dump(backlog, f, default_flow_style=False, allow_unicode=True)
        
        return True
    
    def _priority_to_number(self, priority: str) -> int:
        """Convert priority string to number for sorting."""
        mapping = {
            "critical": 0,
            "high": 1,
            "medium": 2,
            "low": 3
        }
        return mapping.get(priority, 2)
    
    def get_generated_specs(self) -> List[GeneratedSpec]:
        """Get all generated specs."""
        return self.generated_specs
    
    def get_spec_files(self) -> List[str]:
        """Get list of generated spec file paths."""
        return [str(p) for p in self.specs_dir.glob("*.yaml")]
    
    def get_summary(self) -> Dict[str, Any]:
        """Get generator summary."""
        return {
            "total_generated": len(self.generated_specs),
            "specs_dir": str(self.specs_dir),
            "spec_files": self.get_spec_files()
        }


# Singleton instance
_generator: Optional[SpecGenerator] = None


def get_spec_generator() -> SpecGenerator:
    """Get or create the spec generator singleton."""
    global _generator
    if _generator is None:
        _generator = SpecGenerator()
    return _generator

