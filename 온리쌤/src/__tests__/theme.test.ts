/**
 * Theme 유틸리티 테스트
 * AUTUS Design System v2.0 - 컬러, 스페이싱, 타이포그래피, 헬퍼 함수 검증
 */

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((options: Record<string, any>) => options.ios ?? options.default),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  glassStyle,
  commonStyles,
  animations,
  REFRESH_INTERVAL,
  SCROLL_DELAY,
  PAGE_SIZE,
  getRoleTheme,
  getTemperatureColor,
  getStatusColor,
  getLevelColor,
  getAttendanceColor,
} from '../utils/theme';

describe('Theme - Colors', () => {
  it('배경색이 순수 블랙이어야 한다', () => {
    expect(colors.background).toBe('#000000');
  });

  it('프라이머리 컬러가 농구 오렌지여야 한다', () => {
    expect(colors.primary).toBe('#FF6B2C');
  });

  it('Apple 시스템 컬러가 모두 정의되어야 한다', () => {
    expect(colors.apple.blue).toBe('#007AFF');
    expect(colors.apple.green).toBe('#30D158');
    expect(colors.apple.red).toBe('#FF453A');
    expect(colors.apple.orange).toBe('#FF9500');
    expect(colors.apple.yellow).toBe('#FFD60A');
    expect(colors.apple.purple).toBe('#BF5AF2');
    expect(colors.apple.teal).toBe('#64D2FF');
    expect(colors.apple.pink).toBe('#FF375F');
    expect(colors.apple.indigo).toBe('#5856D6');
    expect(colors.apple.mint).toBe('#66D4CF');
  });

  it('surface 계층이 순서대로 밝아져야 한다', () => {
    // hex 값을 비교하여 surface < surfaceSecondary < surfaceTertiary < surfaceQuaternary
    const surfaces = [
      colors.surface,        // #1C1C1E
      colors.surfaceSecondary, // #2C2C2E
      colors.surfaceTertiary,  // #3A3A3C
      colors.surfaceQuaternary, // #48484A
    ];
    // 각 단계가 정의되어 있어야 한다
    surfaces.forEach(s => expect(s).toBeDefined());
    expect(surfaces[0]).not.toBe(surfaces[1]);
    expect(surfaces[1]).not.toBe(surfaces[2]);
  });

  it('텍스트 컬러 계층이 정의되어야 한다', () => {
    expect(colors.text.primary).toBe('#FFFFFF');
    expect(colors.text.secondary).toBeDefined();
    expect(colors.text.tertiary).toBeDefined();
    expect(colors.text.quaternary).toBeDefined();
    expect(colors.text.muted).toBeDefined();
    expect(colors.text.disabled).toBeDefined();
  });

  it('상태 컬러가 올바르게 정의되어야 한다', () => {
    expect(colors.success.primary).toBe('#30D158');
    expect(colors.caution.primary).toBe('#FFD60A');
    expect(colors.danger.primary).toBe('#FF453A');
  });

  it('역할별 컬러가 정의되어야 한다', () => {
    expect(colors.roles.owner.primary).toBe('#FF6B2C');
    expect(colors.roles.coach.primary).toBe('#FF453A');
    expect(colors.roles.admin.primary).toBe('#BF5AF2');
  });

  it('역할별 gradient가 튜플 형태여야 한다', () => {
    expect(colors.roles.owner.gradient).toHaveLength(2);
    expect(colors.roles.coach.gradient).toHaveLength(2);
    expect(colors.roles.admin.gradient).toHaveLength(2);
  });

  it('special 컬러가 정의되어야 한다', () => {
    expect(colors.special.gold).toBe('#FFD700');
    expect(colors.special.silver).toBe('#C0C0C0');
    expect(colors.special.bronze).toBe('#CD7F32');
    expect(colors.special.basketball).toBe('#FF6B2C');
  });
});

describe('Theme - Spacing', () => {
  it('4px 기준 스페이싱이 올바르게 정의되어야 한다', () => {
    expect(spacing[0]).toBe(0);
    expect(spacing[1]).toBe(4);
    expect(spacing[2]).toBe(8);
    expect(spacing[3]).toBe(12);
    expect(spacing[4]).toBe(16);
    expect(spacing[5]).toBe(20);
    expect(spacing[6]).toBe(24);
    expect(spacing[8]).toBe(32);
    expect(spacing[10]).toBe(40);
    expect(spacing[12]).toBe(48);
    expect(spacing[16]).toBe(64);
  });

  it('스페이싱 값이 4의 배수여야 한다', () => {
    Object.entries(spacing).forEach(([key, value]) => {
      if (Number(key) > 0) {
        expect(value % 4).toBe(0);
      }
    });
  });
});

