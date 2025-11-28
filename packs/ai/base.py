"""
Learning Engine Base Classes
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum

class PatternType(Enum):
    CODE_STYLE = "code_style"
    NAMING = "naming"
    STRUCTURE = "structure"
    COMMENT = "comment"
    LANGUAGE = "language"
    WORKFLOW = "workflow"

class ContentType(Enum):
    CODE = "code"
    TEXT = "text"
    QUERY = "query"
    RESPONSE = "response"

@dataclass
class UserPattern:
    pattern_type: PatternType
    pattern_data: Dict[str, Any]
    confidence: float
    frequency: int
    last_seen: datetime
    examples: List[str] = field(default_factory=list)
    
    def __repr__(self):
        return f"Pattern({self.pattern_type.value}, confidence={self.confidence:.2f}, freq={self.frequency})"

@dataclass
class StyleProfile:
    user_id: str
    patterns: Dict[str, UserPattern]
    preferences: Dict[str, Any]
    statistics: Dict[str, float]
    created_at: datetime
    updated_at: datetime
    
    def get_pattern(self, pattern_type: PatternType) -> Optional[UserPattern]:
        return self.patterns.get(pattern_type.value)
    
    def add_pattern(self, pattern: UserPattern):
        key = pattern.pattern_type.value
        
        if key in self.patterns:
            existing = self.patterns[key]
            existing.frequency += 1
            existing.confidence = existing.confidence * 0.7 + pattern.confidence * 0.3
            existing.last_seen = datetime.now()
            if pattern.examples:
                existing.examples.extend(pattern.examples[:3])
        else:
            self.patterns[key] = pattern
        
        self.updated_at = datetime.now()

@dataclass
class LearningContext:
    content: str
    content_type: ContentType
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class PersonalizationResult:
    original_prompt: str
    personalized_prompt: str
    applied_patterns: List[str]
    confidence: float
    reasoning: str
    
    def __repr__(self):
        return f"Personalized(confidence={self.confidence:.2f}, patterns={len(self.applied_patterns)})"
