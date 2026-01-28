/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Student Shop Page
 * 학생 상점 페이지 - 포인트로 보상 교환
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  category: 'snack' | 'privilege' | 'gift' | 'avatar';
  stock?: number;
  popular?: boolean;
  new?: boolean;
}

interface MyReward {
  id: string;
  item: ShopItem;
  purchasedAt: Date;
  status: 'pending' | 'ready' | 'claimed';
  code?: string;
}

type ShopCategory = 'all' | 'snack' | 'privilege' | 'gift' | 'avatar';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_ITEMS: ShopItem[] = [
  // Snacks
  { id: 's1', name: '아이스크림', description: '시원한 아이스크림 1개', icon: '🍦', price: 500, category: 'snack', stock: 10, popular: true },
  { id: 's2', name: '초콜릿', description: '달콤한 초콜릿 1개', icon: '🍫', price: 300, category: 'snack', stock: 15 },
  { id: 's3', name: '음료수', description: '시원한 음료수 1캔', icon: '🥤', price: 400, category: 'snack', stock: 20 },
  { id: 's4', name: '과자 세트', description: '맛있는 과자 세트', icon: '🍿', price: 600, category: 'snack', stock: 8 },
  
  // Privileges
  { id: 'p1', name: '숙제 1일 연장', description: '숙제 제출일 1일 연장권', icon: '📅', price: 800, category: 'privilege', stock: 5 },
  { id: 'p2', name: '자리 선택권', description: '원하는 자리에 앉기', icon: '💺', price: 600, category: 'privilege', stock: 3 },
  { id: 'p3', name: '칭찬 스티커', description: '선생님 특별 칭찬 스티커', icon: '⭐', price: 200, category: 'privilege', stock: 50, new: true },
  
  // Gifts
  { id: 'g1', name: '문화상품권 5천원', description: '문화상품권 5,000원권', icon: '🎫', price: 2000, category: 'gift', stock: 2, popular: true },
  { id: 'g2', name: '문화상품권 1만원', description: '문화상품권 10,000원권', icon: '🎟️', price: 4000, category: 'gift', stock: 1 },
  { id: 'g3', name: '에어팟 추첨권', description: '에어팟 추첨 응모권', icon: '🎧', price: 1500, category: 'gift', stock: 10, new: true },
  
  // Avatar Items
  { id: 'a1', name: '마법사 모자', description: '아바타 악세서리', icon: '🎩', price: 150, category: 'avatar' },
  { id: 'a2', name: '선글라스', description: '멋진 선글라스', icon: '🕶️', price: 100, category: 'avatar' },
  { id: 'a3', name: '왕관', description: '반짝이는 왕관', icon: '👑', price: 300, category: 'avatar', new: true },
  { id: 'a4', name: '날개', description: '천사 날개', icon: '🪽', price: 500, category: 'avatar' },
];

const MY_REWARDS: MyReward[] = [
  {
    id: 'r1',
    item: SHOP_ITEMS[0],
    purchasedAt: new Date(Date.now() - 86400000),
    status: 'ready',
    code: 'ICE-1234',
  },
  {
    id: 'r2',
    item: SHOP_ITEMS[6],
    purchasedAt: new Date(Date.now() - 86400000 * 3),
    status: 'claimed',
  },
];

