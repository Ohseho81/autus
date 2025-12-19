"""Event Engine - Process events and update entity vectors"""
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from .influence_matrix import EntityType, AxisType
from .vector_engine import VectorEngine, Vector

@dataclass
class Entity:
    id: str
    type: EntityType
    vector: Vector = field(default_factory=lambda: {
        "DIR": 0.2, "FOR": 0.25, "GAP": 0.8, "TEM": 0.8, "UNC": 0.7, "INT": 0.3
    })
    history: List[Dict] = field(default_factory=list)

@dataclass 
class Event:
    code: str
    source_type: EntityType
    delta: Vector
    description: str = ""

# LIME PASS Event Dictionary (30 events)
EVENT_DICTIONARY: Dict[str, Event] = {
    # HUM Events (10)
    "HUM:ApplicationStarted": Event("HUM:ApplicationStarted", "HUM", {"DIR": 0.10, "FOR": 0.10, "GAP": -0.05, "UNC": -0.05}, "Student starts application"),
    "HUM:DocumentsSubmitted": Event("HUM:DocumentsSubmitted", "HUM", {"GAP": -0.05, "UNC": -0.05, "INT": 0.05}, "Documents uploaded"),
    "HUM:OrientationCompleted": Event("HUM:OrientationCompleted", "HUM", {"DIR": 0.05, "UNC": -0.10, "INT": 0.10}, "Pre-departure orientation done"),
    "HUM:ArrivalKorea": Event("HUM:ArrivalKorea", "HUM", {"DIR": 0.15, "GAP": -0.10, "TEM": -0.10}, "Arrived in Korea"),
    "HUM:LanguageTestPassed": Event("HUM:LanguageTestPassed", "HUM", {"GAP": -0.10, "UNC": -0.10, "INT": 0.10}, "Korean language test passed"),
    "HUM:InternshipStarted": Event("HUM:InternshipStarted", "HUM", {"DIR": 0.10, "FOR": 0.10, "GAP": -0.10}, "Started internship"),
    "HUM:GraduationCompleted": Event("HUM:GraduationCompleted", "HUM", {"DIR": 0.20, "GAP": -0.20, "UNC": -0.15}, "University graduation"),
    "HUM:JobSearchStarted": Event("HUM:JobSearchStarted", "HUM", {"FOR": 0.10, "UNC": 0.10}, "Active job searching"),
    "HUM:SettlementAchieved": Event("HUM:SettlementAchieved", "HUM", {"DIR": 0.30, "GAP": -0.30, "UNC": -0.20, "INT": 0.20}, "Full settlement"),
    "HUM:ProgramDropped": Event("HUM:ProgramDropped", "HUM", {"DIR": -0.50, "GAP": 0.50, "UNC": 0.50}, "Left the program"),
    
    # EDU Events (5)
    "EDU:ApplicationReviewed": Event("EDU:ApplicationReviewed", "EDU", {"DIR": 0.05, "GAP": -0.03, "INT": 0.03}, "University reviewed application"),
    "EDU:AdmissionDecisionMade": Event("EDU:AdmissionDecisionMade", "EDU", {"DIR": 0.10, "FOR": 0.10, "GAP": -0.10, "UNC": -0.05}, "Admission decision made"),
    "EDU:EnrollmentConfirmed": Event("EDU:EnrollmentConfirmed", "EDU", {"DIR": 0.10, "GAP": -0.10, "UNC": -0.10}, "Enrollment confirmed"),
    "EDU:GradeUpdated": Event("EDU:GradeUpdated", "EDU", {"GAP": -0.05, "INT": 0.05}, "Semester grades updated"),
    "EDU:AcademicWarning": Event("EDU:AcademicWarning", "EDU", {"UNC": 0.15, "GAP": 0.10}, "Academic performance warning"),
    
    # EMP Events (5)
    "EMP:JobPosted": Event("EMP:JobPosted", "EMP", {"FOR": 0.05, "UNC": -0.05}, "New job opportunity posted"),
    "EMP:InterviewScheduled": Event("EMP:InterviewScheduled", "EMP", {"DIR": 0.05, "FOR": 0.05, "UNC": -0.05}, "Interview scheduled"),
    "EMP:InterviewPassed": Event("EMP:InterviewPassed", "EMP", {"DIR": 0.10, "FOR": 0.10, "GAP": -0.10}, "Passed interview"),
    "EMP:EmploymentStarted": Event("EMP:EmploymentStarted", "EMP", {"DIR": 0.25, "FOR": 0.20, "GAP": -0.20, "UNC": -0.15, "INT": 0.10}, "Started employment"),
    "EMP:ContractTerminated": Event("EMP:ContractTerminated", "EMP", {"DIR": -0.20, "GAP": 0.20, "UNC": 0.30}, "Employment ended"),
    
    # GOV Events (5)
    "GOV:VisaRuleUpdated": Event("GOV:VisaRuleUpdated", "GOV", {"FOR": 0.10, "UNC": 0.10}, "Visa rules changed"),
    "GOV:VisaApplied": Event("GOV:VisaApplied", "GOV", {"DIR": 0.05, "TEM": -0.05}, "Visa application submitted"),
    "GOV:VisaApproved": Event("GOV:VisaApproved", "GOV", {"DIR": 0.20, "GAP": -0.20, "UNC": -0.10}, "Visa approved"),
    "GOV:VisaRejected": Event("GOV:VisaRejected", "GOV", {"DIR": -0.30, "GAP": 0.30, "UNC": 0.40}, "Visa rejected"),
    "GOV:ResidencyGranted": Event("GOV:ResidencyGranted", "GOV", {"DIR": 0.30, "GAP": -0.25, "UNC": -0.20, "INT": 0.15}, "Permanent residency"),
    
    # CITY Events (3)
    "CITY:HousingImproved": Event("CITY:HousingImproved", "CITY", {"DIR": 0.20, "GAP": -0.10, "UNC": -0.05}, "Better housing secured"),
    "CITY:CommunityJoined": Event("CITY:CommunityJoined", "CITY", {"DIR": 0.10, "UNC": -0.10, "INT": 0.15}, "Joined local community"),
    "CITY:SafetyIncident": Event("CITY:SafetyIncident", "CITY", {"UNC": 0.20, "INT": -0.10}, "Safety concern occurred"),
    
    # OPS Events (2)
    "OPS:PipelineOptimized": Event("OPS:PipelineOptimized", "OPS", {"DIR": 0.30, "FOR": 0.30, "GAP": -0.20, "TEM": -0.20, "UNC": -0.20, "INT": 0.30}, "System optimization"),
    "OPS:IssueDetected": Event("OPS:IssueDetected", "OPS", {"UNC": 0.20, "INT": -0.10, "DIR": -0.05}, "Problem detected in pipeline"),
}


