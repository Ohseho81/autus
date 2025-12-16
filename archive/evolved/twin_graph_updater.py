"""
twin_graph_updater.py

Part of reality_stream_minimal: Minimal Reality Stream - receive IoT events and update Twin graph.
Handles updating digital twin graph representations based on incoming IoT events.
"""

import json
import logging
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum


class NodeType(Enum):
    """Types of nodes in the twin graph."""
    DEVICE = "device"
    SENSOR = "sensor"
    LOCATION = "location"
    SYSTEM = "system"


class EdgeType(Enum):
    """Types of relationships between nodes."""
    CONTAINS = "contains"
    CONNECTS_TO = "connects_to"
    LOCATED_AT = "located_at"
    MONITORS = "monitors"


@dataclass
class GraphNode:
    """Represents a node in the twin graph."""
    id: str
    type: NodeType
    properties: Dict[str, Any]
    last_updated: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert node to dictionary representation."""
        return {
            "id": self.id,
            "type": self.type.value,
            "properties": self.properties,
            "last_updated": self.last_updated.isoformat()
        }


@dataclass
class GraphEdge:
    """Represents an edge in the twin graph."""
    source_id: str
    target_id: str
    type: EdgeType
    properties: Dict[str, Any]
    last_updated: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert edge to dictionary representation."""
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "type": self.type.value,
            "properties": self.properties,
            "last_updated": self.last_updated.isoformat()
        }