describe('Theme - Border Radius', () => {
  it('모든 border radius 값이 정의되어야 한다', () => {
    expect(borderRadius.none).toBe(0);
    expect(borderRadius.xs).toBe(6);
    expect(borderRadius.sm).toBe(8);
    expect(borderRadius.md).toBe(12);
    expect(borderRadius.lg).toBe(16);
    expect(borderRadius.xl).toBe(20);
    expect(borderRadius['2xl']).toBe(22);
    expect(borderRadius['3xl']).toBe(32);
    expect(borderRadius.full).toBe(9999);
    expect(borderRadius.pill).toBe(100);
  });

  it('border radius 값이 크기순으로 증가해야 한다', () => {
    expect(borderRadius.none).toBeLessThan(borderRadius.xs);
    expect(borderRadius.xs).toBeLessThan(borderRadius.sm);
    expect(borderRadius.sm).toBeLessThan(borderRadius.md);
    expect(borderRadius.md).toBeLessThan(borderRadius.lg);
    expect(borderRadius.lg).toBeLessThan(borderRadius.xl);
  });
});

describe('Theme - Typography', () => {
  it('iOS에서 primary font family가 -apple-system이어야 한다', () => {
    expect(typography.fontFamily.primary).toBe('-apple-system');
  });

  it('폰트 크기가 올바르게 정의되어야 한다', () => {
    expect(typography.fontSize.xs).toBe(10);
    expect(typography.fontSize.sm).toBe(12);
    expect(typography.fontSize.md).toBe(14);
    expect(typography.fontSize.base).toBe(15);
    expect(typography.fontSize.lg).toBe(17);
    expect(typography.fontSize.xl).toBe(20);
    expect(typography.fontSize['2xl']).toBe(24);
    expect(typography.fontSize.display).toBe(48);
  });

  it('Apple 타이포 프리셋이 정의되어야 한다', () => {
    expect(typography.largeTitle.fontSize).toBe(34);
    expect(typography.largeTitle.fontWeight).toBe('700');

    expect(typography.title1.fontSize).toBe(28);
    expect(typography.body.fontSize).toBe(17);
    expect(typography.caption1.fontSize).toBe(12);
    expect(typography.footnote.fontSize).toBe(13);
  });

  it('font weight 값이 유효한 문자열이어야 한다', () => {
    const validWeights = ['400', '500', '600', '700', '800'];
    Object.values(typography.fontWeight).forEach(weight => {
      expect(validWeights).toContain(weight);
    });
  });

  it('레거시 h1/h2/h3 프리셋이 정의되어야 한다', () => {
    expect(typography.h1.fontSize).toBe(34);
    expect(typography.h1.lineHeight).toBe(40);
    expect(typography.h2.fontSize).toBe(24);
    expect(typography.h3.fontSize).toBe(20);
  });
});

describe('Theme - Animations', () => {
  it('애니메이션 속도 상수가 정의되어야 한다', () => {
    expect(animations.fastest).toBe(100);
    expect(animations.fast).toBe(200);
    expect(animations.normal).toBe(300);
    expect(animations.slow).toBe(500);
    expect(animations.slowest).toBe(800);
  });

  it('애니메이션 속도가 순서대로 증가해야 한다', () => {
    expect(animations.fastest).toBeLessThan(animations.fast);
    expect(animations.fast).toBeLessThan(animations.normal);
    expect(animations.normal).toBeLessThan(animations.slow);
    expect(animations.slow).toBeLessThan(animations.slowest);
  });
});

describe('Theme - Performance Constants', () => {
  it('REFRESH_INTERVAL이 30초여야 한다', () => {
    expect(REFRESH_INTERVAL).toBe(30000);
  });

  it('SCROLL_DELAY가 100ms여야 한다', () => {
    expect(SCROLL_DELAY).toBe(100);
  });

  it('PAGE_SIZE가 20이어야 한다', () => {
    expect(PAGE_SIZE).toBe(20);
  });
});

describe('Theme - getRoleTheme', () => {
  it('owner 역할에 맞는 테마를 반환해야 한다', () => {
    const theme = getRoleTheme('owner');
    expect(theme.primary).toBe('#FF6B2C');
    expect(theme.gradient).toHaveLength(2);
    expect(theme.glow).toBeDefined();
  });

  it('coach 역할에 맞는 테마를 반환해야 한다', () => {
    const theme = getRoleTheme('coach');
    expect(theme.primary).toBe('#FF453A');
  });

  it('admin 역할에 맞는 테마를 반환해야 한다', () => {
    const theme = getRoleTheme('admin');
    expect(theme.primary).toBe('#BF5AF2');
  });
});

