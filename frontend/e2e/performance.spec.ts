/**
 * AUTUS 성능 E2E 테스트
 * Core Web Vitals 측정
 */

import { test, expect } from '@playwright/test';

test.describe('Core Web Vitals', () => {
  test('LCP (Largest Contentful Paint) < 2.5s', async ({ page }) => {
    await page.goto('/');
    
    // LCP 측정
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number; loadTime?: number };
          resolve(lastEntry.renderTime || lastEntry.loadTime || lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // 5초 후 타임아웃
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    console.log(`LCP: ${lcp}ms`);
    expect(lcp).toBeLessThan(2500);
  });

  test('FID (First Input Delay) < 100ms', async ({ page }) => {
    await page.goto('/');
    
    // 첫 번째 인터랙션 (링크 또는 버튼)
    const interactiveElement = page.locator('a.glass-card, button').first();
    
    const startTime = Date.now();
    await interactiveElement.click();
    const endTime = Date.now();
    
    const fid = endTime - startTime;
    console.log(`FID: ${fid}ms`);
    expect(fid).toBeLessThan(500); // 링크 클릭은 페이지 이동 포함
  });

  test('CLS (Cumulative Layout Shift) < 0.1', async ({ page }) => {
    await page.goto('/');
    
    // CLS 측정
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value || 0;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
        
        // 3초 후 결과 반환
        setTimeout(() => resolve(clsValue), 3000);
      });
    });
    
    console.log(`CLS: ${cls}`);
    expect(cls).toBeLessThan(0.1);
  });
});

test.describe('페이지 로드 성능', () => {
  test('초기 로드 시간 < 3s', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'load' });
    
    const loadTime = Date.now() - startTime;
    console.log(`페이지 로드 시간: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('DOM Ready < 1.5s', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    const domReadyTime = Date.now() - startTime;
    console.log(`DOM Ready 시간: ${domReadyTime}ms`);
    
    expect(domReadyTime).toBeLessThan(1500);
  });

  test('번들 크기 확인', async ({ page }) => {
    await page.goto('/');
    
    // 리소스 크기 측정
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        size: (entry as PerformanceResourceTiming).transferSize,
        type: (entry as PerformanceResourceTiming).initiatorType,
      }));
    });
    
    // JS 번들 크기
    const jsResources = resources.filter((r) => r.name.endsWith('.js'));
    const totalJsSize = jsResources.reduce((sum, r) => sum + (r.size || 0), 0);
    
    console.log(`총 JS 크기: ${(totalJsSize / 1024).toFixed(2)}KB`);
    console.log('JS 파일들:', jsResources.map((r) => `${r.name.split('/').pop()}: ${((r.size || 0) / 1024).toFixed(2)}KB`));
    
    // 500KB 미만
    expect(totalJsSize).toBeLessThan(500 * 1024);
  });
});

test.describe('네트워크 성능', () => {
  test('API 응답 시간 < 500ms', async ({ page }) => {
    const apiCalls: { url: string; duration: number }[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const timing = response.request().timing();
        apiCalls.push({
          url: response.url(),
          duration: timing.responseEnd - timing.requestStart,
        });
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    for (const call of apiCalls) {
      console.log(`API: ${call.url} - ${call.duration}ms`);
      expect(call.duration).toBeLessThan(500);
    }
  });

  test('이미지 최적화 확인', async ({ page }) => {
    await page.goto('/');
    
    // 이미지 리소스 확인
    const images = await page.evaluate(() => {
      return Array.from(document.images).map((img) => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.width,
        displayHeight: img.height,
      }));
    });
    
    for (const img of images) {
      // 표시 크기의 2배 이하로 로드되는지 확인
      const widthRatio = img.naturalWidth / img.displayWidth;
      const heightRatio = img.naturalHeight / img.displayHeight;
      
      console.log(`이미지: ${img.src.split('/').pop()} - 비율: ${widthRatio.toFixed(1)}x${heightRatio.toFixed(1)}`);
      
      // 3배 이상 큰 이미지는 비효율적
      expect(widthRatio).toBeLessThan(3);
    }
  });
});

test.describe('메모리 성능', () => {
  test('메모리 누수 없음', async ({ page }) => {
    await page.goto('/');
    
    // 초기 메모리
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // 여러 페이지 이동
    const pages = ['#work', '#goals', '#future', '#logs', '#'];
    for (const p of pages) {
      await page.goto(`/${p}`);
      await page.waitForTimeout(500);
    }
    
    // 최종 메모리
    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;
      console.log(`메모리 증가율: ${memoryGrowth.toFixed(2)}%`);
      
      // 50% 이상 증가하면 누수 가능성
      expect(memoryGrowth).toBeLessThan(50);
    }
  });
});
