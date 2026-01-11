/**
 * AUTUS Trinity - MobileDrawer Component
 * Slide-out drawer for mobile task list
 */

import React, { memo, useEffect, useCallback } from 'react';
import TaskList from './TaskList';
import ForecastCard from './ForecastCard';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileDrawer = memo(function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleBackdropClick}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[320px] max-w-[85vw] bg-[rgba(10,10,14,0.98)] border-l border-white/5 z-50 transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="과제 목록"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-sm font-semibold">📋 과제 관리</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="닫기"
          >
            <span className="text-white/40">✕</span>
          </button>
        </div>

        {/* Forecast */}
        <ForecastCard />

        {/* Task list */}
        <TaskList isMobile />
      </div>
    </>
  );
});

export default MobileDrawer;
