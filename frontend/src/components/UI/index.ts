/**
 * UI Components Export
 */

import React from 'react';

export { VoiceControl } from './VoiceControl';

// Stub exports
export const Button = () => null;
export const Card = () => null;
export const Input = () => null;
export const Modal = () => null;
export const Badge = () => null;
export const PriorityAlert = () => null;

// Tooltip component
export const Tooltip: React.FC<{ children: React.ReactNode; term?: string; position?: string }> = ({ children }) => {
  return React.createElement('span', null, children);
};

// NodeDetailModal
export const NodeDetailModal = () => null;

// AUTUS Glossary
export const AUTUS_GLOSSARY: Record<string, string> = {
  'value': '노드의 현재 값 (0-1)',
  'confidence': '측정 신뢰도',
  'uncertainty': '불확실성 수준',
  'impact': '영향도',
};
