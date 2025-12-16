"""
Coaching service for providing personalized growth recommendations and guidance.
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class CoachingType(Enum):
    """Types of coaching recommendations."""
    SKILL_DEVELOPMENT = "skill_development"
    PERFORMANCE_IMPROVEMENT = "performance_improvement"
    CAREER_PROGRESSION = "career_progression"
    GOAL_SETTING = "goal_setting"
    HABIT_FORMATION = "habit_formation"


class Priority(Enum):
    """Priority levels for coaching recommendations."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class CoachingRecommendation:
    """Represents a single coaching recommendation."""
    id: str
    user_id: str
    coaching_type: CoachingType
    title: str
    description: str
    action_items: List[str]
    priority: Priority
    estimated_impact: float
    estimated_effort_hours: int
    deadline: Optional[datetime]
    prerequisites: List[str]
    resources: List[Dict[str, str]]
    created_at: datetime
    updated_at: datetime
    is_active: bool = True


@dataclass
class UserProfile:
    """User profile data for coaching analysis."""
    user_id: str
    current_skills: Dict[str, float]
    goals: List[Dict[str, Any]]
    performance_metrics: Dict[str, float]
    learning_preferences: Dict[str, Any]
    availability_hours_per_week: int
    experience_level: str
    industry: str
    role: str


@dataclass
class CoachingSession:
    """Represents a coaching session with the user."""
    session_id: str
    user_id: str
    session_type: str
    duration_minutes: int
    recommendations_discussed: List[str]
    user_feedback: Dict[str, Any]
    action_items: List[str]
    next_session_date: Optional[datetime]
    created_at: datetime


class CoachingStrategy(ABC):
    """Abstract base class for coaching strategies."""
    
    @abstractmethod
    def generate_recommendations(
        self, 
        profile: UserProfile,
        context: Dict[str, Any]
    ) -> List[CoachingRecommendation]:
        """Generate coaching recommendations based on user profile and context."""
        pass
    
    @abstractmethod
    def get_strategy_name(self) -> str:
        """Get the name of the coaching strategy."""
        pass


