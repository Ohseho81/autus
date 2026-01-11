/**
 * AUTUS Trinity - Data Hook (API Integration)
 */

import { useEffect, useCallback, useRef } from 'react';
import { useTrinityStore } from '../../../stores/trinityStore';
import { API_CONFIG } from '../constants';
import { NodeData, Task, Role } from '../types';

interface TrinityAPIResponse {
  nodes: NodeData[];
  tasks: Record<Role, Task[]>;
  netWorth: string;
  forecast: {
    maintain: string;
    improve: string;
    challenge: string;
  };
}

export function useTrinityData() {
  const { nodes, tasks, setNodes, setLoading, isLoading } = useTrinityStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_CONFIG.baseUrl}/api/trinity/state`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: TrinityAPIResponse = await response.json();
      
      if (data.nodes && data.nodes.length > 0) {
        setNodes(data.nodes);
      }
      
      // Tasks could be updated here too if needed
      // setTasks(data.tasks);
      
    } catch (error) {
      // Silently fail - use initial data
      console.debug('[Trinity] API not available, using local data');
    } finally {
      setLoading(false);
    }
  }, [setNodes, setLoading]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Set up periodic refresh
    intervalRef.current = setInterval(() => {
      fetchData();
    }, API_CONFIG.refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData]);

  return {
    nodes,
    tasks,
    isLoading,
    refetch
  };
}

// Hook for specific node data
export function useNodeData(nodeId: string) {
  const nodes = useTrinityStore(state => state.nodes);
  return nodes.find(n => n.id === nodeId) || null;
}

// Hook for task operations
export function useTaskActions() {
  const { addTask, updateTask, completeTask } = useTrinityStore();
  
  const delegateTask = useCallback((id: string, assignee: string) => {
    updateTask(id, { 
      type: '위임',
      text: useTrinityStore.getState().tasks.worker.find(t => t.id === id)?.text + ` → ${assignee}`
    });
  }, [updateTask]);

  return {
    addTask,
    updateTask,
    completeTask,
    delegateTask
  };
}
