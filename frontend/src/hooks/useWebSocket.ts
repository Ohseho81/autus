/**
 * AUTUS WebSocket Hook
 * Socket.io 기반 실시간 데이터 바인딩
 * 
 * 기능:
 * - Neo4j 그래프 변경 실시간 수신
 * - 자동 재연결
 * - 연결 상태 관리
 * - 타입 안전 이벤트 핸들링
 */

import { useEffect, useRef, useState, useCallback } from "react";

// Socket.io 타입 (런타임에서 동적 로드)
type Socket = any;

interface WebSocketConfig {
  url?: string;
  path?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseWebSocketReturn<T = any> {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  data: T | null;
  lastUpdate: Date | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string) => void;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  url: typeof window !== "undefined" ? window.location.origin : "http://localhost:8000",
  path: "/ws/socket.io",
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 3000,
};

export function useWebSocket<T = any>(
  config: WebSocketConfig = {}
): UseWebSocketReturn<T> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  // 연결
  const connect = useCallback(async () => {
    if (socketRef.current?.connected || isConnecting) return;

    try {
      setIsConnecting(true);
      setError(null);

      // Socket.io 동적 임포트
      const { io } = await import("socket.io-client");

      socketRef.current = io(mergedConfig.url!, {
        path: mergedConfig.path,
        reconnection: mergedConfig.reconnection,
        reconnectionAttempts: mergedConfig.reconnectionAttempts,
        reconnectionDelay: mergedConfig.reconnectionDelay,
        transports: ["websocket", "polling"],
      });

      // 연결 이벤트
      socketRef.current.on("connect", () => {
        console.log("🔌 WebSocket 연결됨");
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      });

      // 연결 해제 이벤트
      socketRef.current.on("disconnect", (reason: string) => {
        console.log("🔌 WebSocket 연결 해제:", reason);
        setIsConnected(false);
      });

      // 연결 오류
      socketRef.current.on("connect_error", (err: Error) => {
        console.error("🔌 WebSocket 연결 오류:", err.message);
        setError(err.message);
        setIsConnecting(false);
      });

      // 기본 데이터 수신 핸들러
      socketRef.current.on("data", (newData: T) => {
        setData(newData);
        setLastUpdate(new Date());
      });

      // 그래프 업데이트 핸들러
      socketRef.current.on("graph_update", (graphData: any) => {
        setData(graphData as T);
        setLastUpdate(new Date());
        
        // 등록된 핸들러 실행
        const handlers = eventHandlersRef.current.get("graph_update");
        handlers?.forEach((handler) => handler(graphData));
      });

    } catch (err) {
      console.error("WebSocket 초기화 실패:", err);
      setError("WebSocket 초기화 실패");
      setIsConnecting(false);
    }
  }, [mergedConfig, isConnecting]);

  // 연결 해제
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // 이벤트 발송
  const emit = useCallback((event: string, eventData: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, eventData);
    } else {
      console.warn("WebSocket이 연결되지 않았습니다.");
    }
  }, []);

  // 이벤트 리스너 등록
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(callback);

    // 소켓에도 등록
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  // 이벤트 리스너 제거
  const off = useCallback((event: string) => {
    eventHandlersRef.current.delete(event);
    if (socketRef.current) {
      socketRef.current.off(event);
    }
  }, []);

  // 자동 연결
  useEffect(() => {
    if (mergedConfig.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    data,
    lastUpdate,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}

/**
 * AUTUS 그래프 전용 WebSocket Hook
 */
export function useGraphWebSocket() {
  const ws = useWebSocket<{
    nodes: any[];
    edges: any[];
  }>();

  const subscribeToUser = useCallback((userId: string) => {
    ws.emit("subscribe_user", { user_id: userId });
  }, [ws]);

  const unsubscribeFromUser = useCallback((userId: string) => {
    ws.emit("unsubscribe_user", { user_id: userId });
  }, [ws]);

  const requestGraphUpdate = useCallback((userId: string) => {
    ws.emit("request_graph", { user_id: userId });
  }, [ws]);

  return {
    ...ws,
    subscribeToUser,
    unsubscribeFromUser,
    requestGraphUpdate,
  };
}

export default useWebSocket;
