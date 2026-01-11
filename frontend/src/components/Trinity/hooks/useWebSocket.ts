/**
 * AUTUS Trinity - WebSocket Hook (Real-time Updates)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTrinityStore } from '../../../stores/trinityStore';
import { WS_CONFIG } from '../constants';
import { NodeData } from '../types';

interface WSMessage {
  type: 'node_update' | 'task_update' | 'alert' | 'sync';
  payload: unknown;
}

interface NodeUpdatePayload {
  nodeId: string;
  updates: Partial<NodeData>;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { setConnected, updateNode, setNodes } = useTrinityStore();

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'node_update': {
          const { nodeId, updates } = message.payload as NodeUpdatePayload;
          updateNode(nodeId, updates);
          break;
        }
        
        case 'sync': {
          const nodes = message.payload as NodeData[];
          if (nodes && nodes.length > 0) {
            setNodes(nodes);
          }
          break;
        }
        
        case 'alert': {
          // Could trigger a notification here
          console.log('[Trinity WS] Alert:', message.payload);
          break;
        }
        
        default:
          console.debug('[Trinity WS] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Trinity WS] Failed to parse message:', error);
    }
  }, [updateNode, setNodes]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket(WS_CONFIG.url);

      wsRef.current.onopen = () => {
        console.log('[Trinity WS] Connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = () => {
        console.log('[Trinity WS] Disconnected');
        setConnected(false);
        
        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < WS_CONFIG.maxReconnectAttempts) {
          const delay = WS_CONFIG.reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[Trinity WS] Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[Trinity WS] Error:', error);
      };
    } catch (error) {
      console.error('[Trinity WS] Failed to connect:', error);
    }
  }, [handleMessage, setConnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnected(false);
  }, [setConnected]);

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: useTrinityStore(state => state.isConnected),
    send,
    reconnect: connect,
    disconnect
  };
}
