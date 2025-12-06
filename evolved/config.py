"""
config.py

Configuration settings for Reality Stream Minimal - IoT event processing and Digital Twin graph updates.
Contains all configurable parameters, connection strings, and system settings.
"""

import os
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
from pathlib import Path
import logging


@dataclass
class DatabaseConfig:
    """Database connection configuration."""
    host: str
    port: int
    database: str
    username: str
    password: str
    connection_timeout: int = 30
    max_connections: int = 10


@dataclass
class IoTConfig:
    """IoT service configuration."""
    event_hub_connection_string: str
    consumer_group: str
    partition_count: int = 4
    batch_size: int = 100
    max_wait_time: int = 60


@dataclass
class GraphConfig:
    """Digital Twin graph configuration."""
    endpoint: str
    access_key: str
    database_name: str
    container_name: str
    max_retry_attempts: int = 3
    retry_delay: int = 1


@dataclass
class ProcessingConfig:
    """Event processing configuration."""
    max_concurrent_events: int = 50
    event_timeout: int = 30
    batch_processing_enabled: bool = True
    dead_letter_queue_enabled: bool = True


class Config:
    """Main configuration class for Reality Stream Minimal."""
    
    def __init__(self) -> None:
        """Initialize configuration with environment variables and defaults."""
        self._load_environment_variables()
        self._setup_logging()
        
    def _load_environment_variables(self) -> None:
        """Load configuration from environment variables."""
        try:
            # Database Configuration
            self.database = DatabaseConfig(
                host=os.getenv('DB_HOST', 'localhost'),
                port=int(os.getenv('DB_PORT', '5432')),
                database=os.getenv('DB_NAME', 'reality_stream'),
                username=os.getenv('DB_USERNAME', 'admin'),
                password=os.getenv('DB_PASSWORD', ''),
                connection_timeout=int(os.getenv('DB_CONNECTION_TIMEOUT', '30')),
                max_connections=int(os.getenv('DB_MAX_CONNECTIONS', '10'))
            )
            
            # IoT Configuration
            self.iot = IoTConfig(
                event_hub_connection_string=os.getenv('IOT_EVENT_HUB_CONNECTION_STRING', ''),
                consumer_group=os.getenv('IOT_CONSUMER_GROUP', '$Default'),
                partition_count=int(os.getenv('IOT_PARTITION_COUNT', '4')),
                batch_size=int(os.getenv('IOT_BATCH_SIZE', '100')),
                max_wait_time=int(os.getenv('IOT_MAX_WAIT_TIME', '60'))
            )
            
            # Graph Configuration
            self.graph = GraphConfig(
                endpoint=os.getenv('GRAPH_ENDPOINT', ''),
                access_key=os.getenv('GRAPH_ACCESS_KEY', ''),
                database_name=os.getenv('GRAPH_DATABASE_NAME', 'TwinGraph'),
                container_name=os.getenv('GRAPH_CONTAINER_NAME', 'twins'),
                max_retry_attempts=int(os.getenv('GRAPH_MAX_RETRY_ATTEMPTS', '3')),
                retry_delay=int(os.getenv('GRAPH_RETRY_DELAY', '1'))
            )
            
            # Processing Configuration
            self.processing = ProcessingConfig(
                max_concurrent_events=int(os.getenv('PROCESSING_MAX_CONCURRENT_EVENTS', '50')),
                event_timeout=int(os.getenv('PROCESSING_EVENT_TIMEOUT', '30')),
                batch_processing_enabled=os.getenv('PROCESSING_BATCH_ENABLED', 'true').lower() == 'true',
                dead_letter_queue_enabled=os.getenv('PROCESSING_DLQ_ENABLED', 'true').lower() == 'true'
            )
            
        except (ValueError, TypeError) as e:
            raise ConfigurationError(f"Error loading configuration: {e}")
    
    def _setup_logging(self) -> None:
        """Setup logging configuration."""
        self.log_level: str = os.getenv('LOG_LEVEL', 'INFO').upper()
        self.log_format: str = os.getenv(
            'LOG_FORMAT', 
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.log_file: Optional[str] = os.getenv('LOG_FILE')
        
    def validate(self) -> bool:
        """
        Validate configuration settings.
        
        Returns:
            bool: True if configuration is valid
            
        Raises:
            ConfigurationError: If configuration is invalid
        """
        try:
            # Validate required IoT settings
            if not self.iot.event_hub_connection_string:
                raise ConfigurationError("IoT Event Hub connection string is required")
            
            # Validate required Graph settings
            if not self.graph.endpoint:
                raise ConfigurationError("Graph endpoint is required")
            
            if not self.graph.access_key:
                raise ConfigurationError("Graph access key is required")
            
            # Validate database settings
            if not self.database.password:
                logging.warning("Database password is empty")
            
            # Validate numeric ranges
            if self.processing.max_concurrent_events <= 0:
                raise ConfigurationError("Max concurrent events must be positive")
            
            if self.iot.batch_size <= 0:
                raise ConfigurationError("IoT batch size must be positive")
            
            return True
            
        except Exception as e:
            raise ConfigurationError(f"Configuration validation failed: {e}")
    
    def get_connection_string(self, service: str) -> str:
        """
        Get connection string for specified service.
        
        Args:
            service: Service name ('database', 'iot', 'graph')
            
        Returns:
            str: Connection string
            
        Raises:
            ConfigurationError: If service is unknown
        """
        try:
            if service == 'database':
                return (f"postgresql://{self.database.username}:{self.database.password}@"
                       f"{self.database.host}:{self.database.port}/{self.database.database}")
            
            elif service == 'iot':
                return self.iot.event_hub_connection_string
            
            elif service == 'graph':
                return f"AccountEndpoint={self.graph.endpoint};AccountKey={self.graph.access_key};"
            
            else:
                raise ConfigurationError(f"Unknown service: {service}")
                
        except Exception as e:
            raise ConfigurationError(f"Error building connection string for {service}: {e}")
    
    def get_feature_flags(self) -> Dict[str, bool]:
        """
        Get feature flags configuration.
        
        Returns:
            Dict[str, bool]: Feature flags
        """
        return {
            'batch_processing': self.processing.batch_processing_enabled,
            'dead_letter_queue': self.processing.dead_letter_queue_enabled,
            'metrics_enabled': os.getenv('METRICS_ENABLED', 'true').lower() == 'true',
            'health_checks_enabled': os.getenv('HEALTH_CHECKS_ENABLED', 'true').lower() == 'true',
            'telemetry_enabled': os.getenv('TELEMETRY_ENABLED', 'true').lower() == 'true'
        }
    
    def get_retry_policy(self, service: str) -> Dict[str, Union[int, float]]:
        """
        Get retry policy for specified service.
        
        Args:
            service: Service name
            
        Returns:
            Dict[str, Union[int, float]]: Retry policy settings
        """
        base_policy = {
            'max_attempts': 3,
            'base_delay': 1.0,
            'max_delay': 60.0,
            'exponential_base': 2.0
        }
        
        if service == 'graph':
            base_policy.update({
                'max_attempts': self.graph.max_retry_attempts,
                'base_delay': float(self.graph.retry_delay)
            })
        
        return base_policy


class ConfigurationError(Exception):
    """Custom exception for configuration errors."""
    pass


# Global configuration instance
def get_config() -> Config:
    """
    Get global configuration instance.
    
    Returns:
        Config: Configuration instance
    """
    if not hasattr(get_config, '_instance'):
        get_config._instance = Config()
        get_config._instance.validate()
    
    return get_config._instance


# Environment-specific configurations
DEVELOPMENT_CONFIG = {
    'LOG_LEVEL': 'DEBUG',
    'PROCESSING_MAX_CONCURRENT_EVENTS': '10',
    'IOT_BATCH_SIZE': '10'
}

PRODUCTION_CONFIG = {
    'LOG_LEVEL': 'INFO',
    'PROCESSING_MAX_CONCURRENT_EVENTS': '100',
    'IOT_BATCH_SIZE': '500'
}

# Supported IoT device types
SUPPORTED_DEVICE_TYPES: List[str] = [
    'temperature_sensor',
    'humidity_sensor',
    'pressure_sensor',
    'motion_detector',
    'smart_meter',
    'camera',
    'actuator',
    'gateway'
]

# Graph relationship types
TWIN_RELATIONSHIP_TYPES: List[str] = [
    'contains',
    'connectedTo',
    'feeds',
    'controls',
    'monitors',
    'locatedIn'
]
