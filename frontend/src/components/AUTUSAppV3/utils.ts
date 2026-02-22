import type { Node, NodeState } from './types';
import { CSS } from './styles';

export const fmt = (n: Node): string => {
  const v = n.value;
  if (['n01','n02','n03','n04','n06','n07','n27','n28'].includes(n.id)) {
    if (v >= 10000000) return (v/10000000).toFixed(1)+'천만';
    if (v >= 10000) return (v/10000).toFixed(0)+'만';
    return v.toLocaleString();
  }
  if (n.id === 'n05') return v+'주';
  if (['n09','n12','n13'].includes(n.id)) return v.toFixed(1)+'h';
  if (n.id === 'n10') return v+'ms';
  if (['n08','n17','n19','n24','n26','n31','n33','n34','n35'].includes(n.id)) return v+'%';
  if (n.id === 'n29') return v+'/주';
  return String(v);
};

export const pColor = (p: number): string => p >= 0.7 ? CSS.danger : p >= 0.3 ? CSS.warning : CSS.success;
export const sClass = (s: NodeState): string => s === 'IRREVERSIBLE' ? 'danger' : s === 'PRESSURING' ? 'warning' : '';
