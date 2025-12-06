"""
API endpoints for the prediction engine service.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

from ..core.engine import PredictionEngine
from ..models.prediction import PredictionRequest, PredictionResponse, PredictionModel
from ..models.training import TrainingRequest, TrainingStatus
from ..services.model_service import ModelService
from ..services.data_service import DataService
from ..utils.authentication import get_current_user, User
from ..utils.validation import validate_prediction_request
from ..utils.exceptions import (
    ModelNotFoundError,
    ValidationError,
    InsufficientDataError,
    PredictionEngineError
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["prediction"])


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(..., description="Current timestamp")
    version: str = Field(..., description="API version")


class MetricsResponse(BaseModel):
    """Model metrics response model."""
    model_id: str = Field(..., description="Model identifier")
    accuracy: float = Field(..., description="Model accuracy score")
    precision: float = Field(..., description="Model precision score")
    recall: float = Field(..., description="Model recall score")
    f1_score: float = Field(..., description="Model F1 score")
    last_updated: datetime = Field(..., description="Last update timestamp")


class ModelListResponse(BaseModel):
    """Model list response model."""
    models: List[Dict[str, Any]] = Field(..., description="List of available models")
    total_count: int = Field(..., description="Total number of models")


def get_prediction_engine() -> PredictionEngine:
    """Dependency to get prediction engine instance."""
    return PredictionEngine()


def get_model_service() -> ModelService:
    """Dependency to get model service instance."""
    return ModelService()


def get_data_service() -> DataService:
    """Dependency to get data service instance."""
    return DataService()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Returns:
        HealthResponse: Service health status
    """
    try:
        return HealthResponse(
            status="healthy",
            timestamp=datetime.utcnow(),
            version="1.0.0"
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Service unavailable")


@router.post("/predictions", response_model=PredictionResponse)
async def create_prediction(
    request: PredictionRequest,
    engine: PredictionEngine = Depends(get_prediction_engine),
    current_user: User = Depends(get_current_user)
) -> PredictionResponse:
    """
    Create a new prediction.
    
    Args:
        request: Prediction request data
        engine: Prediction engine instance
        current_user: Authenticated user
        
    Returns:
        PredictionResponse: Prediction results
        
    Raises:
        HTTPException: If prediction fails or validation errors occur
    """
    try:
        # Validate request
        await validate_prediction_request(request)
        
        # Generate prediction
        result = await engine.predict(
            model_id=request.model_id,
            features=request.features,
            user_id=current_user.id
        )
        
        logger.info(f"Prediction created for user {current_user.id}, model {request.model_id}")
        
        return PredictionResponse(
            prediction_id=result.prediction_id,
            model_id=request.model_id,
            predictions=result.predictions,
            confidence_scores=result.confidence_scores,
            metadata=result.metadata,
            created_at=datetime.utcnow()
        )
        
    except ModelNotFoundError:
        raise HTTPException(status_code=404, detail="Model not found")
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except InsufficientDataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PredictionEngineError as e:
        logger.error(f"Prediction engine error: {str(e)}")
        raise HTTPException(status_code=500, detail="Prediction failed")
    except Exception as e:
        logger.error(f"Unexpected error in create_prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/predictions/{prediction_id}", response_model=PredictionResponse)
async def get_prediction(
    prediction_id: str,
    engine: PredictionEngine = Depends(get_prediction_engine),
    current_user: User = Depends(get_current_user)
) -> PredictionResponse:
    """
    Get prediction by ID.
    
    Args:
        prediction_id: Prediction identifier
        engine: Prediction engine instance
        current_user: Authenticated user
        
    Returns:
        PredictionResponse: Prediction data
        
    Raises:
        HTTPException: If prediction not found or access denied
    """
    try:
        prediction = await engine.get_prediction(prediction_id, current_user.id)
        
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
            
        return prediction
        
    except Exception as e:
        logger.error(f"Error retrieving prediction {prediction_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve prediction")


@router.get("/models", response_model=ModelListResponse)
async def list_models(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    model_type: Optional[str] = Query(None, description="Filter by model type"),
    status: Optional[str] = Query(None, description="Filter by model status"),
    model_service: ModelService = Depends(get_model_service),
    current_user: User = Depends(get_current_user)
) -> ModelListResponse:
    """
    List available models.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        model_type: Optional model type filter
        status: Optional status filter
        model_service: Model service instance
        current_user: Authenticated user
        
    Returns:
        ModelListResponse: List of models
    """
    try:
        filters = {}
        if model_type:
            filters["model_type"] = model_type
        if status:
            filters["status"] = status
            
        models, total_count = await model_service.list_models(
            skip=skip,
            limit=limit,
            filters=filters,
            user_id=current_user.id
        )
        
        return ModelListResponse(
            models=models,
            total_count=total_count
        )
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve models")


@router.get("/models/{model_id}", response_model=PredictionModel)
async def get_model(
    model_id: str,
    model_service: ModelService = Depends(get_model_service),
    current_user: User = Depends(get_current_user)
) -> PredictionModel:
    """
    Get model by ID.
    
    Args:
        model_id: Model identifier
        model_service: Model service instance
        current_user: Authenticated user
        
    Returns:
        PredictionModel: Model data
        
    Raises:
        HTTPException: If model not found or access denied
    """
    try:
        model = await model_service.get_model(model_id, current_user.id)
        
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
            
        return model
        
    except Exception as e:
        logger.error(f"Error retrieving model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model")


@router.get("/models/{model_id}/metrics", response_model=MetricsResponse)
async def get_model_metrics(
    model_id: str,
    model_service: ModelService = Depends(get_model_service),
    current_user: User = Depends(get_current_user)
) -> MetricsResponse:
    """
    Get model performance metrics.
    
    Args:
        model_id: Model identifier
        model_service: Model service instance
        current_user: Authenticated user
        
    Returns:
        MetricsResponse: Model metrics
        
    Raises:
        HTTPException: If model not found or metrics unavailable
    """
    try:
        metrics = await model_service.get_model_metrics(model_id, current_user.id)
        
        if not metrics:
            raise HTTPException(status_code=404, detail="Model metrics not found")
            
        return MetricsResponse(
            model_id=model_id,
            accuracy=metrics.accuracy,
            precision=metrics.precision,
            recall=metrics.recall,
            f1_score=metrics.f1_score,
            last_updated=metrics.last_updated
        )
        
    except Exception as e:
        logger.error(f"Error retrieving metrics for model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model metrics")


@router.post("/models/train", response_model=TrainingStatus)
async def train_model(
    request: TrainingRequest,
    engine: PredictionEngine = Depends(get_prediction_engine),
    current_user: User = Depends(get_current_user)
) -> TrainingStatus:
    """
    Start model training.
    
    Args:
        request: Training request data
        engine: Prediction engine instance
        current_user: Authenticated user
        
    Returns:
        TrainingStatus: Training job status
        
    Raises:
        HTTPException: If training fails to start or validation errors occur
    """
    try:
        training_job = await engine.train_model(
            model_config=request.model_config,
            training_data=request.training_data,
            validation_data=request.validation_data,
            user_id=current_user.id
        )
        
        logger.info(f"Training started for user {current_user.id}, job {training_job.job_id}")
        
        return training_job
        
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except InsufficientDataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting model training: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to start training")


@router.get("/training/{job_id}/status", response_model=TrainingStatus)
async def get_training_status(
    job_id: str,
    engine: PredictionEngine = Depends(get_prediction_engine),
    current_user: User = Depends(get_current_user)
) -> TrainingStatus:
    """
    Get training job status.
    
    Args:
        job_id: Training job identifier
        engine: Prediction engine instance
        current_user: Authenticated user
        
    Returns:
        TrainingStatus: Training job status
        
    Raises:
        HTTPException: If training job not found
    """
    try:
        status = await engine.get_training_status(job_id, current_user.id)
        
        if not status:
            raise HTTPException(status_code=404, detail="Training job not found")
            
        return status
        
    except Exception as e:
        logger.error(f"Error retrieving training status {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve training status")


@router.delete("/models/{model_id}")
async def delete_model(
    model_id: str,
    model_service: ModelService = Depends(get_model_service),
    current_user: User = Depends(get_current_user)
) -> JSONResponse:
    """
    Delete a model.
    
    Args:
        model_id: Model identifier
        model_service: Model service instance
        current_user: Authenticated user
        
    Returns:
        JSONResponse: Deletion confirmation
        
    Raises:
        HTTPException: If model not found or deletion fails
    """
    try:
        success = await model_service.delete_model(model_id, current_user.id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Model not found")
            
        logger.info(f"Model {model_id} deleted by user {current_user.id}")
        
        return JSONResponse(
            status_code=200,
            content={"message": f"Model {model_id} deleted successfully"}
        )
        
    except Exception as e:
        logger.error(f"Error deleting model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete model")
