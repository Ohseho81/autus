"""
Twin Realtime Sync Module

Provides real-time synchronization capabilities for digital twin systems.
Handles bidirectional data sync, conflict resolution, and state management.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Callable, Set
from dataclasses import dataclass, asdict
from enum import Enum
from abc import ABC, abstractmethod


class SyncStatus(Enum):
    """Synchronization status enumeration."""
    IDLE = "idle"
    SYNCING = "syncing"
    CONFLICT = "conflict"
    ERROR = "error"
    DISCONNECTED = "disconnected"


class ConflictResolutionStrategy(Enum):
    """Conflict resolution strategy enumeration."""
    LATEST_WINS = "latest_wins"
    SOURCE_WINS = "source_wins"
    TARGET_WINS = "target_wins"
    MANUAL = "manual"


@dataclass
class SyncEvent:
    """Represents a synchronization event."""
    id: str
    timestamp: datetime
    source_id: str
    target_id: str
    data: Dict[str, Any]
    event_type: str
    checksum: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class SyncConflict:
    """Represents a synchronization conflict."""
    id: str
    timestamp: datetime
    source_data: Dict[str, Any]
    target_data: Dict[str, Any]
    field_path: str
    resolution_strategy: ConflictResolutionStrategy


class SyncAdapter(ABC):
    """Abstract base class for sync adapters."""
    
    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the sync target."""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect from the sync target."""
        pass
    
    @abstractmethod
    async def send_data(self, data: Dict[str, Any]) -> bool:
        """Send data to the sync target."""
        pass
    
    @abstractmethod
    async def receive_data(self) -> Optional[Dict[str, Any]]:
        """Receive data from the sync target."""
        pass
    
    @abstractmethod
    async def get_last_sync_timestamp(self) -> Optional[datetime]:
        """Get the timestamp of the last successful sync."""
        pass


class TwinRealtimeSync:
    """
    Main synchronization manager for digital twin real-time sync.
    
    Handles bidirectional synchronization, conflict resolution,
    and maintains sync state consistency.
    """
    
    def __init__(
        self,
        twin_id: str,
        adapters: List[SyncAdapter],
        conflict_strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.LATEST_WINS,
        sync_interval: float = 1.0,
        batch_size: int = 100
    ) -> None:
        """
        Initialize the twin realtime sync manager.
        
        Args:
            twin_id: Unique identifier for this twin
            adapters: List of sync adapters to use
            conflict_strategy: Strategy for resolving conflicts
            sync_interval: Sync interval in seconds
            batch_size: Maximum batch size for sync operations
        """
        self.twin_id = twin_id
        self.adapters = adapters
        self.conflict_strategy = conflict_strategy
        self.sync_interval = sync_interval
        self.batch_size = batch_size
        
        self._status = SyncStatus.IDLE
        self._sync_queue: asyncio.Queue = asyncio.Queue()
        self._conflicts: List[SyncConflict] = []
        self._sync_tasks: Set[asyncio.Task] = set()
        self._event_handlers: Dict[str, List[Callable]] = {}
        self._last_sync_times: Dict[str, datetime] = {}
        
        self.logger = logging.getLogger(f"{__name__}.{twin_id}")
    
    @property
    def status(self) -> SyncStatus:
        """Get current sync status."""
        return self._status
    
    @property
    def conflicts(self) -> List[SyncConflict]:
        """Get list of unresolved conflicts."""
        return self._conflicts.copy()
    
    def add_event_handler(self, event_type: str, handler: Callable) -> None:
        """
        Add an event handler for specific event types.
        
        Args:
            event_type: Type of event to handle
            handler: Callable to handle the event
        """
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)
    
    def remove_event_handler(self, event_type: str, handler: Callable) -> None:
        """
        Remove an event handler.
        
        Args:
            event_type: Type of event
            handler: Handler to remove
        """
        if event_type in self._event_handlers:
            try:
                self._event_handlers[event_type].remove(handler)
            except ValueError:
                pass
    
    async def _emit_event(self, event_type: str, data: Any) -> None:
        """
        Emit an event to registered handlers.
        
        Args:
            event_type: Type of event to emit
            data: Event data
        """
        handlers = self._event_handlers.get(event_type, [])
        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                self.logger.error(f"Error in event handler: {e}")
    
    async def start_sync(self) -> None:
        """Start the synchronization process."""
        try:
            self._status = SyncStatus.SYNCING
            await self._emit_event("sync_started", {"twin_id": self.twin_id})
            
            # Connect all adapters
            for adapter in self.adapters:
                connected = await adapter.connect()
                if not connected:
                    raise ConnectionError(f"Failed to connect adapter {adapter}")
            
            # Start sync tasks
            sync_task = asyncio.create_task(self._sync_loop())
            receive_task = asyncio.create_task(self._receive_loop())
            
            self._sync_tasks.add(sync_task)
            self._sync_tasks.add(receive_task)
            
            self.logger.info(f"Sync started for twin {self.twin_id}")
            
        except Exception as e:
            self._status = SyncStatus.ERROR
            self.logger.error(f"Failed to start sync: {e}")
            await self._emit_event("sync_error", {"error": str(e)})
            raise
    
    async def stop_sync(self) -> None:
        """Stop the synchronization process."""
        try:
            # Cancel all sync tasks
            for task in self._sync_tasks:
                if not task.done():
                    task.cancel()
            
            # Wait for tasks to complete
            if self._sync_tasks:
                await asyncio.gather(*self._sync_tasks, return_exceptions=True)
            
            self._sync_tasks.clear()
            
            # Disconnect all adapters
            for adapter in self.adapters:
                await adapter.disconnect()
            
            self._status = SyncStatus.IDLE
            await self._emit_event("sync_stopped", {"twin_id": self.twin_id})
            
            self.logger.info(f"Sync stopped for twin {self.twin_id}")
            
        except Exception as e:
            self._status = SyncStatus.ERROR
            self.logger.error(f"Error stopping sync: {e}")
    
    async def queue_sync_event(self, event: SyncEvent) -> None:
        """
        Queue a sync event for processing.
        
        Args:
            event: Sync event to queue
        """
        try:
            await self._sync_queue.put(event)
            self.logger.debug(f"Queued sync event {event.id}")
        except Exception as e:
            self.logger.error(f"Failed to queue sync event: {e}")
            raise
    
    async def _sync_loop(self) -> None:
        """Main synchronization loop."""
        while True:
            try:
                # Process queued events in batches
                events = []
                
                # Collect events up to batch size
                for _ in range(self.batch_size):
                    try:
                        event = await asyncio.wait_for(
                            self._sync_queue.get(),
                            timeout=self.sync_interval
                        )
                        events.append(event)
                    except asyncio.TimeoutError:
                        break
                
                if events:
                    await self._process_sync_batch(events)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in sync loop: {e}")
                await asyncio.sleep(1)  # Brief pause before retry
    
    async def _receive_loop(self) -> None:
        """Loop to receive data from adapters."""
        while True:
            try:
                for adapter in self.adapters:
                    data = await adapter.receive_data()
                    if data:
                        await self._process_received_data(data, adapter)
                
                await asyncio.sleep(0.1)  # Brief pause between checks
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in receive loop: {e}")
                await asyncio.sleep(1)
    
    async def _process_sync_batch(self, events: List[SyncEvent]) -> None:
        """
        Process a batch of sync events.
        
        Args:
            events: List of events to process
        """
        try:
            for adapter in self.adapters:
                for event in events:
                    success = await adapter.send_data(event.to_dict())
                    if success:
                        self._last_sync_times[adapter.__class__.__name__] = datetime.now(timezone.utc)
                    else:
                        self.logger.warning(f"Failed to sync event {event.id} to adapter {adapter}")
            
            await self._emit_event("batch_synced", {"count": len(events)})
            
        except Exception as e:
            self.logger.error(f"Error processing sync batch: {e}")
            raise
    
    async def _process_received_data(self, data: Dict[str, Any], adapter: SyncAdapter) -> None:
        """
        Process data received from an adapter.
        
        Args:
            data: Received data
            adapter: Source adapter
        """
        try:
            # Check for conflicts
            conflicts = await self._detect_conflicts(data)
            
            if conflicts:
                self._conflicts.extend(conflicts)
                self._status = SyncStatus.CONFLICT
                await self._emit_event("conflicts_detected", {"conflicts": len(conflicts)})
                
                # Apply conflict resolution strategy
                await self._resolve_conflicts(conflicts)
            else:
                # No conflicts, process normally
                await self._emit_event("data_received", {
                    "data": data,
                    "adapter": adapter.__class__.__name__
                })
        
        except Exception as e:
            self.logger.error(f"Error processing received data: {e}")
    
    async def _detect_conflicts(self, incoming_data: Dict[str, Any]) -> List[SyncConflict]:
        """
        Detect conflicts in incoming data.
        
        Args:
            incoming_data: Data to check for conflicts
            
        Returns:
            List of detected conflicts
        """
        conflicts = []
        # Simplified conflict detection logic
        # In a real implementation, this would compare against current state
        
        return conflicts
    
    async def _resolve_conflicts(self, conflicts: List[SyncConflict]) -> None:
        """
        Resolve conflicts based on the configured strategy.
        
        Args:
            conflicts: List of conflicts to resolve
        """
        try:
            resolved_conflicts = []
            
            for conflict in conflicts:
                if self.conflict_strategy == ConflictResolutionStrategy.LATEST_WINS:
                    # Use the data with the latest timestamp
                    resolved_conflicts.append(conflict)
                elif self.conflict_strategy == ConflictResolutionStrategy.MANUAL:
                    # Emit event for manual resolution
                    await self._emit_event("manual_resolution_required", {"conflict": conflict})
                # Add other resolution strategies as needed
            
            # Remove resolved conflicts
            for conflict in resolved_conflicts:
                if conflict in self._conflicts:
                    self._conflicts.remove(conflict)
            
            if not self._conflicts:
                self._status = SyncStatus.SYNCING
                
        except Exception as e:
            self.logger.error(f"Error resolving conflicts: {e}")
    
    async def force_sync(self) -> bool:
        """
        Force an immediate synchronization.
        
        Returns:
            True if sync was successful, False otherwise
        """
        try:
            await self._emit_event("force_sync_started", {"twin_id": self.twin_id})
            
            # Process all queued events immediately
            events = []
            while not self._sync_queue.empty():
                try:
                    event = self._sync_queue.get_nowait()
                    events.append(event)
                except asyncio.QueueEmpty:
                    break
            
            if events:
                await self._process_sync_batch(events)
            
            await self._emit_event("force_sync_completed", {"events_processed": len(events)})
            return True
            
        except Exception as e:
            self.logger.error(f"Force sync failed: {e}")
            return False
    
    def get_sync_stats(self) -> Dict[str, Any]:
        """
        Get synchronization statistics.
        
        Returns:
            Dictionary containing sync statistics
        """
        return {
            "twin_id": self.twin_id,
            "status": self._status.value,
            "queue_size": self._sync_queue.qsize(),
            "conflict_count": len(self._conflicts),
            "adapter_count": len(self.adapters),
            "last_sync_times": {
                name: timestamp.isoformat()
                for name, timestamp in self._last_sync_times.items()
            },
            "active_tasks": len(self._sync_tasks)
        }
