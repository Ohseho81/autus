"""
Prediction service for growth coaching engine.

This module provides prediction capabilities for user growth patterns,
performance forecasting, and coaching recommendations.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score

logger = logging.getLogger(__name__)


class PredictionType(Enum):
    """Types of predictions available."""
    PERFORMANCE = "performance"
    GROWTH = "growth"
    ENGAGEMENT = "engagement"
    RETENTION = "retention"


class TimeHorizon(Enum):
    """Prediction time horizons."""
    SHORT_TERM = "1_week"
    MEDIUM_TERM = "1_month"
    LONG_TERM = "3_months"


@dataclass
class PredictionResult:
    """Result of a prediction operation."""
    user_id: str
    prediction_type: PredictionType
    predicted_value: float
    confidence_score: float
    time_horizon: TimeHorizon
    features_used: List[str]
    prediction_date: datetime
    target_date: datetime
    metadata: Dict[str, Any]


@dataclass
class GrowthInsight:
    """Growth insight generated from predictions."""
    insight_id: str
    user_id: str
    title: str
    description: str
    impact_score: float
    action_items: List[str]
    confidence: float
    category: str
    created_at: datetime


class PredictionService:
    """Service for generating predictions and growth insights."""

    def __init__(self, data_repository, feature_extractor, model_registry):
        """
        Initialize the prediction service.

        Args:
            data_repository: Repository for accessing user data
            feature_extractor: Service for extracting features
            model_registry: Registry for ML models
        """
        self.data_repository = data_repository
        self.feature_extractor = feature_extractor
        self.model_registry = model_registry
        self.scaler = StandardScaler()
        self._models = {}

    async def predict_user_performance(
        self,
        user_id: str,
        time_horizon: TimeHorizon,
        metrics: Optional[List[str]] = None
    ) -> List[PredictionResult]:
        """
        Predict user performance metrics.

        Args:
            user_id: User identifier
            time_horizon: Prediction time horizon
            metrics: Specific metrics to predict

        Returns:
            List of prediction results

        Raises:
            ValueError: If user_id is invalid
            RuntimeError: If prediction fails
        """
        try:
            if not user_id:
                raise ValueError("User ID cannot be empty")

            logger.info(f"Predicting performance for user {user_id}")

            # Get historical data
            historical_data = await self.data_repository.get_user_metrics(
                user_id=user_id,
                start_date=datetime.now() - timedelta(days=90),
                end_date=datetime.now()
            )

            if not historical_data:
                raise ValueError(f"No historical data found for user {user_id}")

            # Extract features
            features = await self.feature_extractor.extract_performance_features(
                user_id=user_id,
                historical_data=historical_data
            )

            predictions = []
            default_metrics = ['productivity_score', 'engagement_level', 'completion_rate']
            target_metrics = metrics or default_metrics

            for metric in target_metrics:
                prediction = await self._generate_metric_prediction(
                    user_id=user_id,
                    metric=metric,
                    features=features,
                    time_horizon=time_horizon
                )
                predictions.append(prediction)

            return predictions

        except Exception as e:
            logger.error(f"Failed to predict performance for user {user_id}: {str(e)}")
            raise RuntimeError(f"Performance prediction failed: {str(e)}")

    async def predict_growth_trajectory(
        self,
        user_id: str,
        skill_areas: Optional[List[str]] = None
    ) -> Dict[str, PredictionResult]:
        """
        Predict user growth trajectory across different skill areas.

        Args:
            user_id: User identifier
            skill_areas: Specific skill areas to analyze

        Returns:
            Dictionary mapping skill areas to predictions

        Raises:
            ValueError: If user_id is invalid
            RuntimeError: If prediction fails
        """
        try:
            if not user_id:
                raise ValueError("User ID cannot be empty")

            logger.info(f"Predicting growth trajectory for user {user_id}")

            # Get user profile and learning history
            user_profile = await self.data_repository.get_user_profile(user_id)
            learning_history = await self.data_repository.get_learning_history(user_id)

            if not user_profile:
                raise ValueError(f"User profile not found for {user_id}")

            # Determine skill areas to analyze
            target_skills = skill_areas or user_profile.get('focus_areas', [])
            if not target_skills:
                target_skills = await self._identify_key_skill_areas(user_id)

            predictions = {}
            for skill in target_skills:
                growth_features = await self.feature_extractor.extract_growth_features(
                    user_id=user_id,
                    skill_area=skill,
                    learning_history=learning_history
                )

                prediction = await self._generate_growth_prediction(
                    user_id=user_id,
                    skill_area=skill,
                    features=growth_features
                )
                predictions[skill] = prediction

            return predictions

        except Exception as e:
            logger.error(f"Failed to predict growth trajectory for user {user_id}: {str(e)}")
            raise RuntimeError(f"Growth trajectory prediction failed: {str(e)}")

    async def generate_growth_insights(
        self,
        user_id: str,
        predictions: List[PredictionResult]
    ) -> List[GrowthInsight]:
        """
        Generate actionable growth insights from predictions.

        Args:
            user_id: User identifier
            predictions: List of prediction results

        Returns:
            List of growth insights

        Raises:
            ValueError: If inputs are invalid
            RuntimeError: If insight generation fails
        """
        try:
            if not user_id or not predictions:
                raise ValueError("User ID and predictions are required")

            logger.info(f"Generating growth insights for user {user_id}")

            insights = []
            
            # Analyze performance trends
            performance_insights = await self._analyze_performance_trends(
                user_id, predictions
            )
            insights.extend(performance_insights)

            # Identify growth opportunities
            opportunity_insights = await self._identify_growth_opportunities(
                user_id, predictions
            )
            insights.extend(opportunity_insights)

            # Generate personalized recommendations
            recommendation_insights = await self._generate_recommendations(
                user_id, predictions
            )
            insights.extend(recommendation_insights)

            # Rank insights by impact
            insights.sort(key=lambda x: x.impact_score, reverse=True)

            return insights[:10]  # Return top 10 insights

        except Exception as e:
            logger.error(f"Failed to generate insights for user {user_id}: {str(e)}")
            raise RuntimeError(f"Insight generation failed: {str(e)}")

    async def predict_engagement_risk(
        self,
        user_id: str
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Predict user engagement risk and factors.

        Args:
            user_id: User identifier

        Returns:
            Tuple of (risk_score, risk_factors)

        Raises:
            ValueError: If user_id is invalid
            RuntimeError: If prediction fails
        """
        try:
            if not user_id:
                raise ValueError("User ID cannot be empty")

            logger.info(f"Predicting engagement risk for user {user_id}")

            # Get engagement history
            engagement_data = await self.data_repository.get_engagement_metrics(
                user_id=user_id,
                days=30
            )

            if not engagement_data:
                return 0.5, {"reason": "Insufficient data"}

            # Extract engagement features
            features = await self.feature_extractor.extract_engagement_features(
                user_id=user_id,
                engagement_data=engagement_data
            )

            # Load engagement risk model
            model = await self._get_model("engagement_risk")
            
            # Make prediction
            feature_array = np.array(list(features.values())).reshape(1, -1)
            feature_array_scaled = self.scaler.transform(feature_array)
            
            risk_score = model.predict_proba(feature_array_scaled)[0][1]  # Probability of disengagement
            
            # Identify key risk factors
            risk_factors = await self._analyze_risk_factors(features, model)

            return float(risk_score), risk_factors

        except Exception as e:
            logger.error(f"Failed to predict engagement risk for user {user_id}: {str(e)}")
            raise RuntimeError(f"Engagement risk prediction failed: {str(e)}")

    async def _generate_metric_prediction(
        self,
        user_id: str,
        metric: str,
        features: Dict[str, float],
        time_horizon: TimeHorizon
    ) -> PredictionResult:
        """Generate prediction for a specific metric."""
        try:
            model = await self._get_model(f"{metric}_prediction")
            
            # Prepare features
            feature_array = np.array(list(features.values())).reshape(1, -1)
            feature_array_scaled = self.scaler.transform(feature_array)
            
            # Make prediction
            predicted_value = model.predict(feature_array_scaled)[0]
            
            # Calculate confidence score
            confidence = await self._calculate_confidence(
                model, feature_array_scaled, metric
            )
            
            # Determine target date
            horizon_days = {
                TimeHorizon.SHORT_TERM: 7,
                TimeHorizon.MEDIUM_TERM: 30,
                TimeHorizon.LONG_TERM: 90
            }
            
            target_date = datetime.now() + timedelta(days=horizon_days[time_horizon])
            
            return PredictionResult(
                user_id=user_id,
                prediction_type=PredictionType.PERFORMANCE,
                predicted_value=float(predicted_value),
                confidence_score=confidence,
                time_horizon=time_horizon,
                features_used=list(features.keys()),
                prediction_date=datetime.now(),
                target_date=target_date,
                metadata={'metric': metric}
            )
            
        except Exception as e:
            logger.error(f"Failed to generate {metric} prediction: {str(e)}")
            raise

    async def _generate_growth_prediction(
        self,
        user_id: str,
        skill_area: str,
        features: Dict[str, float]
    ) -> PredictionResult:
        """Generate growth prediction for a skill area."""
        try:
            model = await self._get_model("skill_growth")
            
            # Add skill-specific features
            skill_features = {**features, 'skill_complexity': await self._get_skill_complexity(skill_area)}
            
            feature_array = np.array(list(skill_features.values())).reshape(1, -1)
            feature_array_scaled = self.scaler.transform(feature_array)
            
            predicted_growth = model.predict(feature_array_scaled)[0]
            confidence = await self._calculate_confidence(model, feature_array_scaled, skill_area)
            
            return PredictionResult(
                user_id=user_id,
                prediction_type=PredictionType.GROWTH,
                predicted_value=float(predicted_growth),
                confidence_score=confidence,
                time_horizon=TimeHorizon.MEDIUM_TERM,
                features_used=list(skill_features.keys()),
                prediction_date=datetime.now(),
                target_date=datetime.now() + timedelta(days=30),
                metadata={'skill_area': skill_area}
            )
            
        except Exception as e:
            logger.error(f"Failed to generate growth prediction for {skill_area}: {str(e)}")
            raise

    async def _analyze_performance_trends(
        self,
        user_id: str,
        predictions: List[PredictionResult]
    ) -> List[GrowthInsight]:
        """Analyze performance trends from predictions."""
        insights = []
        
        try:
            performance_predictions = [
                p for p in predictions 
                if p.prediction_type == PredictionType.PERFORMANCE
            ]
            
            if not performance_predictions:
                return insights
            
            # Identify declining metrics
            for prediction in performance_predictions:
                if prediction.predicted_value < 0.7 and prediction.confidence_score > 0.8:
                    insight = GrowthInsight(
                        insight_id=f"perf_decline_{prediction.metadata.get('metric')}",
                        user_id=user_id,
                        title=f"Performance Decline Risk in {prediction.metadata.get('metric', 'Unknown')}",
                        description=f"Your {prediction.metadata.get('metric', 'performance')} is predicted to decline. Consider adjusting your approach.",
                        impact_score=0.8,
                        action_items=[
                            "Review recent activities",
                            "Identify potential blockers",
                            "Adjust learning strategy"
                        ],
                        confidence=prediction.confidence_score,
                        category="performance",
                        created_at=datetime.now()
                    )
                    insights.append(insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to analyze performance trends: {str(e)}")
            return []

    async def _identify_growth_opportunities(
        self,
        user_id: str,
        predictions: List[PredictionResult]
    ) -> List[GrowthInsight]:
        """Identify growth opportunities from predictions."""
        insights = []
        
        try:
            growth_predictions = [
                p for p in predictions 
                if p.prediction_type == PredictionType.GROWTH
            ]
            
            # Find high-potential areas
            high_potential = [
                p for p in growth_predictions 
                if p.predicted_value > 0.8 and p.confidence_score > 0.7
            ]
            
            for prediction in high_potential:
                skill = prediction.metadata.get('skill_area', 'Unknown')
                insight = GrowthInsight(
                    insight_id=f"growth_opp_{skill}",
                    user_id=user_id,
                    title=f"High Growth Potential in {skill}",
                    description=f"You show strong potential for growth in {skill}. Focus here for maximum impact.",
                    impact_score=prediction.predicted_value,
                    action_items=[
                        f"Increase practice time in {skill}",
                        "Seek advanced resources",
                        "Set challenging goals"
                    ],
                    confidence=prediction.confidence_score,
                    category="opportunity",
                    created_at=datetime.now()
                )
                insights.append(insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to identify growth opportunities: {str(e)}")
            return []

    async def _generate_recommendations(
        self,
        user_id: str,
        predictions: List[PredictionResult]
    ) -> List[GrowthInsight]:
        """Generate personalized recommendations."""
        insights = []
        
        try:
            # Get user preferences
            user_profile = await self.data_repository.get_user_profile(user_id)
            learning_style = user_profile.get('learning_style', 'visual')
            
            # Generate time-based recommendations
            short_term_predictions = [
                p for p in predictions 
                if p.time_horizon == TimeHorizon.SHORT_TERM
            ]
            
            if short_term_predictions:
                avg_confidence = sum(p.confidence_score for p in short_term_predictions) / len(short_term_predictions)
                
                if avg_confidence < 0.6:
                    insight = GrowthInsight(
                        insight_id="focus_recommendation",
                        user_id=user_id,
                        title="Focus on Consistency",
                        description="Your short-term predictions show variable confidence. Focus on consistent daily practice.",
                        impact_score=0.7,
                        action_items=[
                            "Set daily learning goals",
                            "Track progress regularly",
                            "Reduce multitasking"
                        ],
                        confidence=0.8,
                        category="recommendation",
                        created_at=datetime.now()
                    )
                    insights.append(insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return []

    async def _get_model(self, model_name: str):
        """Get or load a model from registry."""
        if model_name not in self._models:
            self._models[model_name] = await self.model_registry.load_model(model_name)
        return self._models[model_name]

    async def _calculate_confidence(
        self,
        model,
        features: np.ndarray,
        context: str
    ) -> float:
        """Calculate prediction confidence score."""
        try:
            if hasattr(model, 'predict_proba'):
                probas = model.predict_proba(features)[0]
                confidence = max(probas)
            else:
                # For regression models, use feature importance and variance
                prediction = model.predict(features)[0]
                confidence = min(0.9, max(0.1, abs(prediction) / (abs(prediction) + 1)))
            
            return float(confidence)
            
        except Exception as e:
            logger.warning(f"Failed to calculate confidence for {context}: {str(e)}")
            return 0.5

    async def _identify_key_skill_areas(self, user_id: str) -> List[str]:
        """Identify key skill areas for a user."""
        try:
            activity_data = await self.data_repository.get_user_activities(user_id)
            # Extract most frequent skill areas from activities
            skill_counts = {}
            for activity in activity_data:
                skills = activity.get('skills', [])
                for skill in skills:
                    skill_counts[skill] = skill_counts.get(skill, 0) + 1
            
            # Return top 5 skills
            return sorted(skill_counts.keys(), key=lambda x: skill_counts[x], reverse=True)[:5]
            
        except Exception as e:
            logger.warning(f"Failed to identify key skill areas: {str(e)}")
            return ['problem_solving', 'communication', 'technical_skills']

    async def _get_skill_complexity(self, skill_area: str) -> float:
        """Get complexity score for a skill area."""
        complexity_map = {
            'communication': 0.6,
            'technical_skills': 0.8,
            'problem_solving': 0.9,
            'leadership': 0.85,
            'creativity': 0.7
        }
        return complexity_map.get(skill_area, 0.75)

    async def _analyze_risk_factors(
        self,
        features: Dict[str, float],
        model
    ) -> Dict[str, Any]:
        """Analyze risk factors for engagement."""
        try:
            risk_factors = {}
            
            # Check for low engagement indicators
            if features.get('daily_activity_time', 0) < 30:
                risk_factors['low_activity'] = "Daily activity time is below average"
            
            if features.get('completion_rate', 1.0) < 0.6:
                risk_factors['low_completion'] = "Task completion rate is concerning"
            
            if features.get('streak_days', 0) < 3:
                risk_factors['inconsistency'] = "Learning streak is inconsistent"
            
            return risk_factors
            
        except Exception as e:
            logger.warning(f"Failed to analyze risk factors: {str(e)}")
            return {"unknown": "Unable to analyze specific risk factors"}
