/**
 * AUTUS Mobile - Zustand Store (최적화됨)
 * shallow 비교 + 선택적 구독
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AppState, Node, Mission, Settings, TeamMember } from '../types';
import { INITIAL_NODES } from '../constants/nodes';
import { 
  INITIAL_CONNECTORS, 
  INITIAL_DEVICES, 
  INITIAL_WEB_SERVICES, 
  INITIAL_SETTINGS, 
  INITIAL_TEAM,
  INITIAL_MISSIONS 
} from '../constants/initialData';
import { saveState, loadState, clearState } from '../services/storage';
import { determineNodeState } from '../utils/calculations';

// 초기 상태
const initialState = {
  nodes: INITIAL_NODES,
  missions: INITIAL_MISSIONS,
  connectors: INITIAL_CONNECTORS,
  devices: INITIAL_DEVICES,
  webServices: INITIAL_WEB_SERVICES,
  settings: INITIAL_SETTINGS,
  team: INITIAL_TEAM,
};

export const useAutusStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Node Actions
    setNodes: (nodes) => {
      set({ nodes });
      get().saveToStorage();
    },

    toggleNode: (id) => {
      set((state) => ({
        nodes: {
          ...state.nodes,
          [id]: {
            ...state.nodes[id],
            active: !state.nodes[id].active,
          },
        },
      }));
      get().saveToStorage();
    },

    updateNodePressure: (id, pressure) => {
      set((state) => ({
        nodes: {
          ...state.nodes,
          [id]: {
            ...state.nodes[id],
            pressure,
            state: determineNodeState(pressure),
          },
        },
      }));
      get().saveToStorage();
    },

    // Mission Actions
    addMission: (mission) => {
      const newMission: Mission = {
        ...mission,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        missions: [...state.missions, newMission],
      }));
      get().saveToStorage();
    },

    updateMission: (id, updates) => {
      set((state) => ({
        missions: state.missions.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }));
      get().saveToStorage();
    },

    deleteMission: (id) => {
      set((state) => ({
        missions: state.missions.filter((m) => m.id !== id),
      }));
      get().saveToStorage();
    },

    // Connector Actions
    toggleConnector: (id) => {
      set((state) => ({
        connectors: state.connectors.map((c) =>
          c.id === id ? { ...c, on: !c.on } : c
        ),
      }));
      get().saveToStorage();
    },

    toggleDevice: (id) => {
      set((state) => ({
        devices: state.devices.map((d) =>
          d.id === id ? { ...d, on: !d.on } : d
        ),
      }));
      get().saveToStorage();
    },

    toggleWebService: (id) => {
      set((state) => ({
        webServices: state.webServices.map((w) =>
          w.id === id ? { ...w, on: !w.on } : w
        ),
      }));
      get().saveToStorage();
    },

    connectAllWebServices: () => {
      set((state) => ({
        webServices: state.webServices.map((w) => ({ ...w, on: true })),
      }));
      get().saveToStorage();
    },

    // Settings Actions
    updateSettings: (updates) => {
      set((state) => ({
        settings: { ...state.settings, ...updates },
      }));
      get().saveToStorage();
    },

    // Team Actions
    addTeamMember: (member) => {
      const newMember: TeamMember = {
        ...member,
        id: Date.now(),
      };
      set((state) => ({
        team: [...state.team, newMember],
      }));
      get().saveToStorage();
    },

    removeTeamMember: (id) => {
      set((state) => ({
        team: state.team.filter((t) => t.id !== id),
      }));
      get().saveToStorage();
    },

    // Storage Actions
    resetAll: async () => {
      await clearState();
      set(initialState);
    },

    loadFromStorage: async () => {
      const data = await loadState();
      if (data) {
        set({
          nodes: data.nodes || INITIAL_NODES,
          missions: data.missions || INITIAL_MISSIONS,
          connectors: data.connectors || INITIAL_CONNECTORS,
          devices: data.devices || INITIAL_DEVICES,
          webServices: data.webServices || INITIAL_WEB_SERVICES,
          settings: data.settings || INITIAL_SETTINGS,
          team: data.team || INITIAL_TEAM,
        });
      }
    },

    saveToStorage: async () => {
      const { nodes, missions, connectors, devices, webServices, settings, team } = get();
      await saveState({
        nodes,
        missions,
        connectors,
        devices,
        webServices,
        settings,
        team,
      });
    },
  }))
);

// 선택적 구독을 위한 셀렉터들
export const selectNodes = (state: AppState) => state.nodes;
export const selectMissions = (state: AppState) => state.missions;
export const selectSettings = (state: AppState) => state.settings;
export const selectConnectors = (state: AppState) => state.connectors;
export const selectDevices = (state: AppState) => state.devices;
export const selectWebServices = (state: AppState) => state.webServices;
export const selectTeam = (state: AppState) => state.team;
