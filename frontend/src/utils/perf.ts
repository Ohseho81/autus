// 성능 유틸: debounce, throttle, 뷰포트 체크

export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => void>(fn: T, interval = 300) {
  let last = 0;
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn(...args);
    } else if (!timer) {
      const remaining = interval - (now - last);
      timer = window.setTimeout(() => {
        last = Date.now();
        timer = undefined;
        fn(...args);
      }, remaining);
    }
  };
}

export function isInViewport(el: HTMLElement, offset = 0): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top <= vh + offset && rect.bottom >= 0 - offset;
}

export function virtualSlice<T>(items: T[], start: number, count: number): T[] {
  const s = Math.max(0, start);
  const e = Math.min(items.length, s + count);
  return items.slice(s, e);
}

