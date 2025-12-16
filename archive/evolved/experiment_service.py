"""Experiment service for managing A/B tests and experiments in the growth engine."""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from concurrent.futures import ThreadPoolExecutor
import asyncio

logger = logging.getLogger(__name__)


class ExperimentStatus(Enum):
    """Experiment status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ExperimentType(Enum):
    """Experiment type enumeration."""
    AB_TEST = "ab_test"
    MULTIVARIATE = "multivariate"
    FEATURE_FLAG = "feature_flag"
    PERSONALIZATION = "personalization"


@dataclass
class ExperimentVariant:
    """Represents a variant in an experiment."""
    id: str
    name: str
    traffic_allocation: float
    configuration: Dict[str, Any]
    control: bool = False


@dataclass
class ExperimentMetric:
    """Represents a metric being tracked in an experiment."""
    name: str
    type: str
    primary: bool
    target_improvement: Optional[float] = None
    significance_threshold: float = 0.05


@dataclass
class ExperimentResult:
    """Represents experiment results."""
    variant_id: str
    metric_name: str
    value: float
    confidence_interval: tuple[float, float]
    p_value: float
    sample_size: int
    conversion_rate: Optional[float] = None


@dataclass
class Experiment:
    """Represents an A/B test experiment."""
    id: str
    name: str
    description: str
    type: ExperimentType
    status: ExperimentStatus
    variants: List[ExperimentVariant]
    metrics: List[ExperimentMetric]
    traffic_allocation: float
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = None
    updated_at: datetime = None
    target_audience: Optional[Dict[str, Any]] = None
    results: List[ExperimentResult] = None

    def __post_init__(self):
        """Initialize default values."""
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()
        if self.results is None:
            self.results = []


class ExperimentRepository:
    """Repository interface for experiment persistence."""
    
    async def save(self, experiment: Experiment) -> Experiment:
        """Save an experiment."""
        raise NotImplementedError
    
    async def get_by_id(self, experiment_id: str) -> Optional[Experiment]:
        """Get experiment by ID."""
        raise NotImplementedError
    
    async def get_active_experiments(self) -> List[Experiment]:
        """Get all active experiments."""
        raise NotImplementedError
    
    async def update_status(self, experiment_id: str, status: ExperimentStatus) -> bool:
        """Update experiment status."""
        raise NotImplementedError
    
    async def record_event(self, experiment_id: str, variant_id: str, 
                          user_id: str, event_type: str, event_data: Dict[str, Any]) -> bool:
        """Record an experiment event."""
        raise NotImplementedError


class StatisticalEngine:
    """Engine for statistical analysis of experiments."""
    
    def __init__(self):
        """Initialize statistical engine."""
        pass
    
    def calculate_significance(self, control_data: List[float], 
                             variant_data: List[float]) -> Dict[str, float]:
        """Calculate statistical significance between control and variant."""
        try:
            # Placeholder for statistical calculation
            # In reality, would use scipy.stats or similar
            import statistics
            
            control_mean = statistics.mean(control_data) if control_data else 0
            variant_mean = statistics.mean(variant_data) if variant_data else 0
            
            # Simplified calculation - would need proper t-test or chi-square
            improvement = ((variant_mean - control_mean) / control_mean * 100) if control_mean > 0 else 0
            
            return {
                'control_mean': control_mean,
                'variant_mean': variant_mean,
                'improvement': improvement,
                'p_value': 0.05,  # Placeholder
                'significant': abs(improvement) > 5  # Simplified threshold
            }
            
        except Exception as e:
            logger.error(f"Error calculating significance: {e}")
            return {
                'control_mean': 0,
                'variant_mean': 0,
                'improvement': 0,
                'p_value': 1.0,
                'significant': False
            }
    
    def calculate_sample_size(self, baseline_rate: float, minimum_effect: float,
                            significance_level: float = 0.05, power: float = 0.8) -> int:
        """Calculate required sample size for experiment."""
        try:
            # Simplified sample size calculation
            # In reality, would use proper statistical formulas
            base_size = int(1000 / (minimum_effect / 100))
            return max(base_size, 100)  # Minimum 100 samples
            
        except Exception as e:
            logger.error(f"Error calculating sample size: {e}")
            return 1000  # Default sample size


class ExperimentService:
    """Service for managing experiments and A/B tests."""
    
    def __init__(self, repository: ExperimentRepository):
        """Initialize experiment service."""
        self.repository = repository
        self.statistical_engine = StatisticalEngine()
        self._active_experiments_cache: Dict[str, Experiment] = {}
        self._cache_updated: Optional[datetime] = None
        self._cache_ttl = timedelta(minutes=5)
    
    async def create_experiment(self, name: str, description: str,
                              experiment_type: ExperimentType,
                              variants: List[Dict[str, Any]],
                              metrics: List[Dict[str, Any]],
                              traffic_allocation: float = 1.0,
                              target_audience: Optional[Dict[str, Any]] = None) -> Experiment:
        """Create a new experiment."""
        try:
            # Validate traffic allocation
            if not 0 < traffic_allocation <= 1.0:
                raise ValueError("Traffic allocation must be between 0 and 1")
            
            # Create experiment variants
            experiment_variants = []
            total_variant_allocation = 0
            
            for i, variant_data in enumerate(variants):
                variant = ExperimentVariant(
                    id=str(uuid.uuid4()),
                    name=variant_data.get('name', f'Variant {i+1}'),
                    traffic_allocation=variant_data.get('traffic_allocation', 1.0 / len(variants)),
                    configuration=variant_data.get('configuration', {}),
                    control=variant_data.get('control', i == 0)
                )
                experiment_variants.append(variant)
                total_variant_allocation += variant.traffic_allocation
            
            # Validate variant allocation
            if abs(total_variant_allocation - 1.0) > 0.01:
                raise ValueError("Variant traffic allocations must sum to 1.0")
            
            # Create experiment metrics
            experiment_metrics = []
            for metric_data in metrics:
                metric = ExperimentMetric(
                    name=metric_data['name'],
                    type=metric_data.get('type', 'conversion'),
                    primary=metric_data.get('primary', False),
                    target_improvement=metric_data.get('target_improvement'),
                    significance_threshold=metric_data.get('significance_threshold', 0.05)
                )
                experiment_metrics.append(metric)
            
            # Create experiment
            experiment = Experiment(
                id=str(uuid.uuid4()),
                name=name,
                description=description,
                type=experiment_type,
                status=ExperimentStatus.DRAFT,
                variants=experiment_variants,
                metrics=experiment_metrics,
                traffic_allocation=traffic_allocation,
                target_audience=target_audience
            )
            
            # Save experiment
            saved_experiment = await self.repository.save(experiment)
            logger.info(f"Created experiment: {saved_experiment.id}")
            
            return saved_experiment
            
        except Exception as e:
            logger.error(f"Error creating experiment: {e}")
            raise
    
    async def start_experiment(self, experiment_id: str,
                             duration_days: Optional[int] = None) -> bool:
        """Start an experiment."""
        try:
            experiment = await self.repository.get_by_id(experiment_id)
            if not experiment:
                raise ValueError(f"Experiment {experiment_id} not found")
            
            if experiment.status != ExperimentStatus.DRAFT:
                raise ValueError(f"Cannot start experiment in {experiment.status.value} status")
            
            # Set start and end dates
            start_date = datetime.utcnow()
            end_date = None
            if duration_days:
                end_date = start_date + timedelta(days=duration_days)
            
            experiment.start_date = start_date
            experiment.end_date = end_date
            experiment.status = ExperimentStatus.ACTIVE
            experiment.updated_at = datetime.utcnow()
            
            # Update experiment
            await self.repository.save(experiment)
            await self.repository.update_status(experiment_id, ExperimentStatus.ACTIVE)
            
            # Clear cache
            self._clear_cache()
            
            logger.info(f"Started experiment: {experiment_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting experiment {experiment_id}: {e}")
            raise
    
    async def stop_experiment(self, experiment_id: str) -> bool:
        """Stop an experiment."""
        try:
            success = await self.repository.update_status(experiment_id, ExperimentStatus.COMPLETED)
            if success:
                self._clear_cache()
                logger.info(f"Stopped experiment: {experiment_id}")
            return success
            
        except Exception as e:
            logger.error(f"Error stopping experiment {experiment_id}: {e}")
            raise
    
    async def get_variant_for_user(self, user_id: str, experiment_id: str) -> Optional[ExperimentVariant]:
        """Get the assigned variant for a user in an experiment."""
        try:
            experiment = await self._get_active_experiment(experiment_id)
            if not experiment:
                return None
            
            # Check if user is in target audience
            if not await self._is_user_in_audience(user_id, experiment.target_audience):
                return None
            
            # Check traffic allocation
            if not await self._is_user_in_traffic(user_id, experiment.traffic_allocation):
                return None
            
            # Assign variant based on user hash
            variant_hash = hash(f"{user_id}_{experiment_id}") % 100
            cumulative_allocation = 0
            
            for variant in experiment.variants:
                cumulative_allocation += variant.traffic_allocation * 100
                if variant_hash < cumulative_allocation:
                    return variant
            
            # Fallback to control
            control_variant = next((v for v in experiment.variants if v.control), None)
            return control_variant
            
        except Exception as e:
            logger.error(f"Error getting variant for user {user_id} in experiment {experiment_id}: {e}")
            return None
    
    async def track_event(self, user_id: str, experiment_id: str,
                         event_type: str, event_data: Optional[Dict[str, Any]] = None) -> bool:
        """Track an event for an experiment."""
        try:
            # Get user's variant
            variant = await self.get_variant_for_user(user_id, experiment_id)
            if not variant:
                return False
            
            # Record event
            event_data = event_data or {}
            success = await self.repository.record_event(
                experiment_id, variant.id, user_id, event_type, event_data
            )
            
            if success:
                logger.debug(f"Tracked event {event_type} for user {user_id} in experiment {experiment_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error tracking event for user {user_id} in experiment {experiment_id}: {e}")
            return False
    
    async def analyze_experiment(self, experiment_id: str) -> Dict[str, Any]:
        """Analyze experiment results."""
        try:
            experiment = await self.repository.get_by_id(experiment_id)
            if not experiment:
                raise ValueError(f"Experiment {experiment_id} not found")
            
            # Get experiment data (placeholder - would query actual event data)
            analysis_results = {}
            
            for metric in experiment.metrics:
                metric_results = []
                control_variant = next((v for v in experiment.variants if v.control), None)
                
                for variant in experiment.variants:
                    if variant.control:
                        continue
                    
                    # Placeholder data - would come from actual events
                    control_data = [1, 0, 1, 1, 0] * 100  # Sample conversion data
                    variant_data = [1, 1, 1, 0, 1] * 100  # Sample conversion data
                    
                    significance = self.statistical_engine.calculate_significance(
                        control_data, variant_data
                    )
                    
                    result = ExperimentResult(
                        variant_id=variant.id,
                        metric_name=metric.name,
                        value=significance['variant_mean'],
                        confidence_interval=(
                            significance['variant_mean'] * 0.9,
                            significance['variant_mean'] * 1.1
                        ),
                        p_value=significance['p_value'],
                        sample_size=len(variant_data),
                        conversion_rate=significance['variant_mean']
                    )
                    
                    metric_results.append(asdict(result))
                
                analysis_results[metric.name] = {
                    'results': metric_results,
                    'primary': metric.primary,
                    'significant_variants': len([r for r in metric_results if r['p_value'] < metric.significance_threshold])
                }
            
            return {
                'experiment_id': experiment_id,
                'status': experiment.status.value,
                'metrics': analysis_results,
                'analyzed_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing experiment {experiment_id}: {e}")
            raise
    
    async def get_active_experiments(self) -> List[Experiment]:
        """Get all active experiments."""
        try:
            # Check cache
            if (self._cache_updated and 
                datetime.utcnow() - self._cache_updated < self._cache_ttl):
                return list(self._active_experiments_cache.values())
            
            # Fetch from repository
            experiments = await self.repository.get_active_experiments()
            
            # Update cache
            self._active_experiments_cache = {exp.id: exp for exp in experiments}
            self._cache_updated = datetime.utcnow()
            
            return experiments
            
        except Exception as e:
            logger.error(f"Error getting active experiments: {e}")
            return []
    
    async def _get_active_experiment(self, experiment_id: str) -> Optional[Experiment]:
        """Get an active experiment by ID."""
        try:
            # Check cache first
            if (experiment_id in self._active_experiments_cache and
                self._cache_updated and 
                datetime.utcnow() - self._cache_updated < self._cache_ttl):
                return self._active_experiments_cache[experiment_id]
            
            # Refresh cache
            await self.get_active_experiments()
            return self._active_experiments_cache.get(experiment_id)
            
        except Exception as e:
            logger.error(f"Error getting active experiment {experiment_id}: {e}")
            return None
    
    async def _is_user_in_audience(self, user_id: str, 
                                 target_audience: Optional[Dict[str, Any]]) -> bool:
        """Check if user matches target audience criteria."""
        try:
            if not target_audience:
                return True
            
            # Placeholder audience matching logic
            # In reality, would check user attributes against criteria
            return True
            
        except Exception as e:
            logger.error(f"Error checking audience for user {user_id}: {e}")
            return False
    
    async def _is_user_in_traffic(self, user_id: str, traffic_allocation: float) -> bool:
        """Check if user is included in traffic allocation."""
        try:
            user_hash = hash(user_id) % 100
            return user_hash < (traffic_allocation * 100)
            
        except Exception as e:
            logger.error(f"Error checking traffic allocation for user {user_id}: {e}")
            return False
    
    def _clear_cache(self) -> None:
        """Clear the experiments cache."""
        self._active_experiments_cache.clear()
        self._cache_updated = None
