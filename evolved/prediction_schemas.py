"""
Schemas for prediction engine data validation and serialization.

This module contains Pydantic models for validating prediction inputs,
outputs, and configuration data within the prediction engine.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from pydantic import BaseModel, Field, validator


class PredictionType(str, Enum):
    """Enumeration of supported prediction types."""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    TIME_SERIES = "time_series"
    ANOMALY_DETECTION = "anomaly_detection"


class ModelStatus(str, Enum):
    """Enumeration of model statuses."""
    TRAINING = "training"
    READY = "ready"
    FAILED = "failed"
    UPDATING = "updating"
    DEPRECATED = "deprecated"


class FeatureSchema(BaseModel):
    """Schema for feature definition."""
    name: str = Field(..., description="Feature name")
    type: str = Field(..., description="Feature data type")
    required: bool = Field(default=True, description="Whether feature is required")
    description: Optional[str] = Field(None, description="Feature description")
    min_value: Optional[float] = Field(None, description="Minimum allowed value")
    max_value: Optional[float] = Field(None, description="Maximum allowed value")
    allowed_values: Optional[List[Union[str, int, float]]] = Field(
        None, description="List of allowed values for categorical features"
    )

    @validator('type')
    def validate_type(cls, v):
        """Validate feature type."""
        allowed_types = ['int', 'float', 'str', 'bool', 'datetime']
        if v not in allowed_types:
            raise ValueError(f"Feature type must be one of {allowed_types}")
        return v


class ModelConfigSchema(BaseModel):
    """Schema for model configuration."""
    model_id: str = Field(..., description="Unique model identifier")
    model_type: str = Field(..., description="Type of ML model")
    prediction_type: PredictionType = Field(..., description="Type of prediction")
    features: List[FeatureSchema] = Field(..., description="List of input features")
    target_column: Optional[str] = Field(None, description="Target column name")
    hyperparameters: Dict[str, Any] = Field(
        default_factory=dict, description="Model hyperparameters"
    )
    preprocessing_steps: List[str] = Field(
        default_factory=list, description="Preprocessing pipeline steps"
    )
    version: str = Field(default="1.0.0", description="Model version")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: ModelStatus = Field(default=ModelStatus.TRAINING)

    class Config:
        """Pydantic configuration."""
        use_enum_values = True


class PredictionInputSchema(BaseModel):
    """Schema for prediction input data."""
    model_id: str = Field(..., description="Model identifier")
    features: Dict[str, Any] = Field(..., description="Input features")
    request_id: Optional[str] = Field(None, description="Request identifier")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata"
    )

    @validator('features')
    def validate_features_not_empty(cls, v):
        """Validate that features are provided."""
        if not v:
            raise ValueError("Features cannot be empty")
        return v


class PredictionOutputSchema(BaseModel):
    """Schema for prediction output data."""
    prediction_id: str = Field(..., description="Unique prediction identifier")
    model_id: str = Field(..., description="Model identifier")
    prediction: Union[float, int, str, List[float]] = Field(
        ..., description="Prediction result"
    )
    confidence: Optional[float] = Field(
        None, description="Prediction confidence score", ge=0.0, le=1.0
    )
    probability_scores: Optional[Dict[str, float]] = Field(
        None, description="Class probability scores for classification"
    )
    feature_importance: Optional[Dict[str, float]] = Field(
        None, description="Feature importance scores"
    )
    request_id: Optional[str] = Field(None, description="Original request identifier")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Prediction timestamp"
    )
    processing_time_ms: Optional[float] = Field(
        None, description="Processing time in milliseconds"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata"
    )

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BatchPredictionInputSchema(BaseModel):
    """Schema for batch prediction input."""
    model_id: str = Field(..., description="Model identifier")
    batch_data: List[Dict[str, Any]] = Field(
        ..., description="List of feature dictionaries"
    )
    batch_id: Optional[str] = Field(None, description="Batch identifier")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Batch metadata"
    )

    @validator('batch_data')
    def validate_batch_not_empty(cls, v):
        """Validate that batch data is not empty."""
        if not v:
            raise ValueError("Batch data cannot be empty")
        if len(v) > 10000:
            raise ValueError("Batch size cannot exceed 10000 records")
        return v


class BatchPredictionOutputSchema(BaseModel):
    """Schema for batch prediction output."""
    batch_id: str = Field(..., description="Batch identifier")
    model_id: str = Field(..., description="Model identifier")
    predictions: List[PredictionOutputSchema] = Field(
        ..., description="List of predictions"
    )
    total_records: int = Field(..., description="Total number of records processed")
    successful_predictions: int = Field(
        ..., description="Number of successful predictions"
    )
    failed_predictions: int = Field(..., description="Number of failed predictions")
    processing_time_ms: float = Field(
        ..., description="Total processing time in milliseconds"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Batch completion timestamp"
    )
    errors: List[str] = Field(
        default_factory=list, description="List of error messages"
    )

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ModelTrainingSchema(BaseModel):
    """Schema for model training request."""
    model_config: ModelConfigSchema = Field(..., description="Model configuration")
    training_data_path: str = Field(..., description="Path to training data")
    validation_data_path: Optional[str] = Field(
        None, description="Path to validation data"
    )
    test_data_path: Optional[str] = Field(None, description="Path to test data")
    training_parameters: Dict[str, Any] = Field(
        default_factory=dict, description="Training-specific parameters"
    )


class ModelMetricsSchema(BaseModel):
    """Schema for model performance metrics."""
    model_id: str = Field(..., description="Model identifier")
    accuracy: Optional[float] = Field(None, description="Model accuracy")
    precision: Optional[float] = Field(None, description="Model precision")
    recall: Optional[float] = Field(None, description="Model recall")
    f1_score: Optional[float] = Field(None, description="F1 score")
    rmse: Optional[float] = Field(None, description="Root mean squared error")
    mae: Optional[float] = Field(None, description="Mean absolute error")
    r2_score: Optional[float] = Field(None, description="R-squared score")
    custom_metrics: Dict[str, float] = Field(
        default_factory=dict, description="Custom metrics"
    )
    evaluation_date: datetime = Field(
        default_factory=datetime.utcnow, description="Evaluation timestamp"
    )

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PredictionErrorSchema(BaseModel):
    """Schema for prediction errors."""
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Error message")
    model_id: Optional[str] = Field(None, description="Model identifier")
    request_id: Optional[str] = Field(None, description="Request identifier")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Error timestamp"
    )
    details: Dict[str, Any] = Field(
        default_factory=dict, description="Additional error details"
    )

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
