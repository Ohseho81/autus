"""
Core prediction engine module providing the main prediction functionality.
"""

from typing import Dict, List, Optional, Any, Union, Tuple
from abc import ABC, abstractmethod
import logging
from dataclasses import dataclass
from enum import Enum
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class PredictionStatus(Enum):
    """Enumeration of prediction statuses."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class PredictionResult:
    """Data class representing a prediction result."""
    prediction_id: str
    values: Union[float, List[float], np.ndarray]
    confidence: float
    timestamp: datetime
    status: PredictionStatus
    model_version: str
    metadata: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


@dataclass
class PredictionRequest:
    """Data class representing a prediction request."""
    request_id: str
    input_data: Dict[str, Any]
    model_name: str
    parameters: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __post_init__(self) -> None:
        """Initialize timestamp if not provided."""
        if self.timestamp is None:
            self.timestamp = datetime.now()


class BasePredictor(ABC):
    """Abstract base class for all predictors."""
    
    def __init__(self, name: str, version: str) -> None:
        """
        Initialize the base predictor.
        
        Args:
            name: Name of the predictor
            version: Version of the predictor
        """
        self.name = name
        self.version = version
        self._is_trained = False
        self._metadata: Dict[str, Any] = {}
    
    @abstractmethod
    def predict(self, input_data: Dict[str, Any]) -> PredictionResult:
        """
        Make a prediction based on input data.
        
        Args:
            input_data: Dictionary containing input features
            
        Returns:
            PredictionResult containing the prediction
            
        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        pass
    
    @abstractmethod
    def train(self, training_data: Dict[str, Any]) -> bool:
        """
        Train the predictor with provided data.
        
        Args:
            training_data: Dictionary containing training data
            
        Returns:
            True if training was successful, False otherwise
            
        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        pass
    
    @abstractmethod
    def validate(self, validation_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Validate the predictor with provided data.
        
        Args:
            validation_data: Dictionary containing validation data
            
        Returns:
            Dictionary containing validation metrics
            
        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        pass
    
    def is_trained(self) -> bool:
        """
        Check if the predictor is trained.
        
        Returns:
            True if trained, False otherwise
        """
        return self._is_trained
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get predictor metadata.
        
        Returns:
            Dictionary containing metadata
        """
        return self._metadata.copy()


