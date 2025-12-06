"""
AUTUS Need Detector
Detects feature needs based on detected patterns

Pattern → Feature Need mapping:
- error_rate_high → monitoring_pack
- new_device_type → device_handler
- traffic_spike → auto_scaler
- missing_handler → event_handler
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum

from engines.pattern_analyzer import PatternType, DetectedPattern, AnalysisResult


class NeedPriority(str, Enum):
    """Priority levels for detected needs."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class DetectedNeed:
    """Represents a detected feature need."""
    need_id: str
    name: str
    description: str
    priority: NeedPriority
    spec_template: str
    triggered_by: PatternType
    details: Dict[str, Any]
    detected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    auto_generate: bool = True


# Trigger rules: pattern → feature spec
TRIGGER_RULES = {
    PatternType.ERROR_RATE_HIGH: {
        "name": "Error Monitor",
        "spec_template": "error_monitor",
        "description": "Monitoring system for error rate alerts and diagnostics",
        "priority": NeedPriority.HIGH,
        "auto_generate": True
    },
    PatternType.NEW_DEVICE_TYPE: {
        "name": "Device Handler",
        "spec_template": "device_handler_{device_type}",
        "description": "Handler for new device type: {device_type}",
        "priority": NeedPriority.MEDIUM,
        "auto_generate": True
    },
    PatternType.TRAFFIC_SPIKE: {
        "name": "Auto Scaler",
        "spec_template": "auto_scaler",
        "description": "Auto-scaling system for traffic spikes",
        "priority": NeedPriority.HIGH,
        "auto_generate": True
    },
    PatternType.MISSING_HANDLER: {
        "name": "Event Handler",
        "spec_template": "event_handler_{event_type}",
        "description": "Handler for unhandled event type: {event_type}",
        "priority": NeedPriority.MEDIUM,
        "auto_generate": True
    },
    PatternType.NEW_EVENT_TYPE: {
        "name": "Event Processor",
        "spec_template": "event_processor_{event_type}",
        "description": "Processor for new event type: {event_type}",
        "priority": NeedPriority.LOW,
        "auto_generate": False  # Don't auto-generate for every new event
    },
    PatternType.ANOMALY: {
        "name": "Anomaly Detector",
        "spec_template": "anomaly_detector",
        "description": "Advanced anomaly detection and alerting",
        "priority": NeedPriority.MEDIUM,
        "auto_generate": True
    }
}


class NeedDetector:
    """
    Detects feature needs from analysis patterns.
    
    Maps patterns to actionable feature requirements.
    """
    
    def __init__(self):
        self.detected_needs: List[DetectedNeed] = []
        self.generated_specs: set = set()  # Track what we've already generated
    
    def detect(self, analysis: AnalysisResult) -> List[DetectedNeed]:
        """
        Detect needs from analysis result.
        
        Args:
            analysis: Result from PatternAnalyzer
            
        Returns:
            List of detected needs
        """
        needs = []
        
        for pattern in analysis.patterns:
            need = self._pattern_to_need(pattern)
            if need and need.need_id not in self.generated_specs:
                needs.append(need)
                self.detected_needs.append(need)
        
        return needs
    
    def _pattern_to_need(self, pattern: DetectedPattern) -> Optional[DetectedNeed]:
        """Convert a pattern to a feature need."""
        rule = TRIGGER_RULES.get(pattern.pattern_type)
        
        if not rule:
            return None
        
        # Format template with pattern details
        spec_template = rule["spec_template"]
        description = rule["description"]
        name = rule["name"]
        
        # Replace placeholders
        for key, value in pattern.details.items():
            placeholder = f"{{{key}}}"
            if placeholder in spec_template:
                spec_template = spec_template.replace(placeholder, str(value))
            if placeholder in description:
                description = description.replace(placeholder, str(value))
            if placeholder in name:
                name = name.replace(placeholder, str(value))
        
        # Clean up any remaining placeholders
        spec_template = spec_template.replace("{", "").replace("}", "")
        
        need_id = f"need_{spec_template}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
        
        return DetectedNeed(
            need_id=need_id,
            name=name,
            description=description,
            priority=rule["priority"],
            spec_template=spec_template,
            triggered_by=pattern.pattern_type,
            details={
                "pattern_details": pattern.details,
                "pattern_confidence": pattern.confidence,
                "pattern_severity": pattern.severity
            },
            auto_generate=rule["auto_generate"]
        )
    
    def get_pending_needs(self) -> List[DetectedNeed]:
        """Get needs that haven't been generated yet."""
        return [
            need for need in self.detected_needs
            if need.need_id not in self.generated_specs
        ]
    
    def get_auto_generate_needs(self) -> List[DetectedNeed]:
        """Get needs that should be auto-generated."""
        return [
            need for need in self.get_pending_needs()
            if need.auto_generate
        ]
    
    def mark_generated(self, need_id: str):
        """Mark a need as having been generated."""
        self.generated_specs.add(need_id)
    
    def get_needs_by_priority(self, priority: NeedPriority) -> List[DetectedNeed]:
        """Get needs filtered by priority."""
        return [
            need for need in self.detected_needs
            if need.priority == priority
        ]
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of detected needs."""
        return {
            "total_needs": len(self.detected_needs),
            "pending": len(self.get_pending_needs()),
            "auto_generate": len(self.get_auto_generate_needs()),
            "by_priority": {
                p.value: len(self.get_needs_by_priority(p))
                for p in NeedPriority
            },
            "generated_specs": len(self.generated_specs)
        }
    
    def reset(self):
        """Reset detector state."""
        self.detected_needs.clear()
        self.generated_specs.clear()


# Singleton instance
_detector: Optional[NeedDetector] = None


def get_need_detector() -> NeedDetector:
    """Get or create the need detector singleton."""
    global _detector
    if _detector is None:
        _detector = NeedDetector()
    return _detector

