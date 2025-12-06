"""
Machine Learning Pipeline for AUTUS
Model training, prediction, and feature engineering
"""

import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
import numpy as np
from enum import Enum

logger = logging.getLogger(__name__)


class ModelType(str, Enum):
    """ML model types"""
    LINEAR_REGRESSION = "linear_regression"
    RANDOM_FOREST = "random_forest"
    NEURAL_NETWORK = "neural_network"
    CLUSTERING = "clustering"
    ANOMALY_DETECTION = "anomaly_detection"


class MLPipeline:
    """
    Machine Learning pipeline for AUTUS
    Handles feature engineering, model training, and predictions
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_names = {}
    
    def extract_features(
        self,
        events: List[Dict[str, Any]],
        feature_keys: List[str]
    ) -> Tuple[np.ndarray, List[str]]:
        """
        Extract features from events
        
        Args:
            events: List of events
            feature_keys: Keys to extract as features
        
        Returns:
            Feature matrix and feature names
        """
        features = []
        
        for event in events:
            feature_vector = []
            for key in feature_keys:
                value = event.get(key, 0)
                
                # Convert non-numeric to numeric
                if isinstance(value, bool):
                    feature_vector.append(1.0 if value else 0.0)
                elif isinstance(value, str):
                    feature_vector.append(float(len(value)))
                else:
                    try:
                        feature_vector.append(float(value))
                    except (ValueError, TypeError):
                        feature_vector.append(0.0)
            
            features.append(feature_vector)
        
        features_array = np.array(features) if features else np.array([])
        logger.info(f"Extracted features: shape {features_array.shape}")
        
        return features_array, feature_keys
    
    def normalize_features(
        self,
        features: np.ndarray,
        model_name: str = "default"
    ) -> np.ndarray:
        """
        Normalize features using StandardScaler
        
        Args:
            features: Feature matrix
            model_name: Model identifier
        
        Returns:
            Normalized features
        """
        try:
            from sklearn.preprocessing import StandardScaler
            
            if model_name not in self.scalers:
                self.scalers[model_name] = StandardScaler()
                normalized = self.scalers[model_name].fit_transform(features)
            else:
                normalized = self.scalers[model_name].transform(features)
            
            logger.info(f"Features normalized: shape {normalized.shape}")
            return normalized
        
        except ImportError:
            logger.warning("scikit-learn not available. Returning raw features.")
            return features
    
    def train_regression_model(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        model_name: str = "regression",
        model_type: str = "random_forest"
    ) -> bool:
        """
        Train regression model
        
        Args:
            X_train: Training features
            y_train: Training targets
            model_name: Model identifier
            model_type: Type of model
        
        Returns:
            Training success
        """
        try:
            from sklearn.ensemble import RandomForestRegressor
            from sklearn.linear_model import LinearRegression
            
            if model_type == "random_forest":
                model = RandomForestRegressor(n_estimators=100, max_depth=10)
            else:
                model = LinearRegression()
            
            model.fit(X_train, y_train)
            self.models[model_name] = model
            
            logger.info(f"Model trained: {model_name} ({model_type})")
            return True
        
        except ImportError:
            logger.error("scikit-learn not available")
            return False
        except Exception as e:
            logger.error(f"Model training error: {e}")
            return False
    
    def predict(
        self,
        X_test: np.ndarray,
        model_name: str = "regression"
    ) -> Optional[np.ndarray]:
        """
        Make predictions
        
        Args:
            X_test: Test features
            model_name: Model identifier
        
        Returns:
            Predictions
        """
        if model_name not in self.models:
            logger.error(f"Model not found: {model_name}")
            return None
        
        try:
            model = self.models[model_name]
            predictions = model.predict(X_test)
            logger.info(f"Predictions made: {len(predictions)} samples")
            return predictions
        
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return None
    
    def evaluate_model(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        model_name: str = "regression"
    ) -> Dict[str, float]:
        """
        Evaluate model performance
        
        Args:
            X_test: Test features
            y_test: Test targets
            model_name: Model identifier
        
        Returns:
            Metrics
        """
        try:
            from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
            
            predictions = self.predict(X_test, model_name)
            
            if predictions is None:
                return {}
            
            metrics = {
                'mse': mean_squared_error(y_test, predictions),
                'rmse': np.sqrt(mean_squared_error(y_test, predictions)),
                'mae': mean_absolute_error(y_test, predictions),
                'r2': r2_score(y_test, predictions),
            }
            
            logger.info(f"Model evaluation: R² = {metrics['r2']:.3f}, RMSE = {metrics['rmse']:.3f}")
            return metrics
        
        except ImportError:
            logger.error("scikit-learn not available")
            return {}
        except Exception as e:
            logger.error(f"Evaluation error: {e}")
            return {}
    
    def clustering(
        self,
        X: np.ndarray,
        n_clusters: int = 3,
        model_name: str = "clustering"
    ) -> Dict[str, Any]:
        """
        Perform clustering
        
        Args:
            X: Feature matrix
            n_clusters: Number of clusters
            model_name: Model identifier
        
        Returns:
            Clustering results
        """
        try:
            from sklearn.cluster import KMeans
            
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            labels = kmeans.fit_predict(X)
            
            self.models[model_name] = kmeans
            
            logger.info(f"Clustering completed: {n_clusters} clusters")
            
            return {
                'labels': labels.tolist(),
                'centers': kmeans.cluster_centers_.tolist(),
                'inertia': float(kmeans.inertia_),
            }
        
        except ImportError:
            logger.error("scikit-learn not available")
            return {}
        except Exception as e:
            logger.error(f"Clustering error: {e}")
            return {}
    
    def detect_anomalies_ml(
        self,
        X: np.ndarray,
        contamination: float = 0.1,
        model_name: str = "anomaly"
    ) -> Dict[str, Any]:
        """
        Detect anomalies using Isolation Forest
        
        Args:
            X: Feature matrix
            contamination: Expected fraction of anomalies
            model_name: Model identifier
        
        Returns:
            Anomaly detection results
        """
        try:
            from sklearn.ensemble import IsolationForest
            
            iso_forest = IsolationForest(contamination=contamination, random_state=42)
            predictions = iso_forest.fit_predict(X)
            scores = iso_forest.score_samples(X)
            
            self.models[model_name] = iso_forest
            
            anomalies = np.where(predictions == -1)[0].tolist()
            logger.info(f"Anomalies detected: {len(anomalies)} samples")
            
            return {
                'predictions': predictions.tolist(),
                'scores': scores.tolist(),
                'anomaly_indices': anomalies,
                'anomaly_count': len(anomalies),
            }
        
        except ImportError:
            logger.error("scikit-learn not available")
            return {}
        except Exception as e:
            logger.error(f"Anomaly detection error: {e}")
            return {}
    
    def feature_importance(
        self,
        model_name: str = "regression"
    ) -> Dict[str, float]:
        """
        Get feature importance from model
        
        Args:
            model_name: Model identifier
        
        Returns:
            Feature importance scores
        """
        if model_name not in self.models:
            logger.error(f"Model not found: {model_name}")
            return {}
        
        try:
            model = self.models[model_name]
            
            if not hasattr(model, 'feature_importances_'):
                logger.warning(f"Model {model_name} doesn't support feature importance")
                return {}
            
            importance = model.feature_importances_
            feature_names = self.feature_names.get(model_name, [f"feature_{i}" for i in range(len(importance))])
            
            importance_dict = dict(zip(feature_names, importance.tolist()))
            logger.info(f"Feature importance calculated for {len(importance_dict)} features")
            
            return importance_dict
        
        except Exception as e:
            logger.error(f"Feature importance error: {e}")
            return {}
    
    def save_model(self, model_name: str, filepath: str) -> bool:
        """
        Save model to file
        
        Args:
            model_name: Model identifier
            filepath: File path to save to
        
        Returns:
            Success status
        """
        if model_name not in self.models:
            logger.error(f"Model not found: {model_name}")
            return False
        
        try:
            import pickle
            
            with open(filepath, 'wb') as f:
                pickle.dump(self.models[model_name], f)
            
            logger.info(f"Model saved: {filepath}")
            return True
        
        except Exception as e:
            logger.error(f"Model save error: {e}")
            return False
    
    def load_model(self, model_name: str, filepath: str) -> bool:
        """
        Load model from file
        
        Args:
            model_name: Model identifier
            filepath: File path to load from
        
        Returns:
            Success status
        """
        try:
            import pickle
            
            with open(filepath, 'rb') as f:
                self.models[model_name] = pickle.load(f)
            
            logger.info(f"Model loaded: {filepath}")
            return True
        
        except Exception as e:
            logger.error(f"Model load error: {e}")
            return False


# Global ML pipeline instance
_ml_pipeline_instance = None


def get_ml_pipeline() -> MLPipeline:
    """Get or create global ML pipeline"""
    global _ml_pipeline_instance
    if _ml_pipeline_instance is None:
        _ml_pipeline_instance = MLPipeline()
    return _ml_pipeline_instance
