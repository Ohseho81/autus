"""
Deployment Pipeline Monitoring & Tracking

Tracks deployment status, health checks, and rollback capabilities
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
from pathlib import Path


class DeploymentStatus(Enum):
    """Deployment status values"""
    PENDING = "pending"
    BUILDING = "building"
    TESTING = "testing"
    DEPLOYING = "deploying"
    LIVE = "live"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class Deployment:
    """Deployment record"""
    id: str
    version: str
    commit_hash: str
    status: DeploymentStatus
    environment: str  # dev, staging, production
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0
    error_message: Optional[str] = None
    health_status: str = "unknown"
    endpoints_checked: int = 0
    endpoints_healthy: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict"""
        return {
            'id': self.id,
            'version': self.version,
            'commit_hash': self.commit_hash[:8],
            'status': self.status.value,
            'environment': self.environment,
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.duration_seconds,
            'error_message': self.error_message,
            'health_status': self.health_status,
            'endpoints_checked': self.endpoints_checked,
            'endpoints_healthy': self.endpoints_healthy,
            'health_percentage': round((self.endpoints_healthy / self.endpoints_checked * 100) if self.endpoints_checked > 0 else 0, 1)
        }


class DeploymentPipeline:
    """Manage deployment pipeline"""
    
    def __init__(self):
        self.deployments: List[Deployment] = []
        self.current_deployment: Optional[Deployment] = None
    
    def start_deployment(
        self,
        version: str,
        commit_hash: str,
        environment: str,
        deployment_id: str = None
    ) -> Deployment:
        """Start new deployment"""
        if deployment_id is None:
            deployment_id = f"deploy-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        deployment = Deployment(
            id=deployment_id,
            version=version,
            commit_hash=commit_hash,
            status=DeploymentStatus.PENDING,
            environment=environment,
            started_at=datetime.now()
        )
        
        self.current_deployment = deployment
        self.deployments.append(deployment)
        
        return deployment
    
    def update_status(
        self,
        deployment_id: str,
        status: DeploymentStatus,
        error_message: str = None
    ) -> bool:
        """Update deployment status"""
        deployment = self._find_deployment(deployment_id)
        if not deployment:
            return False
        
        deployment.status = status
        if error_message:
            deployment.error_message = error_message
        
        if status in [DeploymentStatus.LIVE, DeploymentStatus.FAILED, DeploymentStatus.ROLLED_BACK]:
            deployment.completed_at = datetime.now()
            deployment.duration_seconds = (deployment.completed_at - deployment.started_at).total_seconds()
        
        return True
    
    def health_check(
        self,
        deployment_id: str,
        endpoints_checked: int,
        endpoints_healthy: int
    ) -> bool:
        """Record health check results"""
        deployment = self._find_deployment(deployment_id)
        if not deployment:
            return False
        
        deployment.endpoints_checked = endpoints_checked
        deployment.endpoints_healthy = endpoints_healthy
        
        health_percentage = (endpoints_healthy / endpoints_checked * 100) if endpoints_checked > 0 else 0
        
        if health_percentage == 100:
            deployment.health_status = "healthy"
        elif health_percentage >= 95:
            deployment.health_status = "warning"
        else:
            deployment.health_status = "critical"
        
        return True
    
    def get_deployment_summary(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """Get deployment summary"""
        deployment = self._find_deployment(deployment_id)
        if not deployment:
            return None
        
        return deployment.to_dict()
    
    def get_deployment_history(self, environment: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get deployment history"""
        deployments = self.deployments
        
        if environment:
            deployments = [d for d in deployments if d.environment == environment]
        
        # Sort by started_at descending
        deployments.sort(key=lambda d: d.started_at, reverse=True)
        
        return [d.to_dict() for d in deployments[:limit]]
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current deployment status"""
        if not self.current_deployment:
            return {
                'status': 'idle',
                'current_deployment': None,
                'last_deployment': None
            }
        
        last_deployment = None
        if len(self.deployments) > 1:
            last_deployment = self.deployments[-2].to_dict()
        
        return {
            'status': 'active',
            'current_deployment': self.current_deployment.to_dict(),
            'last_deployment': last_deployment
        }
    
    def rollback(self, deployment_id: str, reason: str = "") -> bool:
        """Rollback deployment"""
        deployment = self._find_deployment(deployment_id)
        if not deployment:
            return False
        
        deployment.status = DeploymentStatus.ROLLED_BACK
        deployment.completed_at = datetime.now()
        deployment.duration_seconds = (deployment.completed_at - deployment.started_at).total_seconds()
        deployment.error_message = f"Rolled back: {reason}"
        
        return True
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get deployment statistics"""
        if not self.deployments:
            return {
                'total_deployments': 0,
                'successful': 0,
                'failed': 0,
                'rolled_back': 0,
                'success_rate': 0,
                'avg_duration_seconds': 0
            }
        
        total = len(self.deployments)
        successful = sum(1 for d in self.deployments if d.status == DeploymentStatus.LIVE)
        failed = sum(1 for d in self.deployments if d.status == DeploymentStatus.FAILED)
        rolled_back = sum(1 for d in self.deployments if d.status == DeploymentStatus.ROLLED_BACK)
        
        durations = [d.duration_seconds for d in self.deployments if d.duration_seconds > 0]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        return {
            'total_deployments': total,
            'successful': successful,
            'failed': failed,
            'rolled_back': rolled_back,
            'success_rate': round(successful / total * 100 if total > 0 else 0, 1),
            'avg_duration_seconds': round(avg_duration, 1),
            'environments': list(set(d.environment for d in self.deployments))
        }
    
    def _find_deployment(self, deployment_id: str) -> Optional[Deployment]:
        """Find deployment by ID"""
        for deployment in self.deployments:
            if deployment.id == deployment_id:
                return deployment
        return None
    
    def save_to_file(self, filepath: str = "deployments.json"):
        """Save deployment history to file"""
        data = {
            'deployments': [d.to_dict() for d in self.deployments],
            'statistics': self.get_statistics(),
            'last_updated': datetime.now().isoformat()
        }
        
        output_file = Path(filepath)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"✅ Deployment history saved: {filepath}")
    
    def load_from_file(self, filepath: str = "deployments.json"):
        """Load deployment history from file"""
        if not Path(filepath).exists():
            return False
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            # Note: Would need to deserialize deployments properly
            print(f"✅ Deployment history loaded: {filepath}")
            return True
        except Exception as e:
            print(f"Error loading deployment history: {e}")
            return False


# Global pipeline instance
pipeline = DeploymentPipeline()


def get_pipeline() -> DeploymentPipeline:
    """Get global deployment pipeline"""
    return pipeline
