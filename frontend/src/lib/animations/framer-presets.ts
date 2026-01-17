/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Animation Presets (Framer Motion)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Variants, Transition } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINGS (물리 기반)
// ═══════════════════════════════════════════════════════════════════════════════

export const springs = {
  // 표준 UI
  default: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  
  // 부드러움 (모달, 페이지 전환)
  gentle: { type: 'spring', stiffness: 150, damping: 25 } as Transition,
  
  // 탄성 (버튼, 카드 호버)
  bouncy: { type: 'spring', stiffness: 400, damping: 20 } as Transition,
  
  // 빠름 (툴팁, 드롭다운)
  snappy: { type: 'spring', stiffness: 500, damping: 35 } as Transition,
  
  // 궤도 시뮬레이션 (Galaxy View)
  orbital: { type: 'spring', stiffness: 50, damping: 10, mass: 2 } as Transition,
  
  // 무거움 (대형 엘리먼트)
  heavy: { type: 'spring', stiffness: 100, damping: 20, mass: 3 } as Transition,
  
  // K-지수 변화
  kChange: (delta: number): Transition => ({
    type: 'spring',
    stiffness: 100 + Math.abs(delta) * 500,
    damping: 15 + Math.abs(delta) * 10,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANTS (진입/퇴장 애니메이션)
// ═══════════════════════════════════════════════════════════════════════════════

export const variants = {
  // 페이지 전환
  page: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  } as Variants,
  
  // 카드 등장
  card: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: -10 },
  } as Variants,
  
  // 모달
  modal: {
    initial: { opacity: 0, scale: 0.9, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
  } as Variants,
  
  // 오버레이
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } as Variants,
  
  // 슬라이드 (좌우)
  slideRight: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
  } as Variants,
  
  slideLeft: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  } as Variants,
  
  // 스태거 리스트
  staggerContainer: {
    animate: {
      transition: { staggerChildren: 0.05 },
    },
  } as Variants,
  
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  } as Variants,
  
  // 펄스 (경고, 알림)
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: { duration: 2, repeat: Infinity },
    },
  } as Variants,
  
  // 숨쉬기 (코어 구체)
  breathe: {
    animate: {
      scale: [1, 1.03, 1],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
  } as Variants,
  
  // 궤도 회전
  orbit: {
    animate: {
      rotate: 360,
      transition: { duration: 60, repeat: Infinity, ease: 'linear' },
    },
  } as Variants,
  
  // 글로우 펄스
  glow: {
    animate: {
      boxShadow: [
        '0 0 20px rgba(34, 211, 238, 0.2)',
        '0 0 40px rgba(34, 211, 238, 0.4)',
        '0 0 20px rgba(34, 211, 238, 0.2)',
      ],
      transition: { duration: 2, repeat: Infinity },
    },
  } as Variants,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCROLL VARIANTS (스크롤 연동)
// ═══════════════════════════════════════════════════════════════════════════════

export const scrollVariants = {
  // 스크롤에 따라 나타남
  fadeInOnScroll: {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
  },
  
  // 패럴랙스 효과
  parallax: (speed: number = 0.5) => ({
    initial: { y: 0 },
    animate: { y: `${speed * 100}%` },
  }),
  
  // 스케일 인
  scaleInOnScroll: {
    initial: { opacity: 0, scale: 0.8 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, amount: 0.5 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOVER PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const hoverPresets = {
  // 카드 호버
  card: {
    scale: 1.02,
    y: -4,
    transition: springs.bouncy,
  },
  
  // 버튼 호버
  button: {
    scale: 1.05,
    transition: springs.snappy,
  },
  
  // 아이콘 호버
  icon: {
    scale: 1.1,
    rotate: 5,
    transition: springs.bouncy,
  },
  
  // 글로우 호버
  glow: {
    boxShadow: '0 0 30px rgba(34, 211, 238, 0.3)',
    transition: { duration: 0.3 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TAP PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const tapPresets = {
  // 기본 탭
  default: {
    scale: 0.98,
  },
  
  // 버튼 탭
  button: {
    scale: 0.95,
  },
  
  // 아이콘 탭
  icon: {
    scale: 0.9,
    rotate: -5,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

// K/I 값 변화 애니메이션
export function createValueAnimation(from: number, to: number) {
  return {
    initial: { opacity: 0, scale: 1.2 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: springs.kChange(to - from),
    },
  };
}

// 순차적 등장 애니메이션
export function createStaggerAnimation(staggerDelay: number = 0.05) {
  return {
    container: {
      animate: {
        transition: { staggerChildren: staggerDelay },
      },
    },
    item: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
    },
  };
}

// 경로 애니메이션 (SVG)
export const pathAnimation = {
  initial: { pathLength: 0 },
  animate: { 
    pathLength: 1,
    transition: { duration: 1.5, ease: 'easeOut' },
  },
};

export default {
  springs,
  variants,
  scrollVariants,
  hoverPresets,
  tapPresets,
  createValueAnimation,
  createStaggerAnimation,
  pathAnimation,
};