class SkillGapCoachingStrategy(CoachingStrategy):
    """Coaching strategy focused on identifying and addressing skill gaps."""
    
    def generate_recommendations(
        self, 
        profile: UserProfile,
        context: Dict[str, Any]
    ) -> List[CoachingRecommendation]:
        """Generate skill gap coaching recommendations."""
        try:
            recommendations = []
            skill_gaps = self._identify_skill_gaps(profile, context)
            
            for skill, gap_score in skill_gaps.items():
                if gap_score > 0.3:  # Significant gap threshold
                    rec = self._create_skill_recommendation(profile, skill, gap_score)
                    recommendations.append(rec)
            
            return recommendations
        except Exception as e:
            logger.error(f"Error generating skill gap recommendations: {e}")
            return []
    
    def get_strategy_name(self) -> str:
        return "skill_gap_coaching"
    
    def _identify_skill_gaps(
        self, 
        profile: UserProfile, 
        context: Dict[str, Any]
    ) -> Dict[str, float]:
        """Identify skill gaps based on profile and market requirements."""
        try:
            market_skills = context.get("market_requirements", {})
            skill_gaps = {}
            
            for skill, required_level in market_skills.items():
                current_level = profile.current_skills.get(skill, 0.0)
                gap = max(0.0, required_level - current_level)
                skill_gaps[skill] = gap
            
            return skill_gaps
        except Exception as e:
            logger.error(f"Error identifying skill gaps: {e}")
            return {}
    
    def _create_skill_recommendation(
        self, 
        profile: UserProfile, 
        skill: str, 
        gap_score: float
    ) -> CoachingRecommendation:
        """Create a skill development recommendation."""
        priority = Priority.HIGH if gap_score > 0.7 else Priority.MEDIUM
        
        return CoachingRecommendation(
            id=f"skill_{skill}_{profile.user_id}_{datetime.now().timestamp()}",
            user_id=profile.user_id,
            coaching_type=CoachingType.SKILL_DEVELOPMENT,
            title=f"Develop {skill.title()} Skills",
            description=f"Improve your {skill} skills to meet market demands",
            action_items=[
                f"Complete online course in {skill}",
                f"Practice {skill} for 2 hours per week",
                f"Find mentor with strong {skill} background"
            ],
            priority=priority,
            estimated_impact=gap_score,
            estimated_effort_hours=int(gap_score * 20),
            deadline=datetime.now() + timedelta(days=90),
            prerequisites=[],
            resources=[
                {"type": "course", "title": f"{skill} Fundamentals", "url": ""},
                {"type": "book", "title": f"Mastering {skill}", "url": ""}
            ],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class GoalAlignmentCoachingStrategy(CoachingStrategy):
    """Coaching strategy focused on goal alignment and achievement."""
    
    def generate_recommendations(
        self, 
        profile: UserProfile,
        context: Dict[str, Any]
    ) -> List[CoachingRecommendation]:
        """Generate goal alignment coaching recommendations."""
        try:
            recommendations = []
            
            for goal in profile.goals:
                if self._needs_coaching(goal, context):
                    rec = self._create_goal_recommendation(profile, goal, context)
                    recommendations.append(rec)
            
            return recommendations
        except Exception as e:
            logger.error(f"Error generating goal alignment recommendations: {e}")
            return []
    
    def get_strategy_name(self) -> str:
        return "goal_alignment_coaching"
    
    def _needs_coaching(self, goal: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Determine if a goal needs coaching intervention."""
        progress = goal.get("progress", 0.0)
        target_date = goal.get("target_date")
        
        if target_date and isinstance(target_date, datetime):
            days_remaining = (target_date - datetime.now()).days
            expected_progress = max(0.0, 1.0 - (days_remaining / goal.get("total_days", 365)))
            return progress < expected_progress * 0.8
        
        return progress < 0.5
    
    def _create_goal_recommendation(
        self, 
        profile: UserProfile, 
        goal: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> CoachingRecommendation:
        """Create a goal-focused coaching recommendation."""
        return CoachingRecommendation(
            id=f"goal_{goal.get('id', 'unknown')}_{profile.user_id}_{datetime.now().timestamp()}",
            user_id=profile.user_id,
            coaching_type=CoachingType.GOAL_SETTING,
            title=f"Accelerate Progress on {goal.get('title', 'Goal')}",
            description=f"Get back on track with your goal: {goal.get('description', '')}",
            action_items=[
                "Break down goal into smaller milestones",
                "Identify and address current blockers",
                "Adjust timeline if necessary"
            ],
            priority=Priority.HIGH,
            estimated_impact=0.8,
            estimated_effort_hours=10,
            deadline=datetime.now() + timedelta(days=30),
            prerequisites=[],
            resources=[
                {"type": "guide", "title": "Goal Achievement Framework", "url": ""},
                {"type": "template", "title": "Milestone Planning Template", "url": ""}
            ],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )


class CoachingService:
    """Service for providing personalized coaching recommendations and sessions."""
    
    def __init__(self):
        self.strategies: List[CoachingStrategy] = [
            SkillGapCoachingStrategy(),
            GoalAlignmentCoachingStrategy()
        ]
        self.active_recommendations: Dict[str, List[CoachingRecommendation]] = {}
        self.coaching_sessions: Dict[str, List[CoachingSession]] = {}
    
    def generate_coaching_recommendations(
        self, 
        user_profile: UserProfile,
        context: Optional[Dict[str, Any]] = None
    ) -> List[CoachingRecommendation]:
        """Generate personalized coaching recommendations for a user."""
        try:
            if context is None:
                context = {}
            
            all_recommendations = []
            
            for strategy in self.strategies:
                recommendations = strategy.generate_recommendations(user_profile, context)
                all_recommendations.extend(recommendations)
            
            # Rank and filter recommendations
            ranked_recommendations = self._rank_recommendations(
                all_recommendations, 
                user_profile
            )
            
            # Store active recommendations
            self.active_recommendations[user_profile.user_id] = ranked_recommendations
            
            return ranked_recommendations
        
        except Exception as e:
            logger.error(f"Error generating coaching recommendations: {e}")
            return []
    
    def get_user_recommendations(
        self, 
        user_id: str,
        limit: Optional[int] = None
    ) -> List[CoachingRecommendation]:
        """Get active recommendations for a user."""
        try:
            recommendations = self.active_recommendations.get(user_id, [])
            active_recs = [rec for rec in recommendations if rec.is_active]
            
            if limit:
                return active_recs[:limit]
            
            return active_recs
        
        except Exception as e:
            logger.error(f"Error retrieving user recommendations: {e}")
            return []
    
    def update_recommendation_status(
        self, 
        recommendation_id: str,
        is_active: bool
    ) -> bool:
        """Update the status of a coaching recommendation."""
        try:
            for user_recs in self.active_recommendations.values():
                for rec in user_recs:
                    if rec.id == recommendation_id:
                        rec.is_active = is_active
                        rec.updated_at = datetime.now()
                        return True
            
            return False
        
        except Exception as e:
            logger.error(f"Error updating recommendation status: {e}")
            return False
    
    def create_coaching_session(
        self,
        user_id: str,
        session_type: str,
        duration_minutes: int,
        recommendations_discussed: List[str],
        user_feedback: Dict[str, Any],
        action_items: List[str],
        next_session_date: Optional[datetime] = None
    ) -> CoachingSession:
        """Create a new coaching session record."""
        try:
            session = CoachingSession(
                session_id=f"session_{user_id}_{datetime.now().timestamp()}",
                user_id=user_id,
                session_type=session_type,
                duration_minutes=duration_minutes,
                recommendations_discussed=recommendations_discussed,
                user_feedback=user_feedback,
                action_items=action_items,
                next_session_date=next_session_date,
                created_at=datetime.now()
            )
            
            if user_id not in self.coaching_sessions:
                self.coaching_sessions[user_id] = []
            
            self.coaching_sessions[user_id].append(session)
            
            return session
        
        except Exception as e:
            logger.error(f"Error creating coaching session: {e}")
            raise
    
    def get_user_sessions(
        self, 
        user_id: str,
        limit: Optional[int] = None
    ) -> List[CoachingSession]:
        """Get coaching sessions for a user."""
        try:
            sessions = self.coaching_sessions.get(user_id, [])
            sessions.sort(key=lambda x: x.created_at, reverse=True)
            
            if limit:
                return sessions[:limit]
            
            return sessions
        
        except Exception as e:
            logger.error(f"Error retrieving user sessions: {e}")
            return []
    
    def get_coaching_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get coaching analytics for a user."""
        try:
            recommendations = self.active_recommendations.get(user_id, [])
            sessions = self.coaching_sessions.get(user_id, [])
            
            active_count = len([r for r in recommendations if r.is_active])
            completed_count = len([r for r in recommendations if not r.is_active])
            
            return {
                "total_recommendations": len(recommendations),
                "active_recommendations": active_count,
                "completed_recommendations": completed_count,
                "total_sessions": len(sessions),
                "total_coaching_hours": sum(s.duration_minutes for s in sessions) / 60,
                "average_session_duration": (
                    sum(s.duration_minutes for s in sessions) / len(sessions)
                    if sessions else 0
                ),
                "recommendation_types": self._get_recommendation_type_breakdown(recommendations)
            }
        
        except Exception as e:
            logger.error(f"Error generating coaching analytics: {e}")
            return {}
    
    def _rank_recommendations(
        self, 
        recommendations: List[CoachingRecommendation],
        user_profile: UserProfile
    ) -> List[CoachingRecommendation]:
        """Rank recommendations based on priority, impact, and user preferences."""
        try:
            def score_recommendation(rec: CoachingRecommendation) -> float:
                priority_scores = {
                    Priority.CRITICAL: 4.0,
                    Priority.HIGH: 3.0,
                    Priority.MEDIUM: 2.0,
                    Priority.LOW: 1.0
                }
                
                priority_score = priority_scores.get(rec.priority, 1.0)
                impact_score = rec.estimated_impact
                urgency_score = 1.0
                
                if rec.deadline:
                    days_until_deadline = (rec.deadline - datetime.now()).days
                    urgency_score = max(0.1, 1.0 / max(1, days_until_deadline / 30))
                
                return priority_score * impact_score * urgency_score
            
            recommendations.sort(key=score_recommendation, reverse=True)
            return recommendations[:10]  # Limit to top 10
        
        except Exception as e:
            logger.error(f"Error ranking recommendations: {e}")
            return recommendations
    
    def _get_recommendation_type_breakdown(
        self, 
        recommendations: List[CoachingRecommendation]
    ) -> Dict[str, int]:
        """Get breakdown of recommendation types."""
        breakdown = {}
        for rec in recommendations:
            rec_type = rec.coaching_type.value
            breakdown[rec_type] = breakdown.get(rec_type, 0) + 1
        return breakdown
