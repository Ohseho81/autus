"""
Celery Configuration for AUTUS Async Job Processing
Handles background tasks, event processing, and long-running operations
"""

from celery import Celery, Task
from celery.schedules import crontab
from kombu import Exchange, Queue
from datetime import timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Celery app
app = Celery('autus')

# Broker and result backend configuration
BROKER_URL = os.getenv('CELERY_BROKER_URL', 'amqp://guest:guest@localhost:5672//')
RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

# Celery configuration
app.conf.update(
    broker_url=BROKER_URL,
    result_backend=RESULT_BACKEND,
    
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Optimized task timeouts by queue priority
    task_soft_time_limit=120,  # 2 minutes soft limit (reduced from 300)
    task_time_limit=180,       # 3 minutes hard limit (reduced from 600)
    task_acks_late=True,       # Acknowledge after execution
    task_reject_on_worker_lost=True,  # Reject if worker dies
    
    # Result settings - optimized for quick cleanup
    result_expires=1800,  # Results expire after 30 minutes (reduced from 3600)
    result_extended=True,
    result_backend_transport_options={
        'retry_on_timeout': True,
        'master_name': 'mymaster',
    },
    
    # Optimized worker settings
    worker_prefetch_multiplier=2,  # Reduced from 4 for better load balancing
    worker_max_tasks_per_child=500,  # Reduced from 1000 for memory efficiency
    worker_disable_rate_limits=False,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    
    # Task routing
    task_default_queue='default',
    task_default_exchange='autus',
    task_default_exchange_type='direct',
    task_default_routing_key='default',
    
    # Beat schedule for periodic tasks
    beat_schedule={
        'sync-analytics-hourly': {
            'task': 'evolved.tasks.sync_analytics',
            'schedule': timedelta(hours=1),
            'options': {'queue': 'analytics'}
        },
        'cleanup-cache-daily': {
            'task': 'evolved.tasks.cleanup_expired_cache',
            'schedule': crontab(hour=2, minute=0),  # 2 AM daily
            'options': {'queue': 'maintenance'}
        },
        'generate-reports-daily': {
            'task': 'evolved.tasks.generate_daily_reports',
            'schedule': crontab(hour=3, minute=0),
            'options': {'queue': 'reports'}
        },
        'health-check-5min': {
            'task': 'evolved.tasks.health_check',
            'schedule': timedelta(minutes=5),
            'options': {'queue': 'monitoring'}
        },
    },
    
    # Queues configuration
    task_queues=(
        Queue('default', Exchange('autus'), routing_key='default'),
        Queue('analytics', Exchange('autus'), routing_key='analytics'),
        Queue('devices', Exchange('autus'), routing_key='devices'),
        Queue('reports', Exchange('autus'), routing_key='reports'),
        Queue('maintenance', Exchange('autus'), routing_key='maintenance'),
        Queue('monitoring', Exchange('autus'), routing_key='monitoring'),
        Queue('events', Exchange('autus'), routing_key='events'),
        Queue('priority', Exchange('autus'), routing_key='priority', priority=10),
    ),
)

# Custom task class with optimized retry logic
class CallbackTask(Task):
    """Task with custom error handling and exponential backoff retry"""
    # Retry policy: exponential backoff with jitter
    autoretry_for = (Exception,)
    retry_kwargs = {
        'max_retries': 2,  # Reduced from 3 for faster failure feedback
        'countdown': 5     # Start with 5 second delay
    }
    retry_backoff = True
    retry_backoff_max = 300  # Max 5 minutes between retries (reduced from 600)
    retry_jitter = True
    
    # Track task metrics
    def before_start(self, task_id, args, kwargs):
        """Called before task execution"""
        return super().before_start(task_id, args, kwargs)
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when task is retried"""
        return super().on_retry(exc, task_id, args, kwargs, einfo)
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails after all retries"""
        return super().on_failure(exc, task_id, args, kwargs, einfo)

app.Task = CallbackTask


# Task result handlers
@app.task(bind=True)
def on_task_success(self, result, task_id, args, kwargs):
    """Callback for successful task completion"""
    print(f"Task {task_id} completed successfully: {result}")


@app.task(bind=True)
def on_task_failure(self, exc, task_id, args, kwargs, einfo):
    """Callback for task failure"""
    print(f"Task {task_id} failed with error: {exc}")


# Task registry
def get_all_tasks():
    """Get all registered tasks"""
    return list(app.tasks.keys())


def get_task_info(task_id):
    """Get info about a specific task"""
    result = app.AsyncResult(task_id)
    return {
        'id': task_id,
        'state': result.state,
        'result': result.result,
        'info': result.info,
        'ready': result.ready(),
        'successful': result.successful(),
        'failed': result.failed(),
    }


if __name__ == '__main__':
    app.start()
