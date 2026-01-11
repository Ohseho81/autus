/**
 * AUTUS Mobile - 5 Layers Data
 */

import { Layer, LayerId } from '../types';

export const LAYERS: Record<LayerId, Layer> = {
  L1: {
    id: 'L1',
    name: '재무',
    icon: '💰',
    nodeIds: ['n01', 'n02', 'n03', 'n04', 'n05', 'n06', 'n07', 'n08'],
  },
  L2: {
    id: 'L2',
    name: '생체',
    icon: '❤️',
    nodeIds: ['n09', 'n10', 'n11', 'n12', 'n13', 'n14'],
  },
  L3: {
    id: 'L3',
    name: '운영',
    icon: '⚙️',
    nodeIds: ['n15', 'n16', 'n17', 'n18', 'n19', 'n20', 'n21', 'n22'],
  },
  L4: {
    id: 'L4',
    name: '고객',
    icon: '👥',
    nodeIds: ['n23', 'n24', 'n25', 'n26', 'n27', 'n28', 'n29'],
  },
  L5: {
    id: 'L5',
    name: '외부',
    icon: '🌍',
    nodeIds: ['n30', 'n31', 'n32', 'n33', 'n34', 'n35', 'n36'],
  },
};

export const LAYER_ORDER: LayerId[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
