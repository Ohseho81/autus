/**
 * AUTUS Trinity - HexSVG Component
 * 전체 화면 육각형 시각화
 */

import React, { useMemo, memo, useEffect, useState } from 'react';
import { useTrinityStore, selectRole, selectNodes } from '../../stores/trinityStore';
import { ROLE_COLORS } from './constants';
import { HexSVGProps, NodeData } from './types';

// 포인트 계산 함수
const calculatePoints = (
  nodes: NodeData[],
  cx: number,
  cy: number,
  radius: number,
  key: 'goal' | 'status' | 'progress'
) => {
  return nodes.map(n => {
    const a = (n.angle * Math.PI) / 180;
    const r = (radius * n[key].v) / 100;
    return { x: cx + Math.cos(a) * r, y: cy - Math.sin(a) * r };
  });
};

// SVG 경로 변환
const toPath = (pts: { x: number; y: number }[]) => {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('') + 'Z';
};

const HexSVG = memo(function HexSVG({ mini, onNodeClick }: HexSVGProps) {
  const role = useTrinityStore(selectRole);
  const nodes = useTrinityStore(selectNodes);
  
  // 반응형 크기 계산
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  
  useEffect(() => {
    const updateDimensions = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // 헤더(60px) 제외하고 화면에 맞춤
      const size = Math.min(vw * 0.85, vh - 100);
      setDimensions({ width: size, height: size });
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // mini 모드일 때는 작게
  const size = mini ? 160 : dimensions.width;
  const cx = size / 2;
  const cy = size / 2;
  const R = mini ? 60 : size * 0.38;  // 반지름
  const r2 = R * 0.8;
  const r3 = R * 0.6;
  const rc = ROLE_COLORS[role];

  // 메모이제이션된 경로 계산
  const { goalPath, statusPath, progressPath } = useMemo(() => {
    const goalPts = calculatePoints(nodes, cx, cy, R, 'goal');
    const statusPts = calculatePoints(nodes, cx, cy, r2, 'status');
    const progressPts = calculatePoints(nodes, cx, cy, r3, 'progress');

    return {
      goalPath: toPath(goalPts),
      statusPath: toPath(statusPts),
      progressPath: toPath(progressPts),
    };
  }, [nodes, cx, cy, R, r2, r3]);

  // 그리드 라인
  const gridPolygons = useMemo(() => {
    if (mini) return null;
    return [1, 2, 3, 4, 5].map((i) => {
      const gr = (R * i) / 5;
      const points = nodes
        .map((n) => {
          const a = (n.angle * Math.PI) / 180;
          return `${cx + Math.cos(a) * gr},${cy - Math.sin(a) * gr}`;
        })
        .join(' ');
      return <polygon key={i} points={points} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />;
    });
  }, [mini, nodes, cx, cy, R]);

  // 축 라인
  const axisLines = useMemo(() => {
    if (mini) return null;
    return nodes.map((n, i) => {
      const a = (n.angle * Math.PI) / 180;
      return (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(a) * R * 1.1}
          y2={cy - Math.sin(a) * R * 1.1}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="1"
        />
      );
    });
  }, [mini, nodes, cx, cy, R]);

  // 노드 크기 계산
  const nodeRadius = mini ? 10 : Math.max(28, size * 0.055);
  const fontSize = mini ? 10 : Math.max(18, size * 0.035);
  const labelFontSize = mini ? 8 : Math.max(11, size * 0.022);

  // 노드 엘리먼트
  const nodeElements = useMemo(() => {
    return nodes.map((n, i) => {
      const a = (n.angle * Math.PI) / 180;
      const x = cx + Math.cos(a) * R;
      const y = cy - Math.sin(a) * R;
      const val = role === 'architect' ? n.goal.v : role === 'analyst' ? n.status.v : n.progress.v;
      const dv = role === 'architect' ? n.goal.d : role === 'analyst' ? n.status.d : n.progress.d;
      const circ = 2 * Math.PI * (nodeRadius + 6);
      const off = circ * (1 - val / 100);

      return (
        <g
          key={i}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onNodeClick(i);
          }}
          className="group"
        >
          {/* 외부 진행 링 */}
          {!mini && (
            <>
              <circle
                cx={x}
                cy={y}
                r={nodeRadius + 6}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="3"
              />
              <circle
                cx={x}
                cy={y}
                r={nodeRadius + 6}
                fill="none"
                stroke={rc}
                strokeWidth="3"
                strokeDasharray={circ}
                strokeDashoffset={off}
                transform={`rotate(-90 ${x} ${y})`}
                className="transition-all duration-700"
                style={{ filter: `drop-shadow(0 0 8px ${rc}50)` }}
              />
            </>
          )}
          
          {/* 노드 배경 (호버 효과) */}
          <circle
            cx={x}
            cy={y}
            r={nodeRadius + 2}
            fill="transparent"
            className="group-hover:fill-[rgba(139,92,246,0.1)] transition-all duration-300"
          />
          
          {/* 노드 메인 */}
          <circle
            cx={x}
            cy={y}
            r={nodeRadius}
            fill="rgba(8,8,12,0.95)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
            className="group-hover:stroke-[rgba(139,92,246,0.5)] transition-all duration-300"
          />
          
          {/* 아이콘 */}
          <text
            x={x}
            y={y + fontSize * 0.1}
            fontSize={fontSize}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none"
          >
            {n.icon}
          </text>
          
          {/* 라벨 */}
          {!mini && (
            <>
              <text
                x={x}
                y={y + nodeRadius + labelFontSize * 1.5}
                fill="rgba(255,255,255,0.7)"
                fontSize={labelFontSize}
                fontWeight="600"
                textAnchor="middle"
                className="select-none"
              >
                {n.name}
              </text>
              <text
                x={x}
                y={y + nodeRadius + labelFontSize * 2.8}
                fill={rc}
                fontSize={labelFontSize * 0.9}
                fontWeight="500"
                textAnchor="middle"
                className="select-none"
              >
                {dv}
              </text>
            </>
          )}
        </g>
      );
    });
  }, [nodes, mini, cx, cy, R, role, rc, nodeRadius, fontSize, labelFontSize, onNodeClick]);

  // 중앙 허브 크기
  const hubRadius = mini ? 18 : size * 0.09;
  const hubFontSize = mini ? 10 : Math.max(16, size * 0.032);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="transition-all duration-500"
      style={{ 
        width: mini ? 160 : '100%', 
        height: mini ? 160 : '100%',
        maxWidth: size,
        maxHeight: size
      }}
      aria-label="Trinity Hexagon"
    >
      <defs>
        <linearGradient id="gG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="sG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation={mini ? 2 : 6} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* 배경 그리드 */}
      {gridPolygons}
      {axisLines}

      {/* 목표 레이어 (외곽) */}
      <path
        d={goalPath}
        fill="rgba(251,191,36,0.02)"
        stroke="url(#gG)"
        strokeWidth={mini ? 1 : 2.5}
        strokeDasharray="8 4"
        filter="url(#glow)"
        className="transition-all duration-700"
      />
      
      {/* 현재 레이어 (중간) */}
      <path
        d={statusPath}
        fill="rgba(167,139,250,0.03)"
        stroke="url(#sG)"
        strokeWidth={mini ? 1.5 : 3}
        filter="url(#glow)"
        className="transition-all duration-700"
      />
      
      {/* 진행 레이어 (내부) */}
      <path
        d={progressPath}
        fill="rgba(74,222,128,0.05)"
        stroke="url(#pG)"
        strokeWidth={mini ? 2 : 4}
        filter="url(#glow)"
        className="transition-all duration-700"
      />

      {/* 중앙 허브 */}
      <circle
        cx={cx}
        cy={cy}
        r={hubRadius}
        fill="rgba(8,8,12,0.98)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="2"
      />
      <circle
        cx={cx}
        cy={cy}
        r={hubRadius - 4}
        fill="none"
        stroke="url(#sG)"
        strokeWidth="1"
        opacity="0.3"
      />
      
      {!mini && (
        <>
          <text
            x={cx}
            y={cy - hubFontSize * 0.3}
            fill="#fff"
            fontSize={hubFontSize}
            fontWeight="700"
            textAnchor="middle"
          >
            ₩12.5M
          </text>
          <text
            x={cx}
            y={cy + hubFontSize * 0.7}
            fill="rgba(255,255,255,0.4)"
            fontSize={hubFontSize * 0.55}
            textAnchor="middle"
          >
            순자산
          </text>
        </>
      )}

      {/* 노드들 */}
      {nodeElements}
    </svg>
  );
});

export default HexSVG;
