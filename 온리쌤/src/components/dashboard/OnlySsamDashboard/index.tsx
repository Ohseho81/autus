/**
 * OnlySsamDashboard - Main Entry Point
 * Role-based dashboard system for OnlySsam Academy Management
 *
 * This is the main component that handles role switching and renders
 * the appropriate dashboard based on the selected role.
 */

import React, { useState } from 'react';
import { OwnerDashboard } from './OwnerDashboard';
import { DirectorDashboard } from './DirectorDashboard';
import { AdminDashboard } from './AdminDashboard';
import { CoachDashboard } from './CoachDashboard';
import { styles, getRoleTabStyle } from './styles';
import type { Role } from './types';

const OnlySsamDashboard: React.FC = () => {
  const [activeRole, setActiveRole] = useState<Role['id']>('owner');

  const roles: Role[] = [
    { id: 'owner', name: '오너', icon: '👑', color: '#FF6B00' },
    { id: 'director', name: '원장', icon: '🏢', color: '#00D4AA' },
    { id: 'admin', name: '관리자', icon: '📋', color: '#7C5CFF' },
    { id: 'coach', name: '강사', icon: '🏀', color: '#FF4757' },
  ];

  return (
    <div style={styles.container}>
      {/* Basketball Court Background Pattern */}
      <div style={styles.courtPattern} />

      {/* Top Navigation - Role Selection */}
      <div style={styles.header}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.logo}>🏀</div>
          <div>
            <div style={styles.logoTitle}>온리쌤</div>
            <div style={styles.logoSubtitle}>ACADEMY MANAGEMENT SYSTEM</div>
          </div>
        </div>

        {/* Role Tabs */}
        <div style={styles.roleTabs}>
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              style={getRoleTabStyle(activeRole === role.id, role.color)}
            >
              <span style={{ fontSize: '18px' }}>{role.icon}</span>
              {role.name}
            </button>
          ))}
        </div>

        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            SH
          </div>
        </div>
      </div>

      {/* Main Content - Role-based Dashboard */}
      <div style={styles.mainContent}>
        {activeRole === 'owner' && <OwnerDashboard />}
        {activeRole === 'director' && <DirectorDashboard />}
        {activeRole === 'admin' && <AdminDashboard />}
        {activeRole === 'coach' && <CoachDashboard />}
      </div>
    </div>
  );
};

export default OnlySsamDashboard;
