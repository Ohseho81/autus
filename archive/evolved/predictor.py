"""
Predictor model for the prediction engine.

This module contains the base predictor class and implementations for
various prediction algorithms used in the worlds prediction system.
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """Container for prediction results."""
    
    value: Union[float, int, str, List[Any]]
    confidence: float
    timestamp: datetime
    metadata: Dict[str, Any]
    
    def __post_init__(self) -> None:
        """Validate prediction result after initialization."""
        if not 0 <= self.confidence <= 1:
            raise ValueError("Confidence must be between 0 and 1")


@dataclass
class PredictionInput:
    """Container for prediction input data."""
    
    features: Dict[str, Any]
    timestamp: datetime
    context: Optional[Dict[str, Any]] = None
    
    def __post_init__(self) -> None:
        """Validate input data after initialization."""
        if not self.features:
            raise ValueError("Features cannot be empty")


class BasePredictorError(Exception):
    """Base exception for predictor errors."""
    pass


class PredictionError(BasePredictorError):
    """Exception raised during prediction process."""
    pass


class ModelNotTrainedError(BasePredictorError):
    """Exception raised when trying to predict with untrained model."""
    pass


class BasePredictor(ABC):
    """
    Abstract base class for all predictors in the prediction engine.
    
    This class defines the interface that all predictors must implement
    and provides common functionality for prediction models.
    """
    
    def __init__(
        self,
        model_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Initialize the base predictor.
        
        Args:
            model_id: Unique identifier for the model
            config: Configuration parameters for the predictor
            
        Raises:
            ValueError: If model_id is empty
        """
        if not model_id:
            raise ValueError("Model ID cannot be empty")
            
        self.model_id = model_id
        self.config = config or {}
        self.is_trained = False
        self.last_training_time: Optional[datetime] = None
        self.prediction_count = 0
        self._model_data: Optional[Any] = None
        
        logger.info(f"Initialized predictor {self.model_id}")
    
    @abstractmethod
    def train(
        self,
        training_data: List[Dict[str, Any]],
        validation_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Train the predictor model.
        
        Args:
            training_data: List of training examples
            validation_data: Optional validation dataset
            
        Returns:
            Training metrics and metadata
            
        Raises:
            PredictionError: If training fails
        """
        pass
    
    @abstractmethod
    def predict(self, input_data: PredictionInput) -> PredictionResult:
        """
        Make a prediction using the trained model.
        
        Args:
            input_data: Input data for prediction
            
        Returns:
            Prediction result with confidence score
            
        Raises:
            ModelNotTrainedError: If model hasn't been trained
            PredictionError: If prediction fails
        """
        pass
    
    def batch_predict(
        self,
        inputs: List[PredictionInput]
    ) -> List[PredictionResult]:
        """
        Make predictions for multiple inputs.
        
        Args:
            inputs: List of input data for predictions
            
        Returns:
            List of prediction results
            
        Raises:
            ModelNotTrainedError: If model hasn't been trained
            PredictionError: If any prediction fails
        """
        if not self.is_trained:
            raise ModelNotTrainedError(f"Model {self.model_id} is not trained")
        
        results = []
        for input_data in inputs:
            try:
                result = self.predict(input_data)
                results.append(result)
            except Exception as e:
                logger.error(f"Batch prediction failed for input: {e}")
                raise PredictionError(f"Batch prediction failed: {e}") from e
        
        return results
    
    def validate_input(self, input_data: PredictionInput) -> bool:
        """
        Validate input data before prediction.
        
        Args:
            input_data: Input data to validate
            
        Returns:
            True if input is valid
            
        Raises:
            ValueError: If input is invalid
        """
        if not input_data.features:
            raise ValueError("Input features cannot be empty")
        
        required_features = self.config.get('required_features', [])
        for feature in required_features:
            if feature not in input_data.features:
                raise ValueError(f"Required feature '{feature}' not found in input")
        
        return True
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the model.
        
        Returns:
            Dictionary containing model metadata
        """
        return {
            'model_id': self.model_id,
            'is_trained': self.is_trained,
            'last_training_time': self.last_training_time,
            'prediction_count': self.prediction_count,
            'config': self.config
        }
    
    def save_model(self, filepath: str) -> None:
        """
        Save the trained model to file.
        
        Args:
            filepath: Path to save the model
            
        Raises:
            ModelNotTrainedError: If model hasn't been trained
            PredictionError: If saving fails
        """
        if not self.is_trained:
            raise ModelNotTrainedError("Cannot save untrained model")
        
        try:
            # Implementation would depend on specific model type
            logger.info(f"Model {self.model_id} saved to {filepath}")
        except Exception as e:
            raise PredictionError(f"Failed to save model: {e}") from e
    
    def load_model(self, filepath: str) -> None:
        """
        Load a trained model from file.
        
        Args:
            filepath: Path to load the model from
            
        Raises:
            PredictionError: If loading fails
        """
        try:
            # Implementation would depend on specific model type
            self.is_trained = True
            logger.info(f"Model {self.model_id} loaded from {filepath}")
        except Exception as e:
            raise PredictionError(f"Failed to load model: {e}") from e


class LinearPredictor(BasePredictor):
    """
    Linear regression predictor implementation.
    
    Simple predictor that uses linear regression for numeric predictions.
    """
    
    def __init__(
        self,
        model_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> None:
        """Initialize linear predictor."""
        super().__init__(model_id, config)
        self.coefficients: Optional[np.ndarray] = None
        self.intercept: float = 0.0
        self.feature_names: List[str] = []
    
    def train(
        self,
        training_data: List[Dict[str, Any]],
        validation_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Train the linear predictor.
        
        Args:
            training_data: List of training examples with 'features' and 'target'
            validation_data: Optional validation dataset
            
        Returns:
            Training metrics including RMSE and R²
            
        Raises:
            PredictionError: If training fails
        """
        try:
            if not training_data:
                raise ValueError("Training data cannot be empty")
            
            # Extract features and targets
            features_list = []
            targets = []
            
            for example in training_data:
                if 'features' not in example or 'target' not in example:
                    raise ValueError("Training data must contain 'features' and 'target'")
                
                features = example['features']
                if not self.feature_names:
                    self.feature_names = sorted(features.keys())
                
                feature_vector = [features.get(name, 0.0) for name in self.feature_names]
                features_list.append(feature_vector)
                targets.append(float(example['target']))
            
            X = np.array(features_list)
            y = np.array(targets)
            
            # Simple linear regression using normal equation
            X_with_intercept = np.column_stack([np.ones(X.shape[0]), X])
            coeffs = np.linalg.pinv(X_with_intercept.T @ X_with_intercept) @ X_with_intercept.T @ y
            
            self.intercept = coeffs[0]
            self.coefficients = coeffs[1:]
            
            # Calculate training metrics
            predictions = X_with_intercept @ coeffs
            mse = np.mean((y - predictions) ** 2)
            rmse = np.sqrt(mse)
            r_squared = 1 - (np.sum((y - predictions) ** 2) / np.sum((y - np.mean(y)) ** 2))
            
            self.is_trained = True
            self.last_training_time = datetime.now()
            
            logger.info(f"Linear predictor {self.model_id} trained successfully")
            
            return {
                'rmse': rmse,
                'r_squared': r_squared,
                'training_samples': len(training_data)
            }
            
        except Exception as e:
            logger.error(f"Training failed for {self.model_id}: {e}")
            raise PredictionError(f"Training failed: {e}") from e
    
    def predict(self, input_data: PredictionInput) -> PredictionResult:
        """
        Make a linear prediction.
        
        Args:
            input_data: Input features for prediction
            
        Returns:
            Prediction result with linear regression output
            
        Raises:
            ModelNotTrainedError: If model hasn't been trained
            PredictionError: If prediction fails
        """
        if not self.is_trained or self.coefficients is None:
            raise ModelNotTrainedError(f"Model {self.model_id} is not trained")
        
        try:
            self.validate_input(input_data)
            
            # Extract feature vector
            feature_vector = [
                input_data.features.get(name, 0.0) 
                for name in self.feature_names
            ]
            
            # Make prediction
            prediction = self.intercept + np.dot(self.coefficients, feature_vector)
            
            # Simple confidence based on feature variance
            confidence = min(0.9, max(0.1, 1.0 / (1.0 + abs(prediction))))
            
            self.prediction_count += 1
            
            return PredictionResult(
                value=float(prediction),
                confidence=confidence,
                timestamp=datetime.now(),
                metadata={
                    'model_id': self.model_id,
                    'feature_names': self.feature_names,
                    'coefficients': self.coefficients.tolist()
                }
            )
            
        except Exception as e:
            logger.error(f"Prediction failed for {self.model_id}: {e}")
            raise PredictionError(f"Prediction failed: {e}") from e


class EnsemblePredictor(BasePredictor):
    """
    Ensemble predictor that combines multiple base predictors.
    
    Uses weighted averaging to combine predictions from multiple models.
    """
    
    def __init__(
        self,
        model_id: str,
        base_predictors: List[BasePredictor],
        config: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Initialize ensemble predictor.
        
        Args:
            model_id: Unique identifier for ensemble
            base_predictors: List of base predictors to ensemble
            config: Configuration including weights
        """
        super().__init__(model_id, config)
        self.base_predictors = base_predictors
        self.weights = config.get('weights', [1.0] * len(base_predictors))
        
        if len(self.weights) != len(base_predictors):
            raise ValueError("Number of weights must match number of predictors")
        
        # Normalize weights
        total_weight = sum(self.weights)
        self.weights = [w / total_weight for w in self.weights]
    
    def train(
        self,
        training_data: List[Dict[str, Any]],
        validation_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Train all base predictors in the ensemble.
        
        Args:
            training_data: Training dataset
            validation_data: Optional validation dataset
            
        Returns:
            Combined training metrics from all predictors
        """
        try:
            metrics = {}
            
            for i, predictor in enumerate(self.base_predictors):
                logger.info(f"Training base predictor {i}: {predictor.model_id}")
                predictor_metrics = predictor.train(training_data, validation_data)
                metrics[f'predictor_{i}'] = predictor_metrics
            
            self.is_trained = all(p.is_trained for p in self.base_predictors)
            self.last_training_time = datetime.now()
            
            return {
                'ensemble_trained': self.is_trained,
                'base_predictor_metrics': metrics
            }
            
        except Exception as e:
            logger.error(f"Ensemble training failed: {e}")
            raise PredictionError(f"Ensemble training failed: {e}") from e
    
    def predict(self, input_data: PredictionInput) -> PredictionResult:
        """
        Make ensemble prediction by combining base predictor outputs.
        
        Args:
            input_data: Input data for prediction
            
        Returns:
            Weighted ensemble prediction result
        """
        if not self.is_trained:
            raise ModelNotTrainedError(f"Ensemble {self.model_id} is not trained")
        
        try:
            predictions = []
            confidences = []
            
            # Get predictions from all base predictors
            for predictor in self.base_predictors:
                result = predictor.predict(input_data)
                predictions.append(result.value)
                confidences.append(result.confidence)
            
            # Weighted average of predictions
            ensemble_prediction = sum(
                pred * weight 
                for pred, weight in zip(predictions, self.weights)
            )
            
            # Weighted average of confidences
            ensemble_confidence = sum(
                conf * weight 
                for conf, weight in zip(confidences, self.weights)
            )
            
            self.prediction_count += 1
            
            return PredictionResult(
                value=ensemble_prediction,
                confidence=ensemble_confidence,
                timestamp=datetime.now(),
                metadata={
                    'ensemble_id': self.model_id,
                    'base_predictions': predictions,
                    'base_confidences': confidences,
                    'weights': self.weights
                }
            )
            
        except Exception as e:
            logger.error(f"Ensemble prediction failed: {e}")
            raise PredictionError(f"Ensemble prediction failed: {e}") from e
