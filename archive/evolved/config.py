"""
Configuration module for docker_fix.

This module handles configuration loading and management for the docker_fix tool,
including environment variables, config files, and default settings.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class DockerFixConfig:
    """Configuration class for docker_fix settings."""
    
    # Docker settings
    docker_host: str = "unix://var/run/docker.sock"
    docker_timeout: int = 30
    docker_api_version: str = "auto"
    
    # Logging settings
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_file: Optional[str] = None
    
    # Fix settings
    auto_fix: bool = False
    backup_before_fix: bool = True
    max_retries: int = 3
    retry_delay: int = 5
    
    # Container settings
    stop_timeout: int = 10
    remove_anonymous_volumes: bool = False
    force_recreate: bool = False
    
    # Network settings
    cleanup_networks: bool = True
    preserve_custom_networks: bool = True
    
    # Volume settings
    cleanup_volumes: bool = False
    preserve_named_volumes: bool = True
    
    # Image settings
    cleanup_images: bool = False
    preserve_tagged_images: bool = True
    image_cleanup_days: int = 7
    
    # Monitoring settings
    health_check_interval: int = 30
    health_check_timeout: int = 10
    health_check_retries: int = 3
    
    # Output settings
    output_format: str = "table"  # table, json, yaml
    show_timestamps: bool = True
    color_output: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DockerFixConfig':
        """Create config from dictionary."""
        try:
            # Filter out unknown keys
            valid_keys = {field.name for field in cls.__dataclass_fields__.values()}
            filtered_data = {k: v for k, v in data.items() if k in valid_keys}
            return cls(**filtered_data)
        except TypeError as e:
            raise ConfigError(f"Invalid configuration data: {e}")


class ConfigError(Exception):
    """Configuration-related errors."""
    pass


class ConfigManager:
    """Manages configuration loading and saving."""
    
    DEFAULT_CONFIG_PATHS = [
        Path.home() / ".docker_fix" / "config.json",
        Path.cwd() / "docker_fix.json",
        Path("/etc/docker_fix/config.json"),
    ]
    
    ENV_PREFIX = "DOCKER_FIX_"
    
    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        """Initialize configuration manager.
        
        Args:
            config_path: Optional path to configuration file
        """
        self.config_path = Path(config_path) if config_path else None
        self._config: Optional[DockerFixConfig] = None
    
    def load_config(self) -> DockerFixConfig:
        """Load configuration from various sources.
        
        Returns:
            DockerFixConfig: Loaded configuration
            
        Raises:
            ConfigError: If configuration cannot be loaded
        """
        try:
            # Start with default config
            config_data = {}
            
            # Load from file
            file_config = self._load_from_file()
            if file_config:
                config_data.update(file_config)
            
            # Override with environment variables
            env_config = self._load_from_env()
            config_data.update(env_config)
            
            # Create config object
            self._config = DockerFixConfig.from_dict(config_data)
            
            logger.info("Configuration loaded successfully")
            return self._config
            
        except Exception as e:
            raise ConfigError(f"Failed to load configuration: {e}")
    
    def save_config(self, config: DockerFixConfig) -> None:
        """Save configuration to file.
        
        Args:
            config: Configuration to save
            
        Raises:
            ConfigError: If configuration cannot be saved
        """
        try:
            config_path = self._get_save_path()
            config_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(config_path, 'w') as f:
                json.dump(config.to_dict(), f, indent=2)
            
            logger.info(f"Configuration saved to {config_path}")
            
        except Exception as e:
            raise ConfigError(f"Failed to save configuration: {e}")
    
    def get_config(self) -> DockerFixConfig:
        """Get current configuration.
        
        Returns:
            DockerFixConfig: Current configuration
        """
        if self._config is None:
            self._config = self.load_config()
        return self._config
    
    def _load_from_file(self) -> Dict[str, Any]:
        """Load configuration from file.
        
        Returns:
            Dict[str, Any]: Configuration data from file
        """
        config_path = self._find_config_file()
        if not config_path:
            logger.debug("No configuration file found")
            return {}
        
        try:
            with open(config_path, 'r') as f:
                data = json.load(f)
            
            logger.debug(f"Configuration loaded from {config_path}")
            return data
            
        except json.JSONDecodeError as e:
            raise ConfigError(f"Invalid JSON in config file {config_path}: {e}")
        except Exception as e:
            raise ConfigError(f"Failed to read config file {config_path}: {e}")
    
    def _load_from_env(self) -> Dict[str, Any]:
        """Load configuration from environment variables.
        
        Returns:
            Dict[str, Any]: Configuration data from environment
        """
        config_data = {}
        
        for key, value in os.environ.items():
            if key.startswith(self.ENV_PREFIX):
                # Convert environment variable name to config key
                config_key = key[len(self.ENV_PREFIX):].lower()
                
                # Convert value to appropriate type
                try:
                    # Try to parse as JSON first (for complex values)
                    parsed_value = json.loads(value)
                except json.JSONDecodeError:
                    # Fall back to string/boolean/integer parsing
                    parsed_value = self._parse_env_value(value)
                
                config_data[config_key] = parsed_value
        
        if config_data:
            logger.debug(f"Configuration loaded from environment: {list(config_data.keys())}")
        
        return config_data
    
    def _parse_env_value(self, value: str) -> Union[str, int, bool]:
        """Parse environment variable value.
        
        Args:
            value: Raw environment variable value
            
        Returns:
            Union[str, int, bool]: Parsed value
        """
        # Boolean values
        if value.lower() in ('true', '1', 'yes', 'on'):
            return True
        if value.lower() in ('false', '0', 'no', 'off'):
            return False
        
        # Integer values
        try:
            return int(value)
        except ValueError:
            pass
        
        # String values
        return value
    
    def _find_config_file(self) -> Optional[Path]:
        """Find configuration file.
        
        Returns:
            Optional[Path]: Path to configuration file if found
        """
        # Check explicit path first
        if self.config_path and self.config_path.exists():
            return self.config_path
        
        # Check default paths
        for path in self.DEFAULT_CONFIG_PATHS:
            if path.exists():
                return path
        
        return None
    
    def _get_save_path(self) -> Path:
        """Get path for saving configuration.
        
        Returns:
            Path: Path to save configuration
        """
        if self.config_path:
            return self.config_path
        
        return self.DEFAULT_CONFIG_PATHS[0]


# Global configuration manager instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager(config_path: Optional[Union[str, Path]] = None) -> ConfigManager:
    """Get global configuration manager instance.
    
    Args:
        config_path: Optional path to configuration file
        
    Returns:
        ConfigManager: Configuration manager instance
    """
    global _config_manager
    
    if _config_manager is None or config_path:
        _config_manager = ConfigManager(config_path)
    
    return _config_manager


def get_config() -> DockerFixConfig:
    """Get current configuration.
    
    Returns:
        DockerFixConfig: Current configuration
    """
    return get_config_manager().get_config()


def load_config(config_path: Optional[Union[str, Path]] = None) -> DockerFixConfig:
    """Load configuration from file and environment.
    
    Args:
        config_path: Optional path to configuration file
        
    Returns:
        DockerFixConfig: Loaded configuration
    """
    manager = get_config_manager(config_path)
    return manager.load_config()


def save_config(config: DockerFixConfig, config_path: Optional[Union[str, Path]] = None) -> None:
    """Save configuration to file.
    
    Args:
        config: Configuration to save
        config_path: Optional path to save configuration
    """
    manager = get_config_manager(config_path)
    manager.save_config(config)
