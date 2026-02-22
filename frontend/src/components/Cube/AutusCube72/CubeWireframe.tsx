/**
 * AUTUS 72³ Cube Wireframe Component
 */

import React from 'react';

const CubeWireframe: React.FC = () => {
  const size = 400;
  const half = size / 2;

  const edges = [
    // Bottom
    { from: [-half, -half, -half], to: [half, -half, -half] },
    { from: [half, -half, -half], to: [half, -half, half] },
    { from: [half, -half, half], to: [-half, -half, half] },
    { from: [-half, -half, half], to: [-half, -half, -half] },
    // Top
    { from: [-half, half, -half], to: [half, half, -half] },
    { from: [half, half, -half], to: [half, half, half] },
    { from: [half, half, half], to: [-half, half, half] },
    { from: [-half, half, half], to: [-half, half, -half] },
    // Verticals
    { from: [-half, -half, -half], to: [-half, half, -half] },
    { from: [half, -half, -half], to: [half, half, -half] },
    { from: [half, -half, half], to: [half, half, half] },
    { from: [-half, -half, half], to: [-half, half, half] },
  ];

  return (
    <>
      {edges.map((edge, i) => {
        const [x1, y1, z1] = edge.from;
        const [x2, y2, z2] = edge.to;
        const length = Math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${length}px`,
              height: '1px',
              backgroundColor: 'rgba(0, 212, 255, 0.15)',
              transformOrigin: '0 50%',
              transform: `
                translate3d(${x1}px, ${-y1}px, ${z1}px)
                rotateY(${Math.atan2(dz, dx) * 180 / Math.PI}deg)
                rotateZ(${-Math.atan2(dy, Math.sqrt(dx*dx + dz*dz)) * 180 / Math.PI}deg)
              `,
            }}
          />
        );
      })}
    </>
  );
};

export default CubeWireframe;