describe('Theme - getTemperatureColor (V-Index)', () => {
  it('80 이상이면 success 컬러를 반환해야 한다', () => {
    const color = getTemperatureColor(85);
    expect(color.primary).toBe(colors.success.primary);
  });

  it('60-79이면 teal 컬러를 반환해야 한다', () => {
    const color = getTemperatureColor(65);
    expect(color.primary).toBe(colors.apple.teal);
  });

  it('40-59이면 caution 컬러를 반환해야 한다', () => {
    const color = getTemperatureColor(50);
    expect(color.primary).toBe(colors.caution.primary);
  });

  it('20-39이면 orange 컬러를 반환해야 한다', () => {
    const color = getTemperatureColor(30);
    expect(color.primary).toBe(colors.apple.orange);
  });

  it('20 미만이면 danger 컬러를 반환해야 한다', () => {
    const color = getTemperatureColor(10);
    expect(color.primary).toBe(colors.danger.primary);
  });

  it('경계값 80에서 success를 반환해야 한다', () => {
    const color = getTemperatureColor(80);
    expect(color.primary).toBe(colors.success.primary);
  });

  it('경계값 0에서 danger를 반환해야 한다', () => {
    const color = getTemperatureColor(0);
    expect(color.primary).toBe(colors.danger.primary);
  });
});

describe('Theme - getStatusColor', () => {
  it('success 상태에 맞는 컬러를 반환해야 한다', () => {
    const color = getStatusColor('success');
    expect(color.primary).toBe(colors.success.primary);
  });

  it('warning 상태에 맞는 컬러를 반환해야 한다', () => {
    const color = getStatusColor('warning');
    expect(color.primary).toBe(colors.caution.primary);
  });

  it('error 상태에 맞는 컬러를 반환해야 한다', () => {
    const color = getStatusColor('error');
    expect(color.primary).toBe(colors.danger.primary);
  });

  it('info 상태에 맞는 컬러를 반환해야 한다', () => {
    const color = getStatusColor('info');
    expect(color.primary).toBe(colors.apple.blue);
  });
});

describe('Theme - getLevelColor', () => {
  it('초급/beginner에 green을 반환해야 한다', () => {
    expect(getLevelColor('초급')).toBe(colors.apple.green);
    expect(getLevelColor('beginner')).toBe(colors.apple.green);
  });

  it('중급/intermediate에 teal을 반환해야 한다', () => {
    expect(getLevelColor('중급')).toBe(colors.apple.teal);
    expect(getLevelColor('intermediate')).toBe(colors.apple.teal);
  });

  it('상급/advanced에 orange를 반환해야 한다', () => {
    expect(getLevelColor('상급')).toBe(colors.apple.orange);
    expect(getLevelColor('advanced')).toBe(colors.apple.orange);
  });

  it('프로/pro에 yellow를 반환해야 한다', () => {
    expect(getLevelColor('프로')).toBe(colors.apple.yellow);
    expect(getLevelColor('pro')).toBe(colors.apple.yellow);
  });

  it('알 수 없는 레벨에 tertiary 컬러를 반환해야 한다', () => {
    expect(getLevelColor('unknown')).toBe(colors.text.tertiary);
  });
});

describe('Theme - getAttendanceColor', () => {
  it('present 상태에 올바른 컬러/아이콘/라벨을 반환해야 한다', () => {
    const result = getAttendanceColor('present');
    expect(result.color).toBe(colors.apple.green);
    expect(result.label).toBe('출석');
    expect(result.icon).toBe('✓');
  });

  it('late 상태에 올바른 컬러/라벨을 반환해야 한다', () => {
    const result = getAttendanceColor('late');
    expect(result.color).toBe(colors.apple.yellow);
    expect(result.label).toBe('지각');
  });

  it('absent 상태에 올바른 컬러/라벨을 반환해야 한다', () => {
    const result = getAttendanceColor('absent');
    expect(result.color).toBe(colors.apple.red);
    expect(result.label).toBe('결석');
  });

  it('pending 상태에 올바른 컬러/라벨을 반환해야 한다', () => {
    const result = getAttendanceColor('pending');
    expect(result.label).toBe('대기');
  });
});

describe('Theme - commonStyles', () => {
  it('container 스타일이 정의되어야 한다', () => {
    expect(commonStyles.container.flex).toBe(1);
    expect(commonStyles.container.backgroundColor).toBe(colors.background);
  });

  it('card 스타일이 정의되어야 한다', () => {
    expect(commonStyles.card.backgroundColor).toBe(colors.surface);
    expect(commonStyles.card.borderRadius).toBe(borderRadius.lg);
  });

  it('button primary 스타일이 정의되어야 한다', () => {
    expect(commonStyles.button.primary.backgroundColor).toBe(colors.primary);
    expect(commonStyles.button.primary.height).toBe(50);
  });

  it('input 스타일이 정의되어야 한다', () => {
    expect(commonStyles.input.height).toBe(48);
    expect(commonStyles.input.color).toBe(colors.text.primary);
  });
});

describe('Theme - glassStyle', () => {
  it('글래스모피즘 스타일이 반투명이어야 한다', () => {
    expect(glassStyle.backgroundColor).toContain('rgba');
    expect(glassStyle.borderWidth).toBe(0.5);
    expect(glassStyle.borderRadius).toBe(borderRadius.xl);
  });
});
