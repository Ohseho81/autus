"""
Cron scheduler for managing pack execution at specific times.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from croniter import croniter
import pytz

logger = logging.getLogger(__name__)


@dataclass
class CronJob:
    """Represents a scheduled cron job for pack execution."""
    
    id: str
    pack_id: str
    cron_expression: str
    callback: Callable[..., Any]
    args: tuple = ()
    kwargs: dict = None
    timezone: str = "UTC"
    enabled: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    max_retries: int = 3
    retry_count: int = 0
    
    def __post_init__(self) -> None:
        """Initialize job after creation."""
        if self.kwargs is None:
            self.kwargs = {}
        self._calculate_next_run()
    
    def _calculate_next_run(self) -> None:
        """Calculate the next run time based on cron expression."""
        try:
            tz = pytz.timezone(self.timezone)
            now = datetime.now(tz)
            
            cron = croniter(self.cron_expression, now)
            self.next_run = cron.get_next(datetime)
            
        except Exception as e:
            logger.error(f"Error calculating next run for job {self.id}: {e}")
            self.next_run = None
    
    def should_run(self, current_time: datetime) -> bool:
        """Check if job should run at current time."""
        if not self.enabled or self.next_run is None:
            return False
        
        return current_time >= self.next_run
    
    def update_next_run(self) -> None:
        """Update next run time after execution."""
        self.last_run = datetime.now(pytz.timezone(self.timezone))
        self._calculate_next_run()
        self.retry_count = 0


class CronScheduler:
    """Manages cron-based scheduling of pack executions."""
    
    def __init__(self, check_interval: int = 60) -> None:
        """
        Initialize cron scheduler.
        
        Args:
            check_interval: How often to check for jobs to run (seconds)
        """
        self._jobs: Dict[str, CronJob] = {}
        self._running: bool = False
        self._check_interval: int = check_interval
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
    
    async def add_job(
        self,
        job_id: str,
        pack_id: str,
        cron_expression: str,
        callback: Callable[..., Any],
        args: tuple = (),
        kwargs: Optional[dict] = None,
        timezone: str = "UTC",
        max_retries: int = 3
    ) -> bool:
        """
        Add a new cron job.
        
        Args:
            job_id: Unique identifier for the job
            pack_id: ID of the pack to execute
            cron_expression: Cron expression for scheduling
            callback: Function to call when job runs
            args: Positional arguments for callback
            kwargs: Keyword arguments for callback
            timezone: Timezone for scheduling
            max_retries: Maximum retry attempts on failure
        
        Returns:
            True if job was added successfully
        """
        try:
            # Validate cron expression
            if not self._validate_cron_expression(cron_expression):
                logger.error(f"Invalid cron expression: {cron_expression}")
                return False
            
            async with self._lock:
                job = CronJob(
                    id=job_id,
                    pack_id=pack_id,
                    cron_expression=cron_expression,
                    callback=callback,
                    args=args,
                    kwargs=kwargs or {},
                    timezone=timezone,
                    max_retries=max_retries
                )
                
                self._jobs[job_id] = job
                logger.info(f"Added cron job {job_id} for pack {pack_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error adding cron job {job_id}: {e}")
            return False
    
    async def remove_job(self, job_id: str) -> bool:
        """
        Remove a cron job.
        
        Args:
            job_id: ID of job to remove
        
        Returns:
            True if job was removed
        """
        async with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                logger.info(f"Removed cron job {job_id}")
                return True
            return False
    
    async def enable_job(self, job_id: str) -> bool:
        """
        Enable a cron job.
        
        Args:
            job_id: ID of job to enable
        
        Returns:
            True if job was enabled
        """
        async with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].enabled = True
                self._jobs[job_id].update_next_run()
                logger.info(f"Enabled cron job {job_id}")
                return True
            return False
    
    async def disable_job(self, job_id: str) -> bool:
        """
        Disable a cron job.
        
        Args:
            job_id: ID of job to disable
        
        Returns:
            True if job was disabled
        """
        async with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].enabled = False
                logger.info(f"Disabled cron job {job_id}")
                return True
            return False
    
    async def get_job(self, job_id: str) -> Optional[CronJob]:
        """
        Get a specific cron job.
        
        Args:
            job_id: ID of job to retrieve
        
        Returns:
            CronJob instance or None if not found
        """
        async with self._lock:
            return self._jobs.get(job_id)
    
    async def list_jobs(self) -> List[CronJob]:
        """
        Get all cron jobs.
        
        Returns:
            List of all CronJob instances
        """
        async with self._lock:
            return list(self._jobs.values())
    
    async def get_jobs_for_pack(self, pack_id: str) -> List[CronJob]:
        """
        Get all jobs for a specific pack.
        
        Args:
            pack_id: ID of pack to get jobs for
        
        Returns:
            List of CronJob instances for the pack
        """
        async with self._lock:
            return [job for job in self._jobs.values() if job.pack_id == pack_id]
    
    async def start(self) -> None:
        """Start the cron scheduler."""
        if self._running:
            logger.warning("Cron scheduler is already running")
            return
        
        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        logger.info("Cron scheduler started")
    
    async def stop(self) -> None:
        """Stop the cron scheduler."""
        if not self._running:
            return
        
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        logger.info("Cron scheduler stopped")
    
    async def _scheduler_loop(self) -> None:
        """Main scheduler loop that checks and runs jobs."""
        while self._running:
            try:
                await self._check_and_run_jobs()
                await asyncio.sleep(self._check_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(self._check_interval)
    
    async def _check_and_run_jobs(self) -> None:
        """Check for jobs that need to run and execute them."""
        current_time = datetime.now(pytz.UTC)
        jobs_to_run = []
        
        async with self._lock:
            for job in self._jobs.values():
                if job.should_run(current_time):
                    jobs_to_run.append(job)
        
        # Run jobs outside of lock to avoid blocking
        for job in jobs_to_run:
            asyncio.create_task(self._run_job(job))
    
    async def _run_job(self, job: CronJob) -> None:
        """
        Execute a specific job.
        
        Args:
            job: CronJob instance to execute
        """
        try:
            logger.info(f"Running cron job {job.id} for pack {job.pack_id}")
            
            # Execute the callback
            if asyncio.iscoroutinefunction(job.callback):
                await job.callback(*job.args, **job.kwargs)
            else:
                job.callback(*job.args, **job.kwargs)
            
            # Update job status
            async with self._lock:
                job.update_next_run()
            
            logger.info(f"Completed cron job {job.id}")
            
        except Exception as e:
            logger.error(f"Error running cron job {job.id}: {e}")
            await self._handle_job_failure(job, e)
    
    async def _handle_job_failure(self, job: CronJob, error: Exception) -> None:
        """
        Handle job execution failure.
        
        Args:
            job: Failed CronJob instance
            error: Exception that occurred
        """
        async with self._lock:
            job.retry_count += 1
            
            if job.retry_count <= job.max_retries:
                # Schedule retry after a delay
                retry_delay = min(300, 60 * job.retry_count)  # Max 5 minutes
                job.next_run = datetime.now(pytz.timezone(job.timezone)) + timedelta(seconds=retry_delay)
                logger.warning(f"Retrying job {job.id} in {retry_delay} seconds (attempt {job.retry_count}/{job.max_retries})")
            else:
                # Max retries exceeded, schedule next regular run
                job.update_next_run()
                logger.error(f"Job {job.id} failed after {job.max_retries} retries, scheduling next regular run")
    
    def _validate_cron_expression(self, expression: str) -> bool:
        """
        Validate a cron expression.
        
        Args:
            expression: Cron expression to validate
        
        Returns:
            True if expression is valid
        """
        try:
            croniter(expression)
            return True
        except Exception:
            return False
    
    async def get_scheduler_status(self) -> dict:
        """
        Get current scheduler status.
        
        Returns:
            Dictionary with scheduler status information
        """
        async with self._lock:
            return {
                "running": self._running,
                "total_jobs": len(self._jobs),
                "enabled_jobs": len([j for j in self._jobs.values() if j.enabled]),
                "disabled_jobs": len([j for j in self._jobs.values() if not j.enabled]),
                "check_interval": self._check_interval,
                "jobs": [
                    {
                        "id": job.id,
                        "pack_id": job.pack_id,
                        "cron_expression": job.cron_expression,
                        "enabled": job.enabled,
                        "last_run": job.last_run.isoformat() if job.last_run else None,
                        "next_run": job.next_run.isoformat() if job.next_run else None,
                        "retry_count": job.retry_count,
                        "timezone": job.timezone
                    }
                    for job in self._jobs.values()
                ]
            }