const MY_POINTS = 1850;
const POINTS_HISTORY = [
  { type: 'earn', amount: 100, reason: '수업 참여', date: new Date() },
  { type: 'earn', amount: 150, reason: '숙제 완료', date: new Date(Date.now() - 86400000) },
  { type: 'spend', amount: 500, reason: '아이스크림 교환', date: new Date(Date.now() - 86400000) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shop Item Card
// ─────────────────────────────────────────────────────────────────────────────

function ShopItemCard({ 
  item, 
  points,
  onPurchase 
}: { 
  item: ShopItem;
  points: number;
  onPurchase: (item: ShopItem) => void;
}) {
  const reducedMotion = useReducedMotion();
  const canAfford = points >= item.price;
  const isOutOfStock = item.stock === 0;
  
  return (
    <motion.div
      className={`
        bg-white rounded-2xl overflow-hidden shadow-lg relative
        ${isOutOfStock ? 'opacity-60' : ''}
      `}
      whileHover={reducedMotion || isOutOfStock ? {} : { y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Badges */}
      <div className="absolute top-2 right-2 flex gap-1">
        {item.popular && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">인기</span>
        )}
        {item.new && (
          <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">NEW</span>
        )}
      </div>
      
      {/* Item Icon */}
      <div className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50">
        <motion.span 
          className="text-5xl"
          animate={reducedMotion ? {} : { scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {item.icon}
        </motion.span>
      </div>
      
      {/* Item Info */}
      <div className="p-3">
        <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
        <p className="text-xs text-slate-500 mb-2">{item.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-amber-500">{item.price}</span>
            <span className="text-xs text-slate-400">P</span>
          </div>
          
          {item.stock !== undefined && (
            <span className={`text-xs ${item.stock <= 3 ? 'text-red-500' : 'text-slate-400'}`}>
              남은 수량: {item.stock}
            </span>
          )}
        </div>
        
        {/* Purchase Button */}
        <button
          onClick={() => onPurchase(item)}
          disabled={!canAfford || isOutOfStock}
          className={`
            w-full mt-3 py-2 rounded-xl font-medium text-sm transition-colors
            ${isOutOfStock
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : canAfford
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                : 'bg-slate-200 text-slate-500'
            }
          `}
        >
          {isOutOfStock ? '품절' : canAfford ? '교환하기' : `${item.price - points}P 부족`}
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Modal
// ─────────────────────────────────────────────────────────────────────────────

function PurchaseModal({ 
  item, 
  points,
  onConfirm, 
  onClose 
}: { 
  item: ShopItem;
  points: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"
        initial={reducedMotion ? {} : { scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={reducedMotion ? {} : { scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">{item.icon}</div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">{item.name}</h2>
        <p className="text-sm text-slate-500 mb-4">{item.description}</p>
        
        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">현재 포인트</span>
            <span className="font-bold">{points.toLocaleString()}P</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">필요 포인트</span>
            <span className="font-bold text-red-500">-{item.price.toLocaleString()}P</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">교환 후</span>
            <span className="font-bold text-green-600">{(points - item.price).toLocaleString()}P</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium"
          >
            교환하기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Success Modal
// ─────────────────────────────────────────────────────────────────────────────

function SuccessModal({ 
  item, 
  onClose 
}: { 
  item: ShopItem;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"
        initial={reducedMotion ? {} : { scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={reducedMotion ? {} : { scale: 0, rotate: 10 }}
        onClick={e => e.stopPropagation()}
      >
        <motion.div
          className="text-7xl mb-4"
          animate={reducedMotion ? {} : { 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ duration: 0.5, repeat: 2 }}
        >
          🎉
        </motion.div>
        
        <h2 className="text-2xl font-bold text-white mb-2">교환 완료!</h2>
        <p className="text-white/90 mb-4">
          {item.name}을(를) 받았어요!
        </p>
        
        <div className="bg-white/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-white/80">
            {item.category === 'avatar' 
              ? '아바타에 자동으로 적용됩니다!'
              : '내 보상함에서 확인하세요!'}
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-white text-green-600 rounded-xl font-bold"
        >
          확인
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Rewards Tab
// ─────────────────────────────────────────────────────────────────────────────

function MyRewardsTab({ rewards }: { rewards: MyReward[] }) {
  const statusStyles = {
    pending: { text: '준비중', color: 'bg-amber-100 text-amber-700' },
    ready: { text: '사용가능', color: 'bg-green-100 text-green-700' },
    claimed: { text: '사용완료', color: 'bg-slate-100 text-slate-500' },
  };

  return (
    <div className="space-y-3">
      {rewards.map(reward => {
        const status = statusStyles[reward.status];
        return (
          <div 
            key={reward.id}
            className={`
              p-4 rounded-xl border-2
              ${reward.status === 'claimed' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-purple-200'}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{reward.item.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-slate-800">{reward.item.name}</div>
                <div className="text-xs text-slate-500">
                  {reward.purchasedAt.toLocaleDateString('ko-KR')} 교환
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
            
            {reward.status === 'ready' && reward.code && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">사용 코드</div>
                <div className="font-mono font-bold text-purple-600 text-lg">{reward.code}</div>
              </div>
            )}
          </div>
        );
      })}
      
      {rewards.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-2">🎁</div>
          <div>아직 교환한 보상이 없어요</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function StudentShopPage() {
  const [category, setCategory] = useState<ShopCategory>('all');
  const [activeTab, setActiveTab] = useState<'shop' | 'rewards'>('shop');
  const [points, setPoints] = useState(MY_POINTS);
  const [purchasingItem, setPurchasingItem] = useState<ShopItem | null>(null);
  const [purchasedItem, setPurchasedItem] = useState<ShopItem | null>(null);
  
  const categories: { id: ShopCategory; label: string; icon: string }[] = [
    { id: 'all', label: '전체', icon: '🏪' },
    { id: 'snack', label: '간식', icon: '🍦' },
    { id: 'privilege', label: '특권', icon: '⭐' },
    { id: 'gift', label: '상품', icon: '🎁' },
    { id: 'avatar', label: '아바타', icon: '👤' },
  ];
  
  const filteredItems = category === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(item => item.category === category);
  
  const handlePurchase = (item: ShopItem) => {
    setPurchasingItem(item);
  };
  
  const handleConfirmPurchase = () => {
    if (purchasingItem) {
      setPoints(prev => prev - purchasingItem.price);
      setPurchasedItem(purchasingItem);
      setPurchasingItem(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 pb-24">
      {/* Header with Points */}
      <div className="p-4 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">🎁 상점</h1>
            <p className="text-white/80 text-sm">포인트로 보상을 교환하세요!</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
            <div className="text-xs text-white/80">내 포인트</div>
            <div className="text-2xl font-bold text-white">{points.toLocaleString()}P</div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-white/20 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('shop')}
            className={`
              flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === 'shop' ? 'bg-white text-purple-600' : 'text-white'}
            `}
          >
            🏪 상점
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`
              flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === 'rewards' ? 'bg-white text-purple-600' : 'text-white'}
            `}
          >
            🎁 내 보상
          </button>
        </div>
      </div>
      
      {activeTab === 'shop' ? (
        <>
          {/* Category Filter */}
          <div className="px-4 mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                    transition-all font-medium text-sm
                    ${category === cat.id
                      ? 'bg-white text-purple-600 shadow-lg'
                      : 'bg-white/20 text-white hover:bg-white/30'
                    }
                  `}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Items Grid */}
          <div className="px-4">
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map(item => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  points={points}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="px-4">
          <MyRewardsTab rewards={MY_REWARDS} />
        </div>
      )}
      
      {/* Purchase Modal */}
      <AnimatePresence>
        {purchasingItem && (
          <PurchaseModal
            item={purchasingItem}
            points={points}
            onConfirm={handleConfirmPurchase}
            onClose={() => setPurchasingItem(null)}
          />
        )}
      </AnimatePresence>
      
      {/* Success Modal */}
      <AnimatePresence>
        {purchasedItem && (
          <SuccessModal
            item={purchasedItem}
            onClose={() => setPurchasedItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentShopPage;
