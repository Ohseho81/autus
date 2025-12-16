"""
Growth prediction and coaching model for user development.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union
import logging
from abc import ABC, abstractmethod

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error

logger = logging.getLogger(__name__)


class GrowthMetric(Enum):
    """Enumeration of growth metrics."""
    PERFORMANCE_SCORE = "performance_score"
    SKILL_LEVEL = "skill_level"
    COMPLETION_RATE = "completion_rate"
    ENGAGEMENT_SCORE = "engagement_score"
    PRODUCTIVITY_INDEX = "productivity_index"


class GrowthStage(Enum):
    """Enumeration of growth stages."""
    BEGINNER = "beginner"
    DEVELOPING = "developing"
    PROFICIENT = "proficient"
    ADVANCED = "advanced"
    EXPERT = "expert"


@dataclass
class GrowthPrediction:
    """Data class for growth predictions."""
    user_id: str
    metric: GrowthMetric
    current_value: float
    predicted_value: float
    prediction_date: datetime
    confidence: float
    time_horizon: int  # days
    factors: Dict[str, float]


@dataclass
class CoachingRecommendation:
    """Data class for coaching recommendations."""
    recommendation_id: str
    user_id: str
    title: str
    description: str
    priority: int
    expected_impact: float
    estimated_effort: int  # hours
    skills_targeted: List[str]
    resources: List[str]
    deadline: Optional[datetime] = None


@dataclass
class UserGrowthProfile:
    """Data class for user growth profile."""
    user_id: str
    current_stage: GrowthStage
    metrics: Dict[GrowthMetric, float]
    strengths: List[str]
    improvement_areas: List[str]
    learning_velocity: float
    last_updated: datetime


class GrowthPredictor(ABC):
    """Abstract base class for growth predictors."""
    
    @abstractmethod
    def train(self, training_data: pd.DataFrame) -> None:
        """Train the growth prediction model."""
        pass
    
    @abstractmethod
    def predict(
        self,
        user_data: Dict,
        time_horizon: int = 30
    ) -> GrowthPrediction:
        """Make growth prediction for a user."""
        pass


class MLGrowthPredictor(GrowthPredictor):
    """Machine learning-based growth predictor."""
    
    def __init__(self, metric: GrowthMetric):
        """
        Initialize ML growth predictor.
        
        Args:
            metric: The growth metric to predict
        """
        self.metric = metric
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_columns: List[str] = []
        self.feature_importance: Dict[str, float] = {}
    
    def train(self, training_data: pd.DataFrame) -> None:
        """
        Train the growth prediction model.
        
        Args:
            training_data: DataFrame with user data and target values
            
        Raises:
            ValueError: If training data is invalid
        """
        try:
            if training_data.empty:
                raise ValueError("Training data cannot be empty")
            
            # Prepare features and target
            target_col = f"target_{self.metric.value}"
            if target_col not in training_data.columns:
                raise ValueError(f"Target column {target_col} not found in training data")
            
            # Select feature columns (exclude target and metadata columns)
            exclude_cols = [target_col, 'user_id', 'timestamp']
            self.feature_columns = [
                col for col in training_data.columns 
                if col not in exclude_cols
            ]
            
            X = training_data[self.feature_columns]
            y = training_data[target_col]
            
            # Handle missing values
            X = X.fillna(X.median())
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model.fit(X_train_scaled, y_train)
            
            # Calculate feature importance
            self.feature_importance = dict(zip(
                self.feature_columns,
                self.model.feature_importances_
            ))
            
            # Evaluate model
            y_pred = self.model.predict(X_test_scaled)
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            
            logger.info(
                f"Model trained for {self.metric.value}. MAE: {mae:.3f}, MSE: {mse:.3f}"
            )
            
            self.is_trained = True
            
        except Exception as e:
            logger.error(f"Error training growth predictor: {e}")
            raise
    
    def predict(
        self,
        user_data: Dict,
        time_horizon: int = 30
    ) -> GrowthPrediction:
        """
        Make growth prediction for a user.
        
        Args:
            user_data: Dictionary containing user features
            time_horizon: Number of days to predict ahead
            
        Returns:
            GrowthPrediction object
            
        Raises:
            ValueError: If model is not trained or user data is invalid
        """
        try:
            if not self.is_trained:
                raise ValueError("Model must be trained before making predictions")
            
            # Prepare features
            features = []
            for col in self.feature_columns:
                if col in user_data:
                    features.append(user_data[col])
                else:
                    # Use default value (could be improved with proper imputation)
                    features.append(0.0)
                    logger.warning(f"Feature {col} not found in user data, using 0.0")
            
            # Scale features
            features_array = np.array(features).reshape(1, -1)
            features_scaled = self.scaler.transform(features_array)
            
            # Make prediction
            predicted_value = self.model.predict(features_scaled)[0]
            
            # Calculate confidence (simplified - could use prediction intervals)
            confidence = min(0.95, max(0.5, 1.0 - np.std(features_scaled) * 0.1))
            
            # Get top contributing factors
            top_factors = dict(sorted(
                self.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5])
            
            return GrowthPrediction(
                user_id=user_data.get('user_id', ''),
                metric=self.metric,
                current_value=user_data.get(f'current_{self.metric.value}', 0.0),
                predicted_value=predicted_value,
                prediction_date=datetime.now(),
                confidence=confidence,
                time_horizon=time_horizon,
                factors=top_factors
            )
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            raise


class GrowthCoach:
    """Growth coaching engine for generating personalized recommendations."""
    
    def __init__(self):
        """Initialize growth coach."""
        self.recommendation_templates = self._load_recommendation_templates()
    
    def _load_recommendation_templates(self) -> Dict[str, Dict]:
        """Load recommendation templates."""
        return {
            "skill_improvement": {
                "title": "Improve {skill} Skills",
                "description": "Focus on developing {skill} through targeted practice",
                "estimated_effort": 10,
                "resources": ["online_courses", "practice_exercises"]
            },
            "engagement_boost": {
                "title": "Increase Engagement",
                "description": "Participate more actively in learning activities",
                "estimated_effort": 5,
                "resources": ["community_forums", "peer_discussions"]
            },
            "performance_enhancement": {
                "title": "Enhance Performance",
                "description": "Optimize your approach to improve overall performance",
                "estimated_effort": 15,
                "resources": ["mentoring", "best_practices_guide"]
            }
        }
    
    def generate_recommendations(
        self,
        user_profile: UserGrowthProfile,
        predictions: List[GrowthPrediction]
    ) -> List[CoachingRecommendation]:
        """
        Generate personalized coaching recommendations.
        
        Args:
            user_profile: User's growth profile
            predictions: List of growth predictions
            
        Returns:
            List of coaching recommendations
        """
        try:
            recommendations = []
            
            # Analyze improvement areas
            for area in user_profile.improvement_areas[:3]:  # Top 3 areas
                rec = self._create_skill_recommendation(
                    user_profile, area
                )
                recommendations.append(rec)
            
            # Analyze predictions for declining metrics
            declining_metrics = [
                p for p in predictions
                if p.predicted_value < p.current_value
            ]
            
            for prediction in declining_metrics:
                rec = self._create_performance_recommendation(
                    user_profile, prediction
                )
                recommendations.append(rec)
            
            # Sort by priority and expected impact
            recommendations.sort(
                key=lambda x: (x.priority, -x.expected_impact)
            )
            
            return recommendations[:5]  # Return top 5 recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []
    
    def _create_skill_recommendation(
        self,
        user_profile: UserGrowthProfile,
        skill: str
    ) -> CoachingRecommendation:
        """Create a skill improvement recommendation."""
        template = self.recommendation_templates["skill_improvement"]
        
        return CoachingRecommendation(
            recommendation_id=f"skill_{user_profile.user_id}_{skill}",
            user_id=user_profile.user_id,
            title=template["title"].format(skill=skill),
            description=template["description"].format(skill=skill),
            priority=2,
            expected_impact=0.15,  # 15% improvement expected
            estimated_effort=template["estimated_effort"],
            skills_targeted=[skill],
            resources=template["resources"],
            deadline=datetime.now() + timedelta(days=30)
        )
    
    def _create_performance_recommendation(
        self,
        user_profile: UserGrowthProfile,
        prediction: GrowthPrediction
    ) -> CoachingRecommendation:
        """Create a performance improvement recommendation."""
        template = self.recommendation_templates["performance_enhancement"]
        
        return CoachingRecommendation(
            recommendation_id=f"perf_{user_profile.user_id}_{prediction.metric.value}",
            user_id=user_profile.user_id,
            title=template["title"],
            description=f"Address declining {prediction.metric.value} trend",
            priority=1,  # High priority for declining performance
            expected_impact=0.25,  # 25% improvement expected
            estimated_effort=template["estimated_effort"],
            skills_targeted=list(prediction.factors.keys())[:3],
            resources=template["resources"],
            deadline=datetime.now() + timedelta(days=21)
        )


class GrowthModel:
    """Main growth model orchestrating predictions and coaching."""
    
    def __init__(self):
        """Initialize growth model."""
        self.predictors: Dict[GrowthMetric, MLGrowthPredictor] = {}
        self.coach = GrowthCoach()
        
        # Initialize predictors for each metric
        for metric in GrowthMetric:
            self.predictors[metric] = MLGrowthPredictor(metric)
    
    def train_models(self, training_data: Dict[GrowthMetric, pd.DataFrame]) -> None:
        """
        Train all prediction models.
        
        Args:
            training_data: Dictionary mapping metrics to training datasets
        """
        try:
            for metric, predictor in self.predictors.items():
                if metric in training_data:
                    logger.info(f"Training model for {metric.value}")
                    predictor.train(training_data[metric])
                else:
                    logger.warning(f"No training data provided for {metric.value}")
                    
        except Exception as e:
            logger.error(f"Error training models: {e}")
            raise
    
    def predict_user_growth(
        self,
        user_profile: UserGrowthProfile,
        time_horizon: int = 30
    ) -> List[GrowthPrediction]:
        """
        Predict growth for a user across all metrics.
        
        Args:
            user_profile: User's growth profile
            time_horizon: Number of days to predict ahead
            
        Returns:
            List of growth predictions
        """
        try:
            predictions = []
            
            # Prepare user data for prediction
            user_data = {
                'user_id': user_profile.user_id,
                'current_stage': user_profile.current_stage.value,
                'learning_velocity': user_profile.learning_velocity,
                **{f'current_{metric.value}': value 
                   for metric, value in user_profile.metrics.items()}
            }
            
            # Generate predictions for each metric
            for metric, predictor in self.predictors.items():
                if predictor.is_trained:
                    prediction = predictor.predict(user_data, time_horizon)
                    predictions.append(prediction)
                else:
                    logger.warning(f"Predictor for {metric.value} is not trained")
            
            return predictions
            
        except Exception as e:
            logger.error(f"Error predicting user growth: {e}")
            return []
    
    def generate_growth_plan(
        self,
        user_profile: UserGrowthProfile,
        time_horizon: int = 30
    ) -> Tuple[List[GrowthPrediction], List[CoachingRecommendation]]:
        """
        Generate comprehensive growth plan for a user.
        
        Args:
            user_profile: User's growth profile
            time_horizon: Number of days to predict ahead
            
        Returns:
            Tuple of (predictions, recommendations)
        """
        try:
            # Generate predictions
            predictions = self.predict_user_growth(user_profile, time_horizon)
            
            # Generate coaching recommendations
            recommendations = self.coach.generate_recommendations(
                user_profile, predictions
            )
            
            logger.info(
                f"Generated growth plan for user {user_profile.user_id}: "
                f"{len(predictions)} predictions, {len(recommendations)} recommendations"
            )
            
            return predictions, recommendations
            
        except Exception as e:
            logger.error(f"Error generating growth plan: {e}")
            return [], []
    
    def update_user_profile(
        self,
        user_id: str,
        new_metrics: Dict[GrowthMetric, float],
        strengths: Optional[List[str]] = None,
        improvement_areas: Optional[List[str]] = None
    ) -> UserGrowthProfile:
        """
        Update user growth profile with new data.
        
        Args:
            user_id: User identifier
            new_metrics: Updated metric values
            strengths: Updated strengths list
            improvement_areas: Updated improvement areas list
            
        Returns:
            Updated UserGrowthProfile
        """
        try:
            # Determine current stage based on metrics
            avg_score = np.mean(list(new_metrics.values()))
            current_stage = self._determine_growth_stage(avg_score)
            
            # Calculate learning velocity (simplified)
            learning_velocity = min(1.0, avg_score / 100.0)
            
            updated_profile = UserGrowthProfile(
                user_id=user_id,
                current_stage=current_stage,
                metrics=new_metrics,
                strengths=strengths or [],
                improvement_areas=improvement_areas or [],
                learning_velocity=learning_velocity,
                last_updated=datetime.now()
            )
            
            return updated_profile
            
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            raise
    
    def _determine_growth_stage(self, avg_score: float) -> GrowthStage:
        """Determine growth stage based on average score."""
        if avg_score < 20:
            return GrowthStage.BEGINNER
        elif avg_score < 40:
            return GrowthStage.DEVELOPING
        elif avg_score < 60:
            return GrowthStage.PROFICIENT
        elif avg_score < 80:
            return GrowthStage.ADVANCED
        else:
            return GrowthStage.EXPERT
