/**
 * AUTUS Mobile - 5 Circuits Data
 */

import { Circuit } from '../types';

export const CIRCUITS: Circuit[] = [
  {
    id: 'survival',
    name: 'survival',
    nameKr: '생존',
    nodeIds: ['n03', 'n01', 'n05'],
    value: 0.40,
  },
  {
    id: 'fatigue',
    name: 'fatigue',
    nameKr: '피로',
    nodeIds: ['n18', 'n09', 'n10', 'n16'],
    value: 0.43,
  },
  {
    id: 'repeat',
    name: 'repeat',
    nameKr: '반복자본',
    nodeIds: ['n26', 'n02', 'n01'],
    value: 0.15,
  },
  {
    id: 'people',
    name: 'people',
    nameKr: '인력',
    nodeIds: ['n31', 'n17', 'n20'],
    value: 0.08,
  },
  {
    id: 'growth',
    name: 'growth',
    nameKr: '성장',
    nodeIds: ['n29', 'n23', 'n02'],
    value: 0.15,
  },
];
