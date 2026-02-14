/**
 * AUTUS 72³ Axis Labels Component
 */

import React from 'react';

const AxisLabels: React.FC = () => {
  return (
    <>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate3d(220px, 0, 0)',
        color: '#ff4444',
        fontSize: '11px',
        fontWeight: 600,
      }}>X (WHO)</div>

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate3d(0, -220px, 0)',
        color: '#44ff44',
        fontSize: '11px',
        fontWeight: 600,
      }}>Y (WHAT)</div>

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate3d(0, 0, 220px)',
        color: '#4444ff',
        fontSize: '11px',
        fontWeight: 600,
      }}>Z (HOW)</div>
    </>
  );
};

export default AxisLabels;
