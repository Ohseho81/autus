"""
Prediction service for generating forecasts and predictions.
"""

import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import asyncio

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

from ..models.prediction_models import (
    LinearRegressionModel,
    TimeSeriesModel,
    NeuralNetworkModel,
    EnsembleModel
)
from ..data.data_processor import DataProcessor
from ..utils.exceptions import (
    PredictionError,
    ModelNotFoundError,
    InsufficientDataError,
    ValidationError
)

logger = logging.getLogger(__name__)


@dataclass
class PredictionRequest:
    """Request object for predictions."""
    model_id: str
    input_data: Union[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame]
    prediction_horizon: Optional[int] = 1
    confidence_interval: Optional[float] = 0.95
    return_probabilities: bool = False
    feature_names: Optional[List[str]] = None


@dataclass
class PredictionResponse:
    """Response object for predictions."""
    predictions: Union[List[float], np.ndarray]
    model_id: str
    confidence_intervals: Optional[List[Tuple[float, float]]] = None
    probabilities: Optional[List[Dict[str, float]]] = None
    feature_importance: Optional[Dict[str, float]] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime = None

    def __post_init__(self):
        """Set timestamp if not provided."""
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class PredictionService:
    """Service for generating predictions using various models."""

    def __init__(self, data_processor: Optional[DataProcessor] = None):
        """
        Initialize the prediction service.

        Args:
            data_processor: Data processor for preparing input data
        """
        self.data_processor = data_processor or DataProcessor()
        self.models: Dict[str, BaseEstimator] = {}
        self.model_metadata: Dict[str, Dict[str, Any]] = {}
        self._initialize_models()

    def _initialize_models(self) -> None:
        """Initialize available prediction models."""
        try:
            self.models = {
                'linear_regression': LinearRegressionModel(),
                'time_series': TimeSeriesModel(),
                'neural_network': NeuralNetworkModel(),
                'ensemble': EnsembleModel()
            }
            
            self.model_metadata = {
                model_id: {
                    'created_at': datetime.utcnow(),
                    'model_type': type(model).__name__,
                    'is_trained': False,
                    'last_prediction': None,
                    'performance_metrics': {}
                }
                for model_id, model in self.models.items()
            }
            
            logger.info(f"Initialized {len(self.models)} prediction models")
            
        except Exception as e:
            logger.error(f"Failed to initialize models: {e}")
            raise PredictionError(f"Model initialization failed: {e}")

    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        """
        Generate predictions based on the request.

        Args:
            request: Prediction request containing model ID and input data

        Returns:
            Prediction response with results and metadata

        Raises:
            ModelNotFoundError: If the specified model doesn't exist
            ValidationError: If input data is invalid
            PredictionError: If prediction generation fails
        """
        try:
            # Validate request
            self._validate_prediction_request(request)
            
            # Get model
            model = self._get_model(request.model_id)
            
            # Prepare input data
            processed_data = await self._prepare_input_data(
                request.input_data,
                request.feature_names
            )
            
            # Generate predictions
            predictions = await self._generate_predictions(
                model,
                processed_data,
                request.prediction_horizon
            )
            
            # Calculate confidence intervals if requested
            confidence_intervals = None
            if request.confidence_interval:
                confidence_intervals = await self._calculate_confidence_intervals(
                    model,
                    processed_data,
                    predictions,
                    request.confidence_interval
                )
            
            # Get probabilities if requested
            probabilities = None
            if request.return_probabilities and hasattr(model, 'predict_proba'):
                probabilities = await self._get_prediction_probabilities(
                    model,
                    processed_data
                )
            
            # Get feature importance
            feature_importance = self._get_feature_importance(
                model,
                request.feature_names
            )
            
            # Update metadata
            self.model_metadata[request.model_id]['last_prediction'] = datetime.utcnow()
            
            response = PredictionResponse(
                predictions=predictions,
                model_id=request.model_id,
                confidence_intervals=confidence_intervals,
                probabilities=probabilities,
                feature_importance=feature_importance,
                metadata={
                    'prediction_horizon': request.prediction_horizon,
                    'input_shape': processed_data.shape if hasattr(processed_data, 'shape') else None,
                    'model_type': self.model_metadata[request.model_id]['model_type']
                }
            )
            
            logger.info(f"Generated predictions for model {request.model_id}")
            return response
            
        except (ModelNotFoundError, ValidationError):
            raise
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise PredictionError(f"Prediction generation failed: {e}")

    async def batch_predict(
        self,
        requests: List[PredictionRequest]
    ) -> List[PredictionResponse]:
        """
        Generate predictions for multiple requests.

        Args:
            requests: List of prediction requests

        Returns:
            List of prediction responses
        """
        try:
            tasks = [self.predict(request) for request in requests]
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Handle exceptions
            results = []
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"Batch prediction {i} failed: {response}")
                    # Create error response
                    results.append(PredictionResponse(
                        predictions=[],
                        model_id=requests[i].model_id,
                        metadata={'error': str(response)}
                    ))
                else:
                    results.append(response)
            
            return results
            
        except Exception as e:
            logger.error(f"Batch prediction failed: {e}")
            raise PredictionError(f"Batch prediction failed: {e}")

    async def get_model_performance(
        self,
        model_id: str,
        test_data: pd.DataFrame,
        target_column: str
    ) -> Dict[str, float]:
        """
        Evaluate model performance on test data.

        Args:
            model_id: ID of the model to evaluate
            test_data: Test dataset
            target_column: Name of target column

        Returns:
            Dictionary containing performance metrics
        """
        try:
            model = self._get_model(model_id)
            
            # Prepare test data
            X_test = test_data.drop(columns=[target_column])
            y_test = test_data[target_column]
            
            # Generate predictions
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            metrics = {
                'mse': float(mean_squared_error(y_test, y_pred)),
                'rmse': float(np.sqrt(mean_squared_error(y_test, y_pred))),
                'mae': float(mean_absolute_error(y_test, y_pred)),
                'r2_score': float(r2_score(y_test, y_pred))
            }
            
            # Update metadata
            self.model_metadata[model_id]['performance_metrics'] = metrics
            
            logger.info(f"Calculated performance metrics for model {model_id}")
            return metrics
            
        except Exception as e:
            logger.error(f"Performance evaluation failed: {e}")
            raise PredictionError(f"Performance evaluation failed: {e}")

    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """
        Get information about a specific model.

        Args:
            model_id: ID of the model

        Returns:
            Dictionary containing model information
        """
        if model_id not in self.models:
            raise ModelNotFoundError(f"Model {model_id} not found")
        
        return self.model_metadata.get(model_id, {})

    def list_models(self) -> List[Dict[str, Any]]:
        """
        List all available models.

        Returns:
            List of model information dictionaries
        """
        return [
            {
                'model_id': model_id,
                **metadata
            }
            for model_id, metadata in self.model_metadata.items()
        ]

    def _validate_prediction_request(self, request: PredictionRequest) -> None:
        """Validate prediction request."""
        if not request.model_id:
            raise ValidationError("Model ID is required")
        
        if request.input_data is None:
            raise ValidationError("Input data is required")
        
        if request.prediction_horizon and request.prediction_horizon <= 0:
            raise ValidationError("Prediction horizon must be positive")
        
        if (request.confidence_interval and 
            not 0 < request.confidence_interval < 1):
            raise ValidationError("Confidence interval must be between 0 and 1")

    def _get_model(self, model_id: str) -> BaseEstimator:
        """Get model by ID."""
        if model_id not in self.models:
            raise ModelNotFoundError(f"Model {model_id} not found")
        
        model = self.models[model_id]
        if not self.model_metadata[model_id]['is_trained']:
            logger.warning(f"Model {model_id} is not trained")
        
        return model

    async def _prepare_input_data(
        self,
        input_data: Union[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame],
        feature_names: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """Prepare input data for prediction."""
        try:
            if isinstance(input_data, dict):
                df = pd.DataFrame([input_data])
            elif isinstance(input_data, list):
                df = pd.DataFrame(input_data)
            elif isinstance(input_data, pd.DataFrame):
                df = input_data.copy()
            else:
                raise ValidationError(f"Unsupported input data type: {type(input_data)}")
            
            # Filter columns if feature names provided
            if feature_names:
                missing_features = set(feature_names) - set(df.columns)
                if missing_features:
                    raise ValidationError(f"Missing features: {missing_features}")
                df = df[feature_names]
            
            # Process data
            processed_df = await self.data_processor.process_dataframe(df)
            
            return processed_df
            
        except Exception as e:
            raise ValidationError(f"Data preparation failed: {e}")

    async def _generate_predictions(
        self,
        model: BaseEstimator,
        data: pd.DataFrame,
        horizon: int
    ) -> np.ndarray:
        """Generate predictions using the model."""
        try:
            if hasattr(model, 'predict_multi_step') and horizon > 1:
                predictions = model.predict_multi_step(data, steps=horizon)
            else:
                predictions = model.predict(data)
            
            return np.array(predictions)
            
        except Exception as e:
            raise PredictionError(f"Prediction generation failed: {e}")

    async def _calculate_confidence_intervals(
        self,
        model: BaseEstimator,
        data: pd.DataFrame,
        predictions: np.ndarray,
        confidence_level: float
    ) -> List[Tuple[float, float]]:
        """Calculate confidence intervals for predictions."""
        try:
            if hasattr(model, 'predict_interval'):
                intervals = model.predict_interval(data, confidence_level)
            else:
                # Fallback: use prediction variance if available
                if hasattr(model, 'predict_var'):
                    variance = model.predict_var(data)
                    std = np.sqrt(variance)
                    z_score = 1.96  # Approximate for 95% confidence
                    intervals = [
                        (pred - z_score * s, pred + z_score * s)
                        for pred, s in zip(predictions, std)
                    ]
                else:
                    # Simple fallback based on residuals
                    std_error = np.std(predictions) * 0.1  # Rough estimate
                    intervals = [
                        (pred - std_error, pred + std_error)
                        for pred in predictions
                    ]
            
            return intervals
            
        except Exception as e:
            logger.warning(f"Confidence interval calculation failed: {e}")
            return None

    async def _get_prediction_probabilities(
        self,
        model: BaseEstimator,
        data: pd.DataFrame
    ) -> List[Dict[str, float]]:
        """Get prediction probabilities for classification models."""
        try:
            if hasattr(model, 'predict_proba'):
                probabilities = model.predict_proba(data)
                classes = model.classes_ if hasattr(model, 'classes_') else range(len(probabilities[0]))
                
                return [
                    {str(cls): float(prob) for cls, prob in zip(classes, prob_array)}
                    for prob_array in probabilities
                ]
            
            return None
            
        except Exception as e:
            logger.warning(f"Probability calculation failed: {e}")
            return None

    def _get_feature_importance(
        self,
        model: BaseEstimator,
        feature_names: Optional[List[str]] = None
    ) -> Optional[Dict[str, float]]:
        """Get feature importance from the model."""
        try:
            importance = None
            
            if hasattr(model, 'feature_importances_'):
                importance = model.feature_importances_
            elif hasattr(model, 'coef_'):
                importance = np.abs(model.coef_).flatten()
            
            if importance is not None and feature_names:
                return {
                    name: float(imp)
                    for name, imp in zip(feature_names, importance)
                }
            
            return None
            
        except Exception as e:
            logger.warning(f"Feature importance calculation failed: {e}")
            return None
