"""
AUTUS View Scope System
Role-based data visibility and filtering

Each role sees only what they need:
- student: My data only
- teacher: My org's data
- facility: My location's data
- visa: My org's applications
- city: City-wide data
- seho: God Mode - Everything
"""

from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, Any


class Role(str, Enum):
    student = "student"
    teacher = "teacher"
    facility = "facility"
    visa = "visa"
    city = "city"
    seho = "seho"  # God mode


class ViewScope(BaseModel):
    """
    Defines what a user can see based on their role.
    """
    role: Role
    subject_id: Optional[str] = None  # User's Zero ID
    org_id: Optional[str] = None      # Organization/School ID
    location_id: Optional[str] = None # Building/Facility ID
    city_id: Optional[str] = None     # City ID
    
    def as_filters(self) -> Dict[str, Any]:
        """
        Convert scope to database/API filters.
        God mode (seho) returns empty filters = see everything.
        """
        if self.role == Role.seho:
            return {}  # 전체 접근 - No filters
        
        if self.role == Role.student:
            return {"subject_id": self.subject_id}
        
        if self.role == Role.teacher:
            return {"org_id": self.org_id}
        
        if self.role == Role.facility:
            return {"location_id": self.location_id}
        
        if self.role == Role.visa:
            return {"org_id": self.org_id}
        
        if self.role == Role.city:
            return {"city_id": self.city_id}
        
        return {}
    
    def is_god_mode(self) -> bool:
        """Check if this is god mode (seho)."""
        return self.role == Role.seho
    
    def can_access(self, resource_owner: str) -> bool:
        """Check if this scope can access a resource."""
        if self.is_god_mode():
            return True
        
        if self.role == Role.student:
            return resource_owner == self.subject_id
        
        # Other roles would check org/location/city
        return True  # Simplified for now
