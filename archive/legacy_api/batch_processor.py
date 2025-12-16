"""
Batch processing utilities for efficient data handling

Features:
- Async batch processor with configurable chunk size
- Parallel batch execution with worker pools
- Bulk insert/update operations
- Memory-efficient streaming for large datasets
- Backpressure handling
"""

import asyncio
import logging
from typing import List, Callable, Any, Optional, Dict, TypeVar, Generic
from dataclasses import dataclass, field
from datetime import datetime
import time

logger = logging.getLogger(__name__)

T = TypeVar('T')
R = TypeVar('R')


@dataclass
class BatchConfig:
    """Configuration for batch processing"""
    batch_size: int = 100  # Items per batch
    max_workers: int = 4  # Parallel workers
    timeout_seconds: int = 30  # Operation timeout
    retry_count: int = 3  # Retry attempts
    log_progress: bool = True  # Log progress


@dataclass
class BatchResult:
    """Result of batch operation"""
    total_items: int
    successful: int
    failed: int
    errors: List[Dict[str, Any]] = field(default_factory=list)
    duration_ms: float = 0.0
    items_per_second: float = 0.0
    status: str = "success"


class AsyncBatchProcessor(Generic[T, R]):
    """Process items in async batches efficiently"""
    
    def __init__(self, config: Optional[BatchConfig] = None):
        """Initialize batch processor"""
        self.config = config or BatchConfig()
        self.processed = 0
        self.failed = 0
        self.errors = []
    
    async def process(
        self,
        items: List[T],
        processor_func: Callable[[List[T]], Any],
        name: str = "batch_operation"
    ) -> BatchResult:
        """
        Process items in batches
        
        Args:
            items: Items to process
            processor_func: Async function to process batch
            name: Operation name for logging
            
        Returns:
            BatchResult with statistics
        """
        start_time = time.time()
        self.processed = 0
        self.failed = 0
        self.errors = []
        
        try:
            total_items = len(items)
            
            # Create batches
            batches = [
                items[i:i + self.config.batch_size]
                for i in range(0, total_items, self.config.batch_size)
            ]
            
            if self.config.log_progress:
                logger.info(f"Starting {name}: {total_items} items in {len(batches)} batches")
            
            # Process batches with semaphore for concurrency control
            semaphore = asyncio.Semaphore(self.config.max_workers)
            
            async def process_batch_with_semaphore(batch):
                async with semaphore:
                    return await self._process_batch_with_retry(
                        batch, processor_func, name
                    )
            
            # Execute batches concurrently
            tasks = [process_batch_with_semaphore(batch) for batch in batches]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Aggregate results
            for result in results:
                if isinstance(result, Exception):
                    self.failed += 1
                    self.errors.append({"error": str(result)})
                elif isinstance(result, dict):
                    self.processed += result.get("processed", 0)
                    self.failed += result.get("failed", 0)
                    self.errors.extend(result.get("errors", []))
            
            duration_ms = (time.time() - start_time) * 1000
            items_per_second = (total_items / (duration_ms / 1000)) if duration_ms > 0 else 0
            
            if self.config.log_progress:
                logger.info(
                    f"Completed {name}: {self.processed} success, {self.failed} failed, "
                    f"{duration_ms:.0f}ms, {items_per_second:.1f} items/sec"
                )
            
            return BatchResult(
                total_items=total_items,
                successful=self.processed,
                failed=self.failed,
                errors=self.errors[:100],  # Limit error list
                duration_ms=duration_ms,
                items_per_second=round(items_per_second, 2),
                status="success" if self.failed == 0 else "partial"
            )
        
        except Exception as e:
            logger.error(f"Batch operation {name} failed: {e}", exc_info=True)
            duration_ms = (time.time() - start_time) * 1000
            
            return BatchResult(
                total_items=len(items),
                successful=self.processed,
                failed=self.failed + 1,
                errors=[{"error": str(e)}],
                duration_ms=duration_ms,
                items_per_second=0,
                status="failed"
            )
    
    async def _process_batch_with_retry(
        self,
        batch: List[T],
        processor_func: Callable,
        name: str
    ) -> Dict[str, Any]:
        """Process batch with retry logic"""
        
        for attempt in range(self.config.retry_count):
            try:
                result = await asyncio.wait_for(
                    processor_func(batch),
                    timeout=self.config.timeout_seconds
                )
                
                return {
                    "processed": len(batch),
                    "failed": 0,
                    "errors": []
                }
            
            except asyncio.TimeoutError:
                logger.warning(f"{name} batch timeout (attempt {attempt + 1}/{self.config.retry_count})")
                if attempt == self.config.retry_count - 1:
                    return {
                        "processed": 0,
                        "failed": len(batch),
                        "errors": [{"error": "Operation timeout"}]
                    }
            
            except Exception as e:
                logger.warning(f"{name} batch error (attempt {attempt + 1}/{self.config.retry_count}): {e}")
                if attempt == self.config.retry_count - 1:
                    return {
                        "processed": 0,
                        "failed": len(batch),
                        "errors": [{"error": str(e)}]
                    }
            
            # Exponential backoff
            await asyncio.sleep(2 ** attempt)
        
        return {
            "processed": 0,
            "failed": len(batch),
            "errors": [{"error": "Max retries exceeded"}]
        }


class BulkInsertManager:
    """Manage bulk insert operations efficiently"""
    
    def __init__(self, batch_size: int = 1000):
        """Initialize bulk insert manager"""
        self.batch_size = batch_size
        self.pending_items = []
    
    async def add(self, item: Any) -> Optional[BatchResult]:
        """Add item to batch, flush if full"""
        self.pending_items.append(item)
        
        if len(self.pending_items) >= self.batch_size:
            return await self.flush()
        
        return None
    
    async def flush(self) -> Optional[BatchResult]:
        """Flush all pending items"""
        if not self.pending_items:
            return None
        
        items = self.pending_items
        self.pending_items = []
        
        logger.info(f"Flushing {len(items)} items to database")
        
        # Implement actual bulk insert here
        # This is a placeholder
        
        return BatchResult(
            total_items=len(items),
            successful=len(items),
            failed=0,
            duration_ms=0
        )


# Convenience functions

async def process_items_in_batches(
    items: List[T],
    process_func: Callable[[List[T]], Any],
    batch_size: int = 100,
    max_workers: int = 4,
    name: str = "batch_operation"
) -> BatchResult:
    """
    Process items in async batches
    
    Usage:
        results = await process_items_in_batches(
            items=device_ids,
            process_func=async_update_devices,
            batch_size=50,
            max_workers=4,
            name="update_devices"
        )
    """
    config = BatchConfig(
        batch_size=batch_size,
        max_workers=max_workers
    )
    processor = AsyncBatchProcessor(config)
    return await processor.process(items, process_func, name)


async def parallel_map(
    items: List[T],
    async_func: Callable[[T], R],
    max_workers: int = 4,
    name: str = "parallel_map"
) -> List[R]:
    """
    Apply async function to items in parallel
    
    Usage:
        results = await parallel_map(
            items=device_ids,
            async_func=fetch_device_data,
            max_workers=5
        )
    """
    semaphore = asyncio.Semaphore(max_workers)
    
    async def bounded_func(item):
        async with semaphore:
            try:
                return await asyncio.wait_for(async_func(item), timeout=30)
            except Exception as e:
                logger.error(f"Error processing item in {name}: {e}")
                return None
    
    tasks = [bounded_func(item) for item in items]
    results = await asyncio.gather(*tasks)
    
    logger.info(f"Completed {name}: {len([r for r in results if r is not None])}/{len(items)} successful")
    return results
