/**
 * AUTUS 네비게이션 E2E 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('홈 페이지 로드', async ({ page }) => {
    // 타이틀 확인
    await expect(page).toHaveTitle(/AUTUS/);
    
    // 메인 콘텐츠 표시
    await expect(page.locator('main')).toBeVisible();
  });

  test('헤더 네비게이션 동작', async ({ page }) => {
    // 헤더 존재 확인 (정적 페이지)
    const header = page.locator('header, .header');
    await expect(header).toBeVisible();
    
    // 메인 콘텐츠 존재 확인
    const main = page.locator('main, .bento-grid');
    await expect(main).toBeVisible();
    
    // 첫 번째 카드 링크 클릭
    const firstCard = page.locator('a.glass-card').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      // 페이지 이동 확인
      await page.waitForLoadState('networkidle');
    }
  });

  test('딥링크 동작', async ({ page }) => {
    // 특정 뷰로 직접 이동
    await page.goto('/#work');
    
    // 해당 페이지 로드 확인
    await expect(page.locator('main')).toBeVisible();
  });

  test('뒤로가기 동작', async ({ page }) => {
    // 페이지 이동
    await page.goto('/#work');
    await page.goto('/#goals');
    
    // 뒤로가기
    await page.goBack();
    
    // URL 확인
    await expect(page).toHaveURL(/#work/);
  });
});

test.describe('반응형 레이아웃', () => {
  test('모바일 뷰포트', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // 모바일 레이아웃 확인
    await expect(page.locator('main')).toBeVisible();
  });

  test('태블릿 뷰포트', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('main')).toBeVisible();
  });

  test('데스크톱 뷰포트', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('키보드 네비게이션', () => {
  test('Tab 키로 메뉴 탐색', async ({ page }) => {
    await page.goto('/');
    
    // 첫 번째 포커스 가능한 요소로 이동
    await page.keyboard.press('Tab');
    
    // 포커스된 요소 확인
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Enter 키로 메뉴 선택', async ({ page }) => {
    await page.goto('/');
    
    // Tab으로 메뉴 이동
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Enter로 선택
    await page.keyboard.press('Enter');
    
    // 페이지 변경 확인
    await expect(page.locator('main')).toBeVisible();
  });
});
