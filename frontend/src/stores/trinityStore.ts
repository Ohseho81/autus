/**
 * AUTUS Trinity - Zustand Store
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { TrinityState, Role, Task, NodeData } from '../components/Trinity/types';
import { INITIAL_NODES, INITIAL_TASKS } from '../components/Trinity/constants';

// Generate unique ID
const generateId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useTrinityStore = create<TrinityState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      role: 'architect',
      selectedNode: null,
      selectedMacro: null,
      openTaskId: null,
      actionDone: false,
      nodes: INITIAL_NODES,
      tasks: INITIAL_TASKS,
      isLoading: false,
      isConnected: false,

      // Role actions
      setRole: (role: Role) => set({ 
        role, 
        selectedNode: null, 
        selectedMacro: null, 
        actionDone: false 
      }),

      // Selection actions
      selectNode: (idx: number | null) => set({ 
        selectedNode: idx, 
        selectedMacro: null, 
        actionDone: false 
      }),

      selectMacro: (idx: number | null) => set({ 
        selectedMacro: idx 
      }),

      setOpenTaskId: (id: string | null) => set({ 
        openTaskId: id 
      }),

      setActionDone: (done: boolean) => set({ 
        actionDone: done 
      }),

      // Task actions
      addTask: (text: string, icon: string) => {
        const newTask: Task = {
          id: generateId(),
          text,
          icon,
          type: '물리삭제',
          deadline: '2주',
          progress: 0
        };
        
        set((state) => ({
          tasks: {
            ...state.tasks,
            worker: [newTask, ...state.tasks.worker]
          },
          role: 'worker',
          actionDone: true
        }));
      },

      updateTask: (id: string, updates: Partial<Task>) => {
        set((state) => {
          const newTasks = { ...state.tasks };
          
          for (const role of Object.keys(newTasks) as Role[]) {
            const taskIndex = newTasks[role].findIndex(t => t.id === id);
            if (taskIndex !== -1) {
              newTasks[role] = [
                ...newTasks[role].slice(0, taskIndex),
                { ...newTasks[role][taskIndex], ...updates },
                ...newTasks[role].slice(taskIndex + 1)
              ];
              break;
            }
          }
          
          return { tasks: newTasks };
        });
      },

      completeTask: (id: string) => {
        const { updateTask } = get();
        updateTask(id, { progress: 100 });
      },

      closeAll: () => set({ 
        selectedNode: null, 
        selectedMacro: null, 
        actionDone: false 
      }),

      // Data actions
      setNodes: (nodes: NodeData[]) => set({ nodes }),

      updateNode: (id: string, updates: Partial<NodeData>) => {
        set((state) => ({
          nodes: state.nodes.map(node => 
            node.id === id ? { ...node, ...updates } : node
          )
        }));
      },

      setConnected: (connected: boolean) => set({ isConnected: connected }),

      setLoading: (loading: boolean) => set({ isLoading: loading })
    })),
    { name: 'trinity-store' }
  )
);

// Selectors for optimized re-renders
export const selectRole = (state: TrinityState) => state.role;
export const selectSelectedNode = (state: TrinityState) => state.selectedNode;
export const selectSelectedMacro = (state: TrinityState) => state.selectedMacro;
export const selectNodes = (state: TrinityState) => state.nodes;
export const selectTasks = (state: TrinityState) => state.tasks;
export const selectIsConnected = (state: TrinityState) => state.isConnected;
export const selectIsLoading = (state: TrinityState) => state.isLoading;
export const selectActionDone = (state: TrinityState) => state.actionDone;
export const selectOpenTaskId = (state: TrinityState) => state.openTaskId;

// Derived selectors
export const selectCurrentNode = (state: TrinityState) => 
  state.selectedNode !== null ? state.nodes[state.selectedNode] : null;

export const selectCurrentMacro = (state: TrinityState) => {
  const node = selectCurrentNode(state);
  return node && state.selectedMacro !== null ? node.macros[state.selectedMacro] : null;
};

export const selectCurrentTasks = (state: TrinityState) => 
  state.tasks[state.role];

export const selectTaskCount = (state: TrinityState) => 
  state.tasks[state.role].length;

export const selectTotalNetWorth = (state: TrinityState) => {
  const capitalNode = state.nodes.find(n => n.id === 'capital');
  return capitalNode?.status.d || '₩0';
};
