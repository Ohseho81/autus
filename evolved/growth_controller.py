"""
Growth Controller

This module provides the main controller for the growth engine, handling
prediction and growth coaching functionality for users.
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.features.growth_engine.services.prediction_service import PredictionService
from src.features.growth_engine.services.coaching_service import CoachingService
from src.features.growth_engine.services.analytics_service import AnalyticsService
from src.features.growth_engine.models.growth_models import (
    GrowthPrediction,
    CoachingRecommendation,
    UserGrowthProfile,
    GrowthMetric
)
from src.features.growth_engine.schemas.growth_schemas import (
    PredictionRequest,
    PredictionResponse,
    CoachingRequest,
    CoachingResponse,
    GrowthAnalyticsResponse
)
from src.core.exceptions import ValidationError, ServiceError


logger = logging.getLogger(__name__)


@dataclass
class GrowthEngineConfig:
    """Configuration for growth engine operations."""
    prediction_horizon_days: int = 30
    min_data_points: int = 10
    confidence_threshold: float = 0.7
    coaching_refresh_hours: int = 24


class GrowthController:
    """
    Controller for growth engine operations including predictions and coaching.
    
    This controller orchestrates the growth engine services to provide
    comprehensive growth insights and coaching recommendations for users.
    """

    def __init__(
        self,
        db_session: Session,
        prediction_service: PredictionService,
        coaching_service: CoachingService,
        analytics_service: AnalyticsService,
        config: Optional[GrowthEngineConfig] = None
    ) -> None:
        """
        Initialize the growth controller.

        Args:
            db_session: Database session for data operations
            prediction_service: Service for generating growth predictions
            coaching_service: Service for providing coaching recommendations
            analytics_service: Service for growth analytics
            config: Configuration for growth engine operations
        """
        self.db_session = db_session
        self.prediction_service = prediction_service
        self.coaching_service = coaching_service
        self.analytics_service = analytics_service
        self.config = config or GrowthEngineConfig()

    async def generate_growth_prediction(
        self,
        user_id: int,
        request: PredictionRequest
    ) -> PredictionResponse:
        """
        Generate growth predictions for a user.

        Args:
            user_id: ID of the user to generate predictions for
            request: Prediction request parameters

        Returns:
            Growth prediction response with forecasted metrics

        Raises:
            ValidationError: If request parameters are invalid
            ServiceError: If prediction generation fails
            HTTPException: If user not found or insufficient data
        """
        try:
            logger.info(f"Generating growth prediction for user {user_id}")

            # Validate user exists and has sufficient data
            user_profile = await self._get_user_growth_profile(user_id)
            if not user_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User growth profile not found"
                )

            if len(user_profile.historical_metrics) < self.config.min_data_points:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient historical data for prediction"
                )

            # Generate prediction
            prediction = await self.prediction_service.generate_prediction(
                user_profile=user_profile,
                horizon_days=request.horizon_days or self.config.prediction_horizon_days,
                metrics=request.metrics,
                scenario=request.scenario
            )

            # Store prediction
            await self._store_prediction(user_id, prediction)

            return PredictionResponse(
                user_id=user_id,
                prediction=prediction,
                confidence_score=prediction.confidence_score,
                generated_at=datetime.utcnow(),
                valid_until=datetime.utcnow() + timedelta(days=7)
            )

        except ValidationError as e:
            logger.error(f"Validation error in prediction generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except ServiceError as e:
            logger.error(f"Service error in prediction generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate prediction"
            )
        except Exception as e:
            logger.error(f"Unexpected error in prediction generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    async def get_coaching_recommendations(
        self,
        user_id: int,
        request: CoachingRequest
    ) -> CoachingResponse:
        """
        Get personalized coaching recommendations for a user.

        Args:
            user_id: ID of the user to get coaching for
            request: Coaching request parameters

        Returns:
            Coaching recommendations response

        Raises:
            ValidationError: If request parameters are invalid
            ServiceError: If coaching generation fails
            HTTPException: If user not found
        """
        try:
            logger.info(f"Generating coaching recommendations for user {user_id}")

            # Get user profile and recent predictions
            user_profile = await self._get_user_growth_profile(user_id)
            if not user_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User growth profile not found"
                )

            recent_prediction = await self._get_recent_prediction(user_id)

            # Generate coaching recommendations
            recommendations = await self.coaching_service.generate_recommendations(
                user_profile=user_profile,
                current_goals=request.goals,
                focus_areas=request.focus_areas,
                prediction=recent_prediction,
                coaching_style=request.coaching_style
            )

            # Store recommendations
            await self._store_coaching_recommendations(user_id, recommendations)

            return CoachingResponse(
                user_id=user_id,
                recommendations=recommendations,
                generated_at=datetime.utcnow(),
                refresh_at=datetime.utcnow() + timedelta(
                    hours=self.config.coaching_refresh_hours
                )
            )

        except ValidationError as e:
            logger.error(f"Validation error in coaching generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except ServiceError as e:
            logger.error(f"Service error in coaching generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate coaching recommendations"
            )
        except Exception as e:
            logger.error(f"Unexpected error in coaching generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    async def get_growth_analytics(
        self,
        user_id: int,
        timeframe_days: Optional[int] = None,
        metrics: Optional[List[str]] = None
    ) -> GrowthAnalyticsResponse:
        """
        Get comprehensive growth analytics for a user.

        Args:
            user_id: ID of the user to get analytics for
            timeframe_days: Number of days to analyze (default: 90)
            metrics: Specific metrics to analyze (default: all)

        Returns:
            Growth analytics response with insights and trends

        Raises:
            HTTPException: If user not found or analytics generation fails
        """
        try:
            logger.info(f"Generating growth analytics for user {user_id}")

            # Get user profile
            user_profile = await self._get_user_growth_profile(user_id)
            if not user_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User growth profile not found"
                )

            # Generate analytics
            analytics = await self.analytics_service.generate_analytics(
                user_profile=user_profile,
                timeframe_days=timeframe_days or 90,
                metrics=metrics
            )

            return GrowthAnalyticsResponse(
                user_id=user_id,
                analytics=analytics,
                generated_at=datetime.utcnow()
            )

        except ServiceError as e:
            logger.error(f"Service error in analytics generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate analytics"
            )
        except Exception as e:
            logger.error(f"Unexpected error in analytics generation: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )

    async def update_user_metrics(
        self,
        user_id: int,
        metrics: List[GrowthMetric]
    ) -> Dict[str, Any]:
        """
        Update user's growth metrics and trigger relevant updates.

        Args:
            user_id: ID of the user to update metrics for
            metrics: List of new metric values

        Returns:
            Update confirmation with triggered actions

        Raises:
            ValidationError: If metrics are invalid
            HTTPException: If user not found or update fails
        """
        try:
            logger.info(f"Updating metrics for user {user_id}")

            # Validate metrics
            if not metrics:
                raise ValidationError("No metrics provided")

            # Get or create user profile
            user_profile = await self._get_or_create_user_profile(user_id)

            # Update metrics
            updated_profile = await self._update_user_metrics(user_profile, metrics)

            # Check if predictions need refresh
            should_refresh_prediction = await self._should_refresh_prediction(
                user_id, updated_profile
            )

            # Check if coaching needs refresh
            should_refresh_coaching = await self._should_refresh_coaching(
                user_id, updated_profile
            )

            triggered_actions = []
            if should_refresh_prediction:
                triggered_actions.append("prediction_refresh_queued")
            if should_refresh_coaching:
                triggered_actions.append("coaching_refresh_queued")

            return {
                "user_id": user_id,
                "metrics_updated": len(metrics),
                "triggered_actions": triggered_actions,
                "updated_at": datetime.utcnow()
            }

        except ValidationError as e:
            logger.error(f"Validation error in metrics update: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error in metrics update: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update metrics"
            )

    async def _get_user_growth_profile(self, user_id: int) -> Optional[UserGrowthProfile]:
        """Get user's growth profile from database."""
        # Implementation would query database for user profile
        pass

    async def _get_or_create_user_profile(self, user_id: int) -> UserGrowthProfile:
        """Get or create user's growth profile."""
        # Implementation would get or create user profile
        pass

    async def _store_prediction(self, user_id: int, prediction: GrowthPrediction) -> None:
        """Store prediction in database."""
        # Implementation would store prediction
        pass

    async def _get_recent_prediction(self, user_id: int) -> Optional[GrowthPrediction]:
        """Get user's most recent prediction."""
        # Implementation would query for recent prediction
        pass

    async def _store_coaching_recommendations(
        self,
        user_id: int,
        recommendations: List[CoachingRecommendation]
    ) -> None:
        """Store coaching recommendations in database."""
        # Implementation would store recommendations
        pass

    async def _update_user_metrics(
        self,
        user_profile: UserGrowthProfile,
        metrics: List[GrowthMetric]
    ) -> UserGrowthProfile:
        """Update user profile with new metrics."""
        # Implementation would update profile with metrics
        pass

    async def _should_refresh_prediction(
        self,
        user_id: int,
        user_profile: UserGrowthProfile
    ) -> bool:
        """Check if prediction should be refreshed based on new metrics."""
        # Implementation would check refresh conditions
        return False

    async def _should_refresh_coaching(
        self,
        user_id: int,
        user_profile: UserGrowthProfile
    ) -> bool:
        """Check if coaching should be refreshed based on new metrics."""
        # Implementation would check refresh conditions
        return False
