"""
Memory Sync Exporter Module

Handles exporting local memory data for synchronization across devices via QR codes.
"""

import json
import gzip
import base64
import hashlib
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pathlib import Path
import logging

from ..models.memory import Memory, MemoryCollection
from ..utils.encryption import MemoryEncryption
from ..exceptions import SyncError, ExportError


logger = logging.getLogger(__name__)


class MemoryExporter:
    """Exports memory data for cross-device synchronization."""
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize the memory exporter.
        
        Args:
            encryption_key: Optional encryption key for securing exported data
        """
        self.encryption = MemoryEncryption(encryption_key) if encryption_key else None
        self._max_chunk_size = 2048  # Maximum size for QR code compatibility
        
    def export_memories(
        self,
        memories: List[Memory],
        include_metadata: bool = True,
        compress: bool = True
    ) -> Dict[str, Any]:
        """
        Export memories to a serializable format.
        
        Args:
            memories: List of Memory objects to export
            include_metadata: Whether to include metadata in export
            compress: Whether to compress the exported data
            
        Returns:
            Dictionary containing exported memory data
            
        Raises:
            ExportError: If export process fails
        """
        try:
            export_data = {
                "version": "1.0",
                "timestamp": datetime.utcnow().isoformat(),
                "memory_count": len(memories),
                "memories": []
            }
            
            for memory in memories:
                memory_data = self._serialize_memory(memory, include_metadata)
                export_data["memories"].append(memory_data)
            
            if include_metadata:
                export_data["metadata"] = self._generate_export_metadata(memories)
            
            # Convert to JSON
            json_data = json.dumps(export_data, separators=(',', ':'))
            
            # Compress if requested
            if compress:
                json_data = self._compress_data(json_data)
                export_data = {"compressed": True, "data": json_data}
            
            # Generate checksum
            export_data["checksum"] = self._generate_checksum(json_data)
            
            logger.info(f"Exported {len(memories)} memories successfully")
            return export_data
            
        except Exception as e:
            logger.error(f"Failed to export memories: {e}")
            raise ExportError(f"Export failed: {e}")
    
    def export_to_chunks(
        self,
        memories: List[Memory],
        chunk_size: Optional[int] = None,
        encrypt: bool = True
    ) -> List[str]:
        """
        Export memories and split into chunks suitable for QR codes.
        
        Args:
            memories: List of memories to export
            chunk_size: Maximum size per chunk (bytes)
            encrypt: Whether to encrypt the chunks
            
        Returns:
            List of base64-encoded chunks
            
        Raises:
            ExportError: If chunking process fails
        """
        try:
            chunk_size = chunk_size or self._max_chunk_size
            
            # Export memories
            export_data = self.export_memories(memories, compress=True)
            serialized_data = json.dumps(export_data, separators=(',', ':'))
            
            # Encrypt if requested
            if encrypt and self.encryption:
                serialized_data = self.encryption.encrypt(serialized_data)
            
            # Encode to base64
            encoded_data = base64.b64encode(serialized_data.encode()).decode()
            
            # Split into chunks
            chunks = []
            total_chunks = (len(encoded_data) + chunk_size - 1) // chunk_size
            
            for i in range(0, len(encoded_data), chunk_size):
                chunk_data = encoded_data[i:i + chunk_size]
                chunk_info = {
                    "chunk_id": len(chunks),
                    "total_chunks": total_chunks,
                    "data": chunk_data,
                    "checksum": hashlib.md5(chunk_data.encode()).hexdigest()[:8]
                }
                
                chunk_json = json.dumps(chunk_info, separators=(',', ':'))
                chunks.append(base64.b64encode(chunk_json.encode()).decode())
            
            logger.info(f"Created {len(chunks)} chunks from {len(memories)} memories")
            return chunks
            
        except Exception as e:
            logger.error(f"Failed to create chunks: {e}")
            raise ExportError(f"Chunking failed: {e}")
    
    def export_collection(
        self,
        collection: MemoryCollection,
        filter_tags: Optional[List[str]] = None,
        date_range: Optional[tuple] = None
    ) -> Dict[str, Any]:
        """
        Export a memory collection with optional filtering.
        
        Args:
            collection: MemoryCollection to export
            filter_tags: Optional list of tags to filter by
            date_range: Optional tuple of (start_date, end_date)
            
        Returns:
            Dictionary containing exported collection data
            
        Raises:
            ExportError: If collection export fails
        """
        try:
            memories = collection.get_all_memories()
            
            # Apply filters
            if filter_tags:
                memories = [m for m in memories if any(tag in m.tags for tag in filter_tags)]
            
            if date_range:
                start_date, end_date = date_range
                memories = [
                    m for m in memories
                    if start_date <= m.created_at <= end_date
                ]
            
            export_data = self.export_memories(memories)
            export_data["collection_name"] = collection.name
            export_data["collection_id"] = collection.id
            
            if filter_tags:
                export_data["applied_filters"] = {"tags": filter_tags}
            
            if date_range:
                export_data["applied_filters"] = export_data.get("applied_filters", {})
                export_data["applied_filters"]["date_range"] = [
                    start_date.isoformat(),
                    end_date.isoformat()
                ]
            
            return export_data
            
        except Exception as e:
            logger.error(f"Failed to export collection: {e}")
            raise ExportError(f"Collection export failed: {e}")
    
    def export_to_file(
        self,
        memories: List[Memory],
        file_path: Union[str, Path],
        format_type: str = "json"
    ) -> None:
        """
        Export memories to a file.
        
        Args:
            memories: List of memories to export
            file_path: Path to save the exported file
            format_type: Export format ('json', 'compressed')
            
        Raises:
            ExportError: If file export fails
        """
        try:
            file_path = Path(file_path)
            
            if format_type == "json":
                export_data = self.export_memories(memories, compress=False)
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(export_data, f, indent=2)
                    
            elif format_type == "compressed":
                export_data = self.export_memories(memories, compress=True)
                serialized_data = json.dumps(export_data, separators=(',', ':'))
                
                with open(file_path, 'wb') as f:
                    f.write(gzip.compress(serialized_data.encode()))
                    
            else:
                raise ExportError(f"Unsupported format type: {format_type}")
            
            logger.info(f"Exported {len(memories)} memories to {file_path}")
            
        except Exception as e:
            logger.error(f"Failed to export to file: {e}")
            raise ExportError(f"File export failed: {e}")
    
    def _serialize_memory(self, memory: Memory, include_metadata: bool) -> Dict[str, Any]:
        """
        Serialize a single memory object.
        
        Args:
            memory: Memory object to serialize
            include_metadata: Whether to include metadata
            
        Returns:
            Dictionary representation of the memory
        """
        data = {
            "id": memory.id,
            "content": memory.content,
            "tags": memory.tags,
            "created_at": memory.created_at.isoformat(),
            "updated_at": memory.updated_at.isoformat()
        }
        
        if include_metadata and hasattr(memory, 'metadata'):
            data["metadata"] = memory.metadata
        
        if hasattr(memory, 'importance_score'):
            data["importance_score"] = memory.importance_score
        
        if hasattr(memory, 'access_count'):
            data["access_count"] = memory.access_count
        
        return data
    
    def _generate_export_metadata(self, memories: List[Memory]) -> Dict[str, Any]:
        """
        Generate metadata for the export.
        
        Args:
            memories: List of memories being exported
            
        Returns:
            Dictionary containing export metadata
        """
        all_tags = set()
        total_content_length = 0
        
        for memory in memories:
            all_tags.update(memory.tags)
            total_content_length += len(memory.content)
        
        return {
            "unique_tags": list(all_tags),
            "tag_count": len(all_tags),
            "total_content_length": total_content_length,
            "average_content_length": total_content_length / len(memories) if memories else 0
        }
    
    def _compress_data(self, data: str) -> str:
        """
        Compress data using gzip and encode to base64.
        
        Args:
            data: String data to compress
            
        Returns:
            Base64-encoded compressed data
        """
        compressed = gzip.compress(data.encode('utf-8'))
        return base64.b64encode(compressed).decode('utf-8')
    
    def _generate_checksum(self, data: str) -> str:
        """
        Generate MD5 checksum for data integrity verification.
        
        Args:
            data: Data to generate checksum for
            
        Returns:
            MD5 checksum as hex string
        """
        return hashlib.md5(data.encode('utf-8')).hexdigest()
    
    def get_export_stats(self, memories: List[Memory]) -> Dict[str, Any]:
        """
        Get statistics about memories to be exported.
        
        Args:
            memories: List of memories to analyze
            
        Returns:
            Dictionary containing export statistics
        """
        if not memories:
            return {"memory_count": 0}
        
        total_size = sum(len(json.dumps(self._serialize_memory(m, True))) for m in memories)
        estimated_chunks = (total_size + self._max_chunk_size - 1) // self._max_chunk_size
        
        return {
            "memory_count": len(memories),
            "estimated_size_bytes": total_size,
            "estimated_chunks": estimated_chunks,
            "tags": list(set(tag for memory in memories for tag in memory.tags)),
            "date_range": {
                "earliest": min(m.created_at for m in memories).isoformat(),
                "latest": max(m.created_at for m in memories).isoformat()
            }
        }
