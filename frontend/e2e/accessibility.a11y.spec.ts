/**
 * AUTUS 접근성(A11y) E2E 테스트
 * axe-core 기반 자동화 테스트
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('접근성 테스트', () => {
  test('홈 페이지 접근성', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('업무 페이지 접근성', async ({ page }) => {
    await page.goto('/#work');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    // 위반 사항이 있으면 상세 로그
    if (accessibilityScanResults.violations.length > 0) {
      console.log('접근성 위반 사항:', JSON.stringify(accessibilityScanResults.violations, null, 2));
    }
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('목표 페이지 접근성', async ({ page }) => {
    await page.goto('/#goals');
    await page.waitForLoadState('networkidle');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('키보드 접근성', () => {
  test('모든 인터랙티브 요소 Tab으로 접근 가능', async ({ page }) => {
    await page.goto('/');
    
    // Tab 키 10회 누르기
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      
      // 현재 포커스된 요소 확인
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName : null;
      });
      
      // body가 아닌 요소에 포커스가 있어야 함
      expect(focusedElement).not.toBe('BODY');
    }
  });

  test('포커스 표시 visible', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Tab');
    
    // 포커스된 요소의 outline 확인
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // outline이 표시되는지 확인
    const outline = await focusedElement.evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });
    
    expect(outline).not.toBe('none');
  });

  test('ESC 키로 모달 닫기', async ({ page }) => {
    await page.goto('/');
    
    // 모달이 있는 경우 테스트
    const modal = page.locator('[role="dialog"]');
    
    if (await modal.isVisible()) {
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });
});

test.describe('스크린 리더 지원', () => {
  test('랜드마크 역할 존재', async ({ page }) => {
    await page.goto('/');
    
    // 주요 랜드마크 확인
    await expect(page.locator('main, [role="main"]')).toBeVisible();
    // header (banner) 역할 확인 - 정적 페이지는 header 사용
    await expect(page.locator('header, [role="banner"]')).toBeVisible();
    // footer (contentinfo) 역할 확인
    await expect(page.locator('footer, [role="contentinfo"]')).toBeVisible();
  });

  test('이미지 alt 텍스트', async ({ page }) => {
    await page.goto('/');
    
    // 모든 이미지에 alt 속성 확인
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('버튼 접근 가능한 이름', async ({ page }) => {
    await page.goto('/');
    
    // 모든 버튼에 접근 가능한 이름 확인
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.evaluate((el) => {
        return el.textContent || el.getAttribute('aria-label') || el.getAttribute('title');
      });
      expect(accessibleName).toBeTruthy();
    }
  });
});

test.describe('색상 대비', () => {
  test('텍스트 색상 대비 (WCAG AA)', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('폼 접근성', () => {
  test('입력 필드 레이블 연결', async ({ page }) => {
    await page.goto('/');
    
    // 모든 input에 연결된 label 확인
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      
      if (id) {
        // label[for] 또는 aria-label 확인
        const hasLabel = await page.locator(`label[for="${id}"]`).count() > 0;
        const hasAriaLabel = await input.getAttribute('aria-label');
        const hasAriaLabelledBy = await input.getAttribute('aria-labelledby');
        
        expect(hasLabel || hasAriaLabel || hasAriaLabelledBy).toBeTruthy();
      }
    }
  });

  test('에러 메시지 연결', async ({ page }) => {
    await page.goto('/');
    
    // aria-invalid와 aria-describedby 확인
    const invalidInputs = page.locator('input[aria-invalid="true"]');
    const count = await invalidInputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = invalidInputs.nth(i);
      const describedBy = await input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
    }
  });
});