class EventEngine:
    def __init__(self, vector_engine: VectorEngine, country: str = "KR", industry: str = "education"):
        self.vector_engine = vector_engine
        self.country = country
        self.industry = industry
        self.entities: Dict[str, Entity] = {}
    
    def register_entity(self, entity: Entity):
        self.entities[entity.id] = entity
    
    def get_entity(self, entity_id: str) -> Optional[Entity]:
        return self.entities.get(entity_id)
    
    def process_event(self, entity_id: str, event_code: str) -> Dict:
        """Process event and update entity vector"""
        entity = self.entities.get(entity_id)
        if not entity:
            return {"error": f"Entity {entity_id} not found"}
        
        event = EVENT_DICTIONARY.get(event_code)
        if not event:
            return {"error": f"Event {event_code} not found"}
        
        # Calculate influenced delta
        influenced = self.vector_engine.apply_delta(
            event.source_type, entity.type, event.delta, self.country, self.industry
        )
        
        # Update entity vector
        old_vector = entity.vector.copy()
        entity.vector = self.vector_engine.update_vector(entity.vector, influenced)
        
        # Record history
        entity.history.append({
            "timestamp": datetime.now().isoformat(),
            "event": event_code,
            "delta": influenced,
            "vector_before": old_vector,
            "vector_after": entity.vector.copy()
        })
        
        return {
            "entity_id": entity_id,
            "event": event_code,
            "vector": entity.vector,
            "delta_applied": influenced
        }
    
    def get_state(self, entity_id: str) -> Dict:
        """Get entity state with progress calculation"""
        entity = self.entities.get(entity_id)
        if not entity:
            return {"error": "Not found"}
        
        v = entity.vector
        progress = max(0, min(100, int((1 - v.get("GAP", 0.8)) * 100)))
        risk = "LOW" if v.get("UNC", 0.5) < 0.3 else "MEDIUM" if v.get("UNC", 0.5) < 0.6 else "HIGH"
        
        return {
            "entity_id": entity_id,
            "vector": v,
            "progress": progress,
            "risk_level": risk,
            "events_count": len(entity.history)
        }
