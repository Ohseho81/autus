// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS METRO OS — SVG Icon Components (12 Categories LOCKED)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { EventCategory, CATEGORY_SHAPES } from '../core/types';

interface IconProps {
  size?: number;
  color?: string;
  intensity?: number; // 0-1 for physics-based coloring
  pulse?: boolean;
  className?: string;
}

// Base SVG wrapper
const IconWrapper: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 24,
  color = '#fff',
  intensity = 0.5,
  pulse = false,
  className = '',
  children,
}) => {
  const dynamicColor = intensity > 0.7 ? '#ff4444' : intensity > 0.4 ? '#ffaa00' : color;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`${className} ${pulse ? 'animate-pulse' : ''}`}
      style={{ filter: pulse ? 'drop-shadow(0 0 4px currentColor)' : undefined }}
    >
      <g fill={dynamicColor} stroke={dynamicColor} strokeWidth="1">
        {children}
      </g>
    </svg>
  );
};

// ● Init
export const InitIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="8" />
  </IconWrapper>
);

// ▶ Progress
export const ProgressIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polygon points="6,4 20,12 6,20" />
  </IconWrapper>
);

// ⏸ Delay
export const DelayIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <rect x="5" y="4" width="4" height="16" rx="1" />
    <rect x="15" y="4" width="4" height="16" rx="1" />
  </IconWrapper>
);

// ✦ Discovery
export const DiscoveryIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9" />
  </IconWrapper>
);

// ✖ Collision
export const CollisionIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <line x1="4" y1="4" x2="20" y2="20" strokeWidth="3" />
    <line x1="20" y1="4" x2="4" y2="20" strokeWidth="3" />
  </IconWrapper>
);

// ⬡ Decision (Hexagon)
export const DecisionIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="none" strokeWidth="2" />
  </IconWrapper>
);

// ✓ Validation
export const ValidationIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polyline points="4,12 9,18 20,6" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </IconWrapper>
);

// ⚡ Shock
export const ShockIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <polygon points="13,2 3,14 10,14 8,22 21,10 13,10" />
  </IconWrapper>
);

// ⬌ Deal (Double circle / Link)
export const DealIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <circle cx="8" cy="12" r="5" fill="none" strokeWidth="2" />
    <circle cx="16" cy="12" r="5" fill="none" strokeWidth="2" />
  </IconWrapper>
);

// ⬢ Org (Square/Box)
export const OrgIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </IconWrapper>
);

// ◐ External (Half circle)
export const ExternalIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <path d="M12,2 A10,10 0 0,1 12,22 L12,2" />
    <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2" />
  </IconWrapper>
);

// ⊘ EndAbort (Circle with slash)
export const EndAbortIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2" />
    <line x1="5" y1="19" x2="19" y2="5" strokeWidth="2" />
  </IconWrapper>
);

// Category to Icon mapping
export const CATEGORY_ICONS: Record<EventCategory, React.FC<IconProps>> = {
  Init: InitIcon,
  Progress: ProgressIcon,
  Delay: DelayIcon,
  Discovery: DiscoveryIcon,
  Collision: CollisionIcon,
  Decision: DecisionIcon,
  Validation: ValidationIcon,
  Shock: ShockIcon,
  Deal: DealIcon,
  Org: OrgIcon,
  External: ExternalIcon,
  EndAbort: EndAbortIcon,
};

// Get icon component for category
export const getCategoryIcon = (category: EventCategory): React.FC<IconProps> => {
  return CATEGORY_ICONS[category] || InitIcon;
};

// Render category icon
export const CategoryIcon: React.FC<IconProps & { category: EventCategory }> = ({
  category,
  ...props
}) => {
  const Icon = getCategoryIcon(category);
  return <Icon {...props} />;
};

// Station marker (transfer vs regular)
export const StationMarker: React.FC<{
  isTransfer: boolean;
  isExit?: boolean;
  isCurrent?: boolean;
  size?: number;
  lineColor?: string;
}> = ({ isTransfer, isExit, isCurrent, size = 12, lineColor = '#666' }) => {
  const radius = isTransfer ? size * 0.6 : size * 0.4;
  
  return (
    <g>
      {/* Outer ring for transfer/current */}
      {(isTransfer || isCurrent) && (
        <circle
          r={radius + 3}
          fill="none"
          stroke={isCurrent ? '#00ff88' : '#333'}
          strokeWidth={2}
          className={isCurrent ? 'animate-pulse' : ''}
        />
      )}
      
      {/* Main station circle */}
      <circle
        r={radius}
        fill={isExit ? '#ff4444' : '#fff'}
        stroke={isExit ? '#ff4444' : lineColor}
        strokeWidth={isTransfer ? 2.5 : 1.5}
      />
      
      {/* Exit marker */}
      {isExit && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.8}
          fill="#fff"
          fontWeight="bold"
        >
          ✕
        </text>
      )}
    </g>
  );
};

// Line number badge
export const LineBadge: React.FC<{
  lineId: string;
  color: string;
  size?: number;
}> = ({ lineId, color, size = 20 }) => {
  const label = lineId.replace('L', '');
  
  return (
    <g>
      <circle r={size / 2} fill={color} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.5}
        fill="#fff"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
};

export default CategoryIcon;
