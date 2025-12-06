"""
ONNX Model Support for v4.8
Cross-platform ML model format for production deployment
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ModelMetadata:
    """ONNX model metadata"""
    model_name: str
    version: str
    framework: str  # sklearn, tensorflow, pytorch, etc.
    input_shape: Tuple[int, ...]
    output_shape: Tuple[int, ...]
    created_at: str
    converted_at: str
    input_types: List[str]
    output_types: List[str]
    opset_version: int = 14


class ONNXModelConverter:
    """Convert ML models to ONNX format"""
    
    def __init__(self):
        self.supported_frameworks = {
            'sklearn': self._convert_sklearn,
            'tensorflow': self._convert_tensorflow,
            'pytorch': self._convert_pytorch,
            'xgboost': self._convert_xgboost,
        }
        
    def convert_from_sklearn(
        self,
        sklearn_model: Any,
        input_shape: Tuple[int, ...],
        model_name: str = "sklearn_model"
    ) -> Tuple[bytes, ModelMetadata]:
        """Convert scikit-learn model to ONNX"""
        try:
            import skl2onnx
            from skl2onnx.common.data_types import FloatTensorType
            
            # Define initial types
            initial_type = [('float_input', FloatTensorType(input_shape))]
            
            # Convert
            onnx_model = skl2onnx.convert_sklearn(sklearn_model, initial_types=initial_type)
            
            # Serialize
            onnx_bytes = onnx_model.SerializeToString()
            
            # Create metadata
            metadata = ModelMetadata(
                model_name=model_name,
                version="1.0.0",
                framework="sklearn",
                input_shape=input_shape,
                output_shape=(input_shape[0], 1),  # Assume single output
                created_at=str(__import__('datetime').datetime.now()),
                converted_at=str(__import__('datetime').datetime.now()),
                input_types=['float32'],
                output_types=['float32']
            )
            
            logger.info(f"Converted sklearn model to ONNX: {model_name}")
            return onnx_bytes, metadata
            
        except ImportError:
            logger.error("skl2onnx not installed. Install with: pip install skl2onnx")
            raise
        except Exception as e:
            logger.error(f"Error converting sklearn model: {e}")
            raise
    
    def convert_from_tensorflow(
        self,
        tf_model: Any,
        model_name: str = "tensorflow_model"
    ) -> Tuple[bytes, ModelMetadata]:
        """Convert TensorFlow model to ONNX"""
        try:
            import tf2onnx
            
            # Convert to ONNX
            onnx_model, _ = tf2onnx.convert.from_keras(tf_model)
            
            # Serialize
            onnx_bytes = onnx_model.SerializeToString()
            
            # Create metadata
            metadata = ModelMetadata(
                model_name=model_name,
                version="1.0.0",
                framework="tensorflow",
                input_shape=(None, *tf_model.input_shape[1:]),
                output_shape=(None, *tf_model.output_shape[1:]),
                created_at=str(__import__('datetime').datetime.now()),
                converted_at=str(__import__('datetime').datetime.now()),
                input_types=['float32'],
                output_types=['float32']
            )
            
            logger.info(f"Converted TensorFlow model to ONNX: {model_name}")
            return onnx_bytes, metadata
            
        except ImportError:
            logger.error("tf2onnx not installed. Install with: pip install tf2onnx")
            raise
        except Exception as e:
            logger.error(f"Error converting TensorFlow model: {e}")
            raise
    
    def convert_from_pytorch(
        self,
        pytorch_model: Any,
        example_input: np.ndarray,
        model_name: str = "pytorch_model"
    ) -> Tuple[bytes, ModelMetadata]:
        """Convert PyTorch model to ONNX"""
        try:
            import torch
            import io
            
            # Convert to ONNX
            dummy_input = torch.from_numpy(example_input).float()
            
            onnx_buffer = io.BytesIO()
            torch.onnx.export(
                pytorch_model,
                dummy_input,
                onnx_buffer,
                verbose=False,
                input_names=['input'],
                output_names=['output'],
                opset_version=14
            )
            
            onnx_bytes = onnx_buffer.getvalue()
            
            # Create metadata
            metadata = ModelMetadata(
                model_name=model_name,
                version="1.0.0",
                framework="pytorch",
                input_shape=example_input.shape,
                output_shape=(example_input.shape[0], 1),
                created_at=str(__import__('datetime').datetime.now()),
                converted_at=str(__import__('datetime').datetime.now()),
                input_types=['float32'],
                output_types=['float32']
            )
            
            logger.info(f"Converted PyTorch model to ONNX: {model_name}")
            return onnx_bytes, metadata
            
        except ImportError:
            logger.error("torch not installed. Install with: pip install torch")
            raise
        except Exception as e:
            logger.error(f"Error converting PyTorch model: {e}")
            raise
    
    def _convert_sklearn(self, *args, **kwargs):
        return self.convert_from_sklearn(*args, **kwargs)
    
    def _convert_tensorflow(self, *args, **kwargs):
        return self.convert_from_tensorflow(*args, **kwargs)
    
    def _convert_pytorch(self, *args, **kwargs):
        return self.convert_from_pytorch(*args, **kwargs)
    
    def _convert_xgboost(self, *args, **kwargs):
        raise NotImplementedError("XGBoost conversion coming in v4.8.1")


class ONNXModelInference:
    """ONNX model inference engine"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.metadata: Dict[str, ModelMetadata] = {}
        self.session = None
        self._init_onnx_runtime()
        
    def _init_onnx_runtime(self) -> bool:
        """Initialize ONNX Runtime"""
        try:
            import onnxruntime as rt
            logger.info("ONNX Runtime initialized")
            return True
        except ImportError:
            logger.warning("onnxruntime not installed. Install with: pip install onnxruntime")
            return False
    
    def load_model(
        self,
        model_name: str,
        onnx_bytes: bytes,
        metadata: ModelMetadata
    ) -> bool:
        """Load ONNX model"""
        try:
            import onnxruntime as rt
            import io
            
            # Load from bytes
            session = rt.InferenceSession(
                io.BytesIO(onnx_bytes).read(),
                providers=['CPUExecutionProvider']
            )
            
            self.models[model_name] = session
            self.metadata[model_name] = metadata
            
            logger.info(f"Loaded ONNX model: {model_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading ONNX model: {e}")
            return False
    
    def predict(
        self,
        model_name: str,
        input_data: np.ndarray
    ) -> Optional[np.ndarray]:
        """Run inference on ONNX model"""
        try:
            if model_name not in self.models:
                logger.error(f"Model not found: {model_name}")
                return None
            
            session = self.models[model_name]
            input_name = session.get_inputs()[0].name
            output_name = session.get_outputs()[0].name
            
            # Ensure correct dtype
            input_data = input_data.astype('float32')
            
            # Run inference
            result = session.run(
                [output_name],
                {input_name: input_data}
            )
            
            return np.array(result[0])
            
        except Exception as e:
            logger.error(f"Error running inference: {e}")
            return None
    
    def get_model_info(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get ONNX model information"""
        if model_name not in self.models:
            return None
        
        session = self.models[model_name]
        metadata = self.metadata.get(model_name)
        
        return {
            'name': model_name,
            'metadata': {
                'model_name': metadata.model_name,
                'version': metadata.version,
                'framework': metadata.framework,
                'opset_version': metadata.opset_version
            },
            'inputs': [
                {
                    'name': input.name,
                    'shape': input.shape,
                    'type': input.type
                }
                for input in session.get_inputs()
            ],
            'outputs': [
                {
                    'name': output.name,
                    'shape': output.shape,
                    'type': output.type
                }
                for output in session.get_outputs()
            ]
        }
    
    def get_all_models(self) -> List[str]:
        """List all loaded models"""
        return list(self.models.keys())
    
    def unload_model(self, model_name: str) -> bool:
        """Unload model"""
        if model_name in self.models:
            del self.models[model_name]
            if model_name in self.metadata:
                del self.metadata[model_name]
            logger.info(f"Unloaded model: {model_name}")
            return True
        return False


class ONNXModelRegistry:
    """Registry for ONNX models with versioning"""
    
    def __init__(self):
        self.registry: Dict[str, List[Tuple[str, bytes, ModelMetadata]]] = {}
        
    def register_model(
        self,
        model_name: str,
        version: str,
        onnx_bytes: bytes,
        metadata: ModelMetadata
    ) -> None:
        """Register model version"""
        if model_name not in self.registry:
            self.registry[model_name] = []
        
        self.registry[model_name].append((version, onnx_bytes, metadata))
        logger.info(f"Registered {model_name} v{version}")
    
    def get_latest_version(self, model_name: str) -> Optional[Tuple[str, bytes, ModelMetadata]]:
        """Get latest model version"""
        if model_name not in self.registry or not self.registry[model_name]:
            return None
        
        # Sort by version (simple string sort for demo)
        versions = sorted(self.registry[model_name], key=lambda x: x[0], reverse=True)
        return versions[0]
    
    def get_version(
        self,
        model_name: str,
        version: str
    ) -> Optional[Tuple[str, bytes, ModelMetadata]]:
        """Get specific model version"""
        if model_name not in self.registry:
            return None
        
        for v, onnx_bytes, metadata in self.registry[model_name]:
            if v == version:
                return (v, onnx_bytes, metadata)
        
        return None
    
    def list_versions(self, model_name: str) -> List[str]:
        """List all versions of model"""
        if model_name not in self.registry:
            return []
        
        return [v for v, _, _ in self.registry[model_name]]
    
    def get_registry_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        stats = {
            'total_models': len(self.registry),
            'total_versions': sum(len(versions) for versions in self.registry.values()),
            'models': {}
        }
        
        for model_name, versions in self.registry.items():
            stats['models'][model_name] = {
                'versions': len(versions),
                'latest': versions[-1][0] if versions else None
            }
        
        return stats


# Global instances
_converter = None
_inference_engine = None
_model_registry = None


def get_onnx_converter() -> ONNXModelConverter:
    """Get ONNX converter instance"""
    global _converter
    if _converter is None:
        _converter = ONNXModelConverter()
    return _converter


def get_onnx_inference() -> ONNXModelInference:
    """Get ONNX inference engine"""
    global _inference_engine
    if _inference_engine is None:
        _inference_engine = ONNXModelInference()
    return _inference_engine


def get_model_registry() -> ONNXModelRegistry:
    """Get model registry"""
    global _model_registry
    if _model_registry is None:
        _model_registry = ONNXModelRegistry()
    return _model_registry