class PredictionEngine:
    """Main prediction engine coordinating multiple predictors."""
    
    def __init__(self, engine_id: str = None) -> None:
        """
        Initialize the prediction engine.
        
        Args:
            engine_id: Unique identifier for the engine
        """
        self.engine_id = engine_id or f"engine_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self._predictors: Dict[str, BasePredictor] = {}
        self._prediction_history: List[PredictionResult] = []
        self._max_history_size = 1000
        
    def register_predictor(self, predictor: BasePredictor) -> None:
        """
        Register a predictor with the engine.
        
        Args:
            predictor: Predictor instance to register
            
        Raises:
            ValueError: If predictor name already exists
        """
        if predictor.name in self._predictors:
            raise ValueError(f"Predictor '{predictor.name}' already registered")
        
        self._predictors[predictor.name] = predictor
        logger.info(f"Registered predictor: {predictor.name} v{predictor.version}")
    
    def unregister_predictor(self, predictor_name: str) -> bool:
        """
        Unregister a predictor from the engine.
        
        Args:
            predictor_name: Name of the predictor to unregister
            
        Returns:
            True if successfully unregistered, False if not found
        """
        if predictor_name in self._predictors:
            del self._predictors[predictor_name]
            logger.info(f"Unregistered predictor: {predictor_name}")
            return True
        return False
    
    def get_predictor(self, predictor_name: str) -> Optional[BasePredictor]:
        """
        Get a registered predictor by name.
        
        Args:
            predictor_name: Name of the predictor
            
        Returns:
            Predictor instance if found, None otherwise
        """
        return self._predictors.get(predictor_name)
    
    def list_predictors(self) -> List[str]:
        """
        List all registered predictor names.
        
        Returns:
            List of predictor names
        """
        return list(self._predictors.keys())
    
    def predict(self, request: PredictionRequest) -> PredictionResult:
        """
        Execute a prediction request.
        
        Args:
            request: PredictionRequest containing request details
            
        Returns:
            PredictionResult containing the prediction
            
        Raises:
            ValueError: If predictor not found or not trained
            Exception: If prediction fails
        """
        try:
            predictor = self._predictors.get(request.model_name)
            if predictor is None:
                raise ValueError(f"Predictor '{request.model_name}' not found")
            
            if not predictor.is_trained():
                raise ValueError(f"Predictor '{request.model_name}' is not trained")
            
            # Merge request parameters with input data if provided
            input_data = request.input_data.copy()
            if request.parameters:
                input_data.update(request.parameters)
            
            result = predictor.predict(input_data)
            result.prediction_id = request.request_id
            
            # Store in history
            self._add_to_history(result)
            
            logger.info(f"Prediction completed: {request.request_id}")
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed for request {request.request_id}: {str(e)}")
            error_result = PredictionResult(
                prediction_id=request.request_id,
                values=None,
                confidence=0.0,
                timestamp=datetime.now(),
                status=PredictionStatus.FAILED,
                model_version=predictor.version if predictor else "unknown",
                error_message=str(e)
            )
            self._add_to_history(error_result)
            return error_result
    
    def batch_predict(self, requests: List[PredictionRequest]) -> List[PredictionResult]:
        """
        Execute multiple prediction requests.
        
        Args:
            requests: List of PredictionRequest instances
            
        Returns:
            List of PredictionResult instances
        """
        results = []
        for request in requests:
            try:
                result = self.predict(request)
                results.append(result)
            except Exception as e:
                logger.error(f"Batch prediction failed for request {request.request_id}: {str(e)}")
                error_result = PredictionResult(
                    prediction_id=request.request_id,
                    values=None,
                    confidence=0.0,
                    timestamp=datetime.now(),
                    status=PredictionStatus.FAILED,
                    model_version="unknown",
                    error_message=str(e)
                )
                results.append(error_result)
        
        return results
    
    def get_prediction_history(self, 
                             predictor_name: Optional[str] = None,
                             status_filter: Optional[PredictionStatus] = None,
                             limit: Optional[int] = None) -> List[PredictionResult]:
        """
        Get prediction history with optional filtering.
        
        Args:
            predictor_name: Filter by predictor name
            status_filter: Filter by prediction status
            limit: Maximum number of results to return
            
        Returns:
            List of PredictionResult instances
        """
        history = self._prediction_history.copy()
        
        # Apply filters
        if predictor_name:
            history = [r for r in history if r.prediction_id.startswith(predictor_name)]
        
        if status_filter:
            history = [r for r in history if r.status == status_filter]
        
        # Apply limit
        if limit:
            history = history[-limit:]
        
        return history
    
    def get_engine_stats(self) -> Dict[str, Any]:
        """
        Get engine statistics.
        
        Returns:
            Dictionary containing engine statistics
        """
        total_predictions = len(self._prediction_history)
        successful_predictions = len([r for r in self._prediction_history 
                                    if r.status == PredictionStatus.COMPLETED])
        failed_predictions = len([r for r in self._prediction_history 
                                if r.status == PredictionStatus.FAILED])
        
        return {
            "engine_id": self.engine_id,
            "registered_predictors": len(self._predictors),
            "predictor_names": list(self._predictors.keys()),
            "total_predictions": total_predictions,
            "successful_predictions": successful_predictions,
            "failed_predictions": failed_predictions,
            "success_rate": successful_predictions / total_predictions if total_predictions > 0 else 0.0
        }
    
    def clear_history(self) -> None:
        """Clear prediction history."""
        self._prediction_history.clear()
        logger.info("Prediction history cleared")
    
    def _add_to_history(self, result: PredictionResult) -> None:
        """
        Add a prediction result to history.
        
        Args:
            result: PredictionResult to add
        """
        self._prediction_history.append(result)
        
        # Trim history if it exceeds maximum size
        if len(self._prediction_history) > self._max_history_size:
            self._prediction_history = self._prediction_history[-self._max_history_size:]
