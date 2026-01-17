/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BentoGrid - 벤토 스타일 불규칙 그리드 레이아웃
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { cn } from '../../styles/autus-design-system';
import { variants } from '../../lib/animations/framer-presets';

interface BentoItem {
  id: string;
  content: ReactNode;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
  priority?: number;
  k?: number; // K-지수에 따른 글로우
}

interface BentoGridProps {
  items: BentoItem[];
  columns?: number;
  gap?: number;
  className?: string;
}

export function BentoGrid({ 
  items, 
  columns = 4, 
  gap = 16,
  className 
}: BentoGridProps) {
  // 우선순위 기반 정렬
  const sortedItems = [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return (
    <motion.div 
      className={cn("grid auto-rows-[minmax(120px,1fr)]", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
      variants={variants.staggerContainer}
      initial="initial"
      animate="animate"
    >
      {sortedItems.map((item, index) => (
        <motion.div
          key={item.id}
          style={{
            gridColumn: `span ${item.colSpan || 1}`,
            gridRow: `span ${item.rowSpan || 1}`,
          }}
          variants={variants.staggerItem}
          transition={{ delay: index * 0.05 }}
        >
          <GlassCard 
            className="h-full" 
            k={item.k}
            noPadding
          >
            {item.content}
          </GlassCard>
        </motion.div>
      ))}
    </motion.div>
  );
}

// 반응형 벤토 그리드
interface ResponsiveBentoGridProps {
  items: BentoItem[];
  className?: string;
}

export function ResponsiveBentoGrid({ items, className }: ResponsiveBentoGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      "auto-rows-[minmax(120px,1fr)]",
      className
    )}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          className={cn(
            item.colSpan === 2 && "sm:col-span-2",
            item.colSpan === 3 && "lg:col-span-3",
            item.colSpan === 4 && "lg:col-span-4",
            item.rowSpan === 2 && "row-span-2",
            item.rowSpan === 3 && "row-span-3",
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <GlassCard className="h-full" k={item.k} noPadding>
            {item.content}
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

// 벤토 아이템 프리셋
export const BentoItemPresets = {
  // 대시보드용 프리셋
  dashboard: {
    kGauge: { colSpan: 2 as const, rowSpan: 2 as const, priority: 10 },
    iGauge: { colSpan: 2 as const, rowSpan: 2 as const, priority: 10 },
    galaxy: { colSpan: 3 as const, rowSpan: 2 as const, priority: 9 },
    alerts: { colSpan: 1 as const, rowSpan: 2 as const, priority: 8 },
    timeline: { colSpan: 4 as const, rowSpan: 1 as const, priority: 7 },
    automation: { colSpan: 2 as const, rowSpan: 1 as const, priority: 6 },
    insights: { colSpan: 2 as const, rowSpan: 1 as const, priority: 6 },
  },
};

export default BentoGrid;
