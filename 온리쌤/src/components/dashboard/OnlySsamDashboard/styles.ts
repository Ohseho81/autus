/**
 * OnlySsamDashboard Styles - All style definitions
 */

import React from 'react';

export const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A2E 50%, #0D0D0D 100%)',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#FFFFFF',
    overflow: 'hidden',
  } as React.CSSProperties,

  courtPattern: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    background: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 50px,
        rgba(255, 107, 0, 0.5) 50px,
        rgba(255, 107, 0, 0.5) 51px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 50px,
        rgba(255, 107, 0, 0.5) 50px,
        rgba(255, 107, 0, 0.5) 51px
      )
    `,
    pointerEvents: 'none',
  } as React.CSSProperties,

  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '70px',
    background: 'rgba(13, 13, 13, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 107, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    zIndex: 1000,
  } as React.CSSProperties,

  logo: {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C42 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: '0 4px 20px rgba(255, 107, 0, 0.4)',
  } as React.CSSProperties,

  logoTitle: {
    fontSize: '20px',
    fontWeight: 800,
    background: 'linear-gradient(90deg, #FF6B00, #FFB347)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  } as React.CSSProperties,

  logoSubtitle: {
    fontSize: '11px',
    color: '#888',
    letterSpacing: '2px',
  } as React.CSSProperties,

  roleTabs: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '6px',
    borderRadius: '16px',
  } as React.CSSProperties,

  mainContent: {
    paddingTop: '70px',
    minHeight: 'calc(100vh - 70px)',
  } as React.CSSProperties,

  contentWrapper: {
    padding: '40px',
    maxWidth: '1600px',
    margin: '0 auto',
  } as React.CSSProperties,

  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '24px',
    padding: '32px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  } as React.CSSProperties,

  gridTwoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  } as React.CSSProperties,

  gridThreeColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
  } as React.CSSProperties,

  gridFourColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
  } as React.CSSProperties,

  gridFiveColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
  } as React.CSSProperties,
};

export const getRoleTabStyle = (isActive: boolean, color: string): React.CSSProperties => ({
  padding: '12px 24px',
  background: isActive
    ? `linear-gradient(135deg, ${color}20, ${color}40)`
    : 'transparent',
  border: isActive
    ? `1px solid ${color}`
    : '1px solid transparent',
  borderRadius: '12px',
  color: isActive ? color : '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'all 0.3s ease',
});

export const getBarChartStyle = (value: number, isHighlighted: boolean): React.CSSProperties => ({
  width: '100%',
  height: `${value * 2}px`,
  background: isHighlighted
    ? 'linear-gradient(180deg, #FF6B00, #FF8C42)'
    : 'linear-gradient(180deg, rgba(255, 107, 0, 0.3), rgba(255, 107, 0, 0.1))',
  borderRadius: '6px 6px 0 0',
  transition: 'all 0.3s ease',
});

export const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
  switch (priority) {
    case 'high': return '#FF4757';
    case 'medium': return '#FFC107';
    case 'low': return '#7C5CFF';
  }
};

export const getStatusColor = (status: 'new' | 'pending' | 'resolved'): string => {
  switch (status) {
    case 'new': return '#FF4757';
    case 'pending': return '#FFC107';
    case 'resolved': return '#00D4AA';
  }
};

export const getLevelColor = (level: '초급' | '중급' | '상급'): { bg: string; text: string } => {
  switch (level) {
    case '상급': return { bg: 'rgba(255, 107, 0, 0.2)', text: '#FF6B00' };
    case '중급': return { bg: 'rgba(124, 92, 255, 0.2)', text: '#7C5CFF' };
    case '초급': return { bg: 'rgba(0, 212, 170, 0.2)', text: '#00D4AA' };
  }
};
