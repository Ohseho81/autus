"""
File: core/sync/importer.py
Purpose: Part of Memory Sync: Sync local memory across devices via QR
"""

import json
import base64
import hashlib
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from pathlib import Path

from ..exceptions import SyncError, ValidationError
from ..models import Memory, SyncMetadata
from ..storage import MemoryStorage


logger = logging.getLogger(__name__)


class MemoryImporter:
    """Handles importing memories from QR code data and external sources."""
    
    def __init__(self, storage: MemoryStorage):
        """
        Initialize the memory importer.
        
        Args:
            storage: Memory storage instance for persisting imported data
        """
        self.storage = storage
        self._imported_hashes: set = set()
    
    def import_from_qr_data(self, qr_data: str) -> Dict[str, Any]:
        """
        Import memories from QR code data.
        
        Args:
            qr_data: Base64 encoded JSON string from QR code
            
        Returns:
            Dictionary with import results and statistics
            
        Raises:
            SyncError: If QR data is invalid or import fails
            ValidationError: If memory data validation fails
        """
        try:
            # Decode base64 data
            decoded_data = base64.b64decode(qr_data).decode('utf-8')
            sync_payload = json.loads(decoded_data)
            
            # Validate payload structure
            self._validate_sync_payload(sync_payload)
            
            # Extract metadata and memories
            metadata = SyncMetadata(**sync_payload['metadata'])
            memories_data = sync_payload['memories']
            
            # Import memories
            import_results = self._import_memories_batch(memories_data, metadata)
            
            logger.info(
                f"Import completed: {import_results['imported']} memories imported, "
                f"{import_results['skipped']} skipped, {import_results['errors']} errors"
            )
            
            return import_results
            
        except (json.JSONDecodeError, base64.binascii.Error) as e:
            raise SyncError(f"Invalid QR data format: {e}")
        except Exception as e:
            logger.error(f"Import failed: {e}")
            raise SyncError(f"Import operation failed: {e}")
    
    def import_from_file(self, file_path: Path) -> Dict[str, Any]:
        """
        Import memories from JSON file.
        
        Args:
            file_path: Path to JSON file containing memory data
            
        Returns:
            Dictionary with import results and statistics
            
        Raises:
            SyncError: If file cannot be read or contains invalid data
        """
        try:
            if not file_path.exists():
                raise SyncError(f"Import file not found: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                sync_payload = json.load(f)
            
            self._validate_sync_payload(sync_payload)
            
            metadata = SyncMetadata(**sync_payload['metadata'])
            memories_data = sync_payload['memories']
            
            return self._import_memories_batch(memories_data, metadata)
            
        except json.JSONDecodeError as e:
            raise SyncError(f"Invalid JSON file format: {e}")
        except IOError as e:
            raise SyncError(f"Cannot read import file: {e}")
    
    def import_memory(self, memory_data: Dict[str, Any], 
                     metadata: Optional[SyncMetadata] = None) -> bool:
        """
        Import a single memory.
        
        Args:
            memory_data: Dictionary containing memory information
            metadata: Optional sync metadata for the import operation
            
        Returns:
            True if memory was imported, False if skipped
            
        Raises:
            ValidationError: If memory data is invalid
        """
        try:
            # Validate memory data
            self._validate_memory_data(memory_data)
            
            # Create memory instance
            memory = Memory(
                id=memory_data.get('id'),
                content=memory_data['content'],
                timestamp=datetime.fromisoformat(memory_data['timestamp']),
                tags=memory_data.get('tags', []),
                metadata=memory_data.get('metadata', {}),
                hash=memory_data.get('hash')
            )
            
            # Check for duplicates
            if self._is_duplicate_memory(memory):
                logger.debug(f"Skipping duplicate memory: {memory.id}")
                return False
            
            # Store memory
            self.storage.save_memory(memory)
            
            # Track imported hash
            if memory.hash:
                self._imported_hashes.add(memory.hash)
            
            logger.debug(f"Imported memory: {memory.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to import memory: {e}")
            raise ValidationError(f"Memory import validation failed: {e}")
    
    def _import_memories_batch(self, memories_data: List[Dict[str, Any]], 
                              metadata: SyncMetadata) -> Dict[str, Any]:
        """
        Import a batch of memories.
        
        Args:
            memories_data: List of memory dictionaries
            metadata: Sync metadata for the batch
            
        Returns:
            Dictionary with import statistics
        """
        results = {
            'imported': 0,
            'skipped': 0,
            'errors': 0,
            'total': len(memories_data),
            'metadata': metadata.dict(),
            'import_timestamp': datetime.utcnow().isoformat()
        }
        
        for memory_data in memories_data:
            try:
                if self.import_memory(memory_data, metadata):
                    results['imported'] += 1
                else:
                    results['skipped'] += 1
            except Exception as e:
                logger.error(f"Error importing memory {memory_data.get('id', 'unknown')}: {e}")
                results['errors'] += 1
        
        return results
    
    def _validate_sync_payload(self, payload: Dict[str, Any]) -> None:
        """
        Validate the structure of sync payload.
        
        Args:
            payload: Sync payload dictionary
            
        Raises:
            ValidationError: If payload structure is invalid
        """
        required_fields = ['metadata', 'memories']
        
        for field in required_fields:
            if field not in payload:
                raise ValidationError(f"Missing required field in sync payload: {field}")
        
        if not isinstance(payload['memories'], list):
            raise ValidationError("Memories field must be a list")
        
        # Validate metadata structure
        metadata_required = ['version', 'device_id', 'export_timestamp']
        for field in metadata_required:
            if field not in payload['metadata']:
                raise ValidationError(f"Missing required metadata field: {field}")
    
    def _validate_memory_data(self, memory_data: Dict[str, Any]) -> None:
        """
        Validate individual memory data.
        
        Args:
            memory_data: Memory data dictionary
            
        Raises:
            ValidationError: If memory data is invalid
        """
        required_fields = ['content', 'timestamp']
        
        for field in required_fields:
            if field not in memory_data:
                raise ValidationError(f"Missing required memory field: {field}")
        
        # Validate timestamp format
        try:
            datetime.fromisoformat(memory_data['timestamp'])
        except ValueError:
            raise ValidationError("Invalid timestamp format")
        
        # Validate content is not empty
        if not memory_data['content'].strip():
            raise ValidationError("Memory content cannot be empty")
    
    def _is_duplicate_memory(self, memory: Memory) -> bool:
        """
        Check if memory is a duplicate.
        
        Args:
            memory: Memory instance to check
            
        Returns:
            True if memory is a duplicate
        """
        # Check by hash if available
        if memory.hash:
            if memory.hash in self._imported_hashes:
                return True
            
            # Check against existing memories in storage
            existing_memory = self.storage.get_memory_by_hash(memory.hash)
            if existing_memory:
                return True
        
        # Check by ID if available
        if memory.id:
            existing_memory = self.storage.get_memory(memory.id)
            if existing_memory:
                return True
        
        # Check by content hash for similar memories
        content_hash = self._generate_content_hash(memory.content)
        return self.storage.memory_exists_by_content_hash(content_hash)
    
    def _generate_content_hash(self, content: str) -> str:
        """
        Generate hash for memory content.
        
        Args:
            content: Memory content string
            
        Returns:
            SHA-256 hash of the content
        """
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def get_import_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the current import session.
        
        Returns:
            Dictionary with import statistics
        """
        return {
            'imported_hashes_count': len(self._imported_hashes),
            'session_start': datetime.utcnow().isoformat()
        }
    
    def clear_import_cache(self) -> None:
        """Clear the import cache and reset statistics."""
        self._imported_hashes.clear()
        logger.info("Import cache cleared")