@dataclass
class IoTEvent:
    """Represents an IoT event that triggers graph updates."""
    device_id: str
    event_type: str
    timestamp: datetime
    payload: Dict[str, Any]
    location: Optional[str] = None
    
    @classmethod
    def from_json(cls, json_str: str) -> 'IoTEvent':
        """Create IoTEvent from JSON string."""
        data = json.loads(json_str)
        return cls(
            device_id=data["device_id"],
            event_type=data["event_type"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            payload=data["payload"],
            location=data.get("location")
        )


class TwinGraphUpdater:
    """Manages updates to the digital twin graph based on IoT events."""
    
    def __init__(self) -> None:
        """Initialize the twin graph updater."""
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, GraphEdge] = {}
        self.logger = logging.getLogger(__name__)
        
    def process_iot_event(self, event: IoTEvent) -> bool:
        """
        Process an IoT event and update the twin graph accordingly.
        
        Args:
            event: The IoT event to process
            
        Returns:
            True if graph was updated successfully, False otherwise
        """
        try:
            self.logger.info(f"Processing IoT event from device {event.device_id}")
            
            # Ensure device node exists
            self._ensure_device_node(event.device_id, event.timestamp)
            
            # Update device properties based on event
            self._update_device_properties(event)
            
            # Handle location relationships
            if event.location:
                self._update_location_relationship(event.device_id, event.location, event.timestamp)
            
            # Process event-specific updates
            self._process_event_specific_updates(event)
            
            self.logger.info(f"Successfully processed event from {event.device_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error processing IoT event: {e}")
            return False
    
    def _ensure_device_node(self, device_id: str, timestamp: datetime) -> None:
        """Ensure a device node exists in the graph."""
        if device_id not in self.nodes:
            self.nodes[device_id] = GraphNode(
                id=device_id,
                type=NodeType.DEVICE,
                properties={"status": "active"},
                last_updated=timestamp
            )
            self.logger.debug(f"Created new device node: {device_id}")
    
    def _update_device_properties(self, event: IoTEvent) -> None:
        """Update device node properties based on event data."""
        device_node = self.nodes[event.device_id]
        
        # Update general properties
        device_node.properties["last_event_type"] = event.event_type
        device_node.properties["last_seen"] = event.timestamp.isoformat()
        device_node.last_updated = event.timestamp
        
        # Merge payload data into properties
        for key, value in event.payload.items():
            device_node.properties[f"sensor_{key}"] = value
    
    def _update_location_relationship(self, device_id: str, location: str, timestamp: datetime) -> None:
        """Update or create location relationship for a device."""
        # Ensure location node exists
        if location not in self.nodes:
            self.nodes[location] = GraphNode(
                id=location,
                type=NodeType.LOCATION,
                properties={"name": location},
                last_updated=timestamp
            )
        
        # Create or update location edge
        edge_id = f"{device_id}_located_at_{location}"
        self.edges[edge_id] = GraphEdge(
            source_id=device_id,
            target_id=location,
            type=EdgeType.LOCATED_AT,
            properties={},
            last_updated=timestamp
        )
    
    def _process_event_specific_updates(self, event: IoTEvent) -> None:
        """Process updates specific to event types."""
        if event.event_type == "sensor_reading":
            self._handle_sensor_reading(event)
        elif event.event_type == "device_status":
            self._handle_device_status(event)
        elif event.event_type == "connection_event":
            self._handle_connection_event(event)
    
    def _handle_sensor_reading(self, event: IoTEvent) -> None:
        """Handle sensor reading events."""
        device_node = self.nodes[event.device_id]
        
        # Update sensor-specific properties
        for sensor_type, reading in event.payload.items():
            device_node.properties[f"current_{sensor_type}"] = reading
            
            # Create sensor nodes if they don't exist
            sensor_id = f"{event.device_id}_{sensor_type}"
            if sensor_id not in self.nodes:
                self.nodes[sensor_id] = GraphNode(
                    id=sensor_id,
                    type=NodeType.SENSOR,
                    properties={"sensor_type": sensor_type},
                    last_updated=event.timestamp
                )
                
                # Create monitoring relationship
                edge_id = f"{sensor_id}_monitors_{event.device_id}"
                self.edges[edge_id] = GraphEdge(
                    source_id=sensor_id,
                    target_id=event.device_id,
                    type=EdgeType.MONITORS,
                    properties={},
                    last_updated=event.timestamp
                )
    
    def _handle_device_status(self, event: IoTEvent) -> None:
        """Handle device status change events."""
        device_node = self.nodes[event.device_id]
        
        if "status" in event.payload:
            device_node.properties["status"] = event.payload["status"]
        
        if "battery_level" in event.payload:
            device_node.properties["battery_level"] = event.payload["battery_level"]
    
    def _handle_connection_event(self, event: IoTEvent) -> None:
        """Handle device connection events."""
        if "connected_to" in event.payload:
            target_device = event.payload["connected_to"]
            
            # Ensure target device node exists
            self._ensure_device_node(target_device, event.timestamp)
            
            # Create connection edge
            edge_id = f"{event.device_id}_connects_to_{target_device}"
            self.edges[edge_id] = GraphEdge(
                source_id=event.device_id,
                target_id=target_device,
                type=EdgeType.CONNECTS_TO,
                properties={"connection_type": event.payload.get("connection_type", "unknown")},
                last_updated=event.timestamp
            )
    
    def get_node(self, node_id: str) -> Optional[GraphNode]:
        """Get a node by ID."""
        return self.nodes.get(node_id)
    
    def get_edges_for_node(self, node_id: str) -> List[GraphEdge]:
        """Get all edges connected to a node."""
        return [
            edge for edge in self.edges.values()
            if edge.source_id == node_id or edge.target_id == node_id
        ]
    
    def remove_node(self, node_id: str) -> bool:
        """
        Remove a node and all its edges from the graph.
        
        Args:
            node_id: ID of the node to remove
            
        Returns:
            True if node was removed, False if not found
        """
        if node_id not in self.nodes:
            return False
        
        # Remove all edges connected to this node
        edges_to_remove = [
            edge_id for edge_id, edge in self.edges.items()
            if edge.source_id == node_id or edge.target_id == node_id
        ]
        
        for edge_id in edges_to_remove:
            del self.edges[edge_id]
        
        # Remove the node
        del self.nodes[node_id]
        
        self.logger.info(f"Removed node {node_id} and {len(edges_to_remove)} connected edges")
        return True
    
    def get_graph_snapshot(self) -> Dict[str, Any]:
        """Get a complete snapshot of the current graph state."""
        return {
            "nodes": [node.to_dict() for node in self.nodes.values()],
            "edges": [edge.to_dict() for edge in self.edges.values()],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "node_count": len(self.nodes),
            "edge_count": len(self.edges)
        }
    
    def load_graph_snapshot(self, snapshot: Dict[str, Any]) -> bool:
        """
        Load graph state from a snapshot.
        
        Args:
            snapshot: Graph snapshot to load
            
        Returns:
            True if loaded successfully, False otherwise
        """
        try:
            # Clear current state
            self.nodes.clear()
            self.edges.clear()
            
            # Load nodes
            for node_data in snapshot["nodes"]:
                node = GraphNode(
                    id=node_data["id"],
                    type=NodeType(node_data["type"]),
                    properties=node_data["properties"],
                    last_updated=datetime.fromisoformat(node_data["last_updated"])
                )
                self.nodes[node.id] = node
            
            # Load edges
            for edge_data in snapshot["edges"]:
                edge = GraphEdge(
                    source_id=edge_data["source_id"],
                    target_id=edge_data["target_id"],
                    type=EdgeType(edge_data["type"]),
                    properties=edge_data["properties"],
                    last_updated=datetime.fromisoformat(edge_data["last_updated"])
                )
                edge_id = f"{edge.source_id}_{edge.type.value}_{edge.target_id}"
                self.edges[edge_id] = edge
            
            self.logger.info(f"Loaded graph snapshot with {len(self.nodes)} nodes and {len(self.edges)} edges")
            return True
            
        except Exception as e:
            self.logger.error(f"Error loading graph snapshot: {e}")
            return False
    
    def cleanup_stale_nodes(self, max_age_hours: int = 24) -> int:
        """
        Remove nodes that haven't been updated within the specified time.
        
        Args:
            max_age_hours: Maximum age in hours before a node is considered stale
            
        Returns:
            Number of nodes removed
        """
        cutoff_time = datetime.now(timezone.utc) - pd.Timedelta(hours=max_age_hours)
        stale_nodes = [
            node_id for node_id, node in self.nodes.items()
            if node.last_updated.replace(tzinfo=timezone.utc) < cutoff_time
        ]
        
        removed_count = 0
        for node_id in stale_nodes:
            if self.remove_node(node_id):
                removed_count += 1
        
        self.logger.info(f"Cleaned up {removed_count} stale nodes")
        return removed_count
