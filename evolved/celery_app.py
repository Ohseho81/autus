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
    
    # Task timeout
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,       # 10 minutes hard limit
    
    # Result settings
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
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

# Custom task class with retry logic
class CallbackTask(Task):
    """Task with custom error handling and callbacks"""
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True
    retry_backoff_max = 600
    retry_jitter = True

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
