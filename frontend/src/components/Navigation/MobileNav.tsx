import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

interface MobileNavProps {
  items: NavItem[];
  activeItem?: string;
  onNavigate: (path: string) => void;
}

/**
 * 모바일 네비게이션 컴포넌트
 * 하단 탭 바 + 햄버거 메뉴
 */
export const MobileNav: React.FC<MobileNavProps> = ({
  items,
  activeItem,
  onNavigate,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 하단에 표시할 주요 아이템 (최대 5개)
  const bottomItems = items.slice(0, 5);
  // 더보기 메뉴에 표시할 아이템
  const moreItems = items.slice(5);

  return (
    <>
      {/* 하단 탭 바 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-2 pb-safe z-50 md:hidden">
        <div className="flex items-center justify-around h-16">
          {bottomItems.map((item) => {
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                  isActive ? 'text-blue-400' : 'text-gray-500'
                }`}
              >
                {/* 활성 인디케이터 */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-400 rounded-b-full"
                  />
                )}

                <span className="text-xl relative">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}

          {/* 더보기 버튼 */}
          {moreItems.length > 0 && (
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col items-center justify-center flex-1 h-full text-gray-500"
            >
              <span className="text-xl">☰</span>
              <span className="text-xs mt-1">더보기</span>
            </button>
          )}
        </div>
      </nav>

      {/* 더보기 메뉴 오버레이 */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* 백드롭 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 md:hidden"
            />

            {/* 메뉴 패널 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl z-50 max-h-[70vh] overflow-y-auto md:hidden"
            >
              {/* 핸들 */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-gray-700 rounded-full" />
              </div>

              {/* 메뉴 아이템 */}
              <div className="px-4 pb-8">
                <h3 className="text-gray-400 text-sm font-medium mb-3 px-2">
                  메뉴
                </h3>
                <div className="space-y-1">
                  {moreItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.path);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-white">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileNav;
