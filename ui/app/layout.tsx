'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { StateProvider } from './providers/StateProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // ═══════════════════════════════════════════════════════════════════════════════
  // History Lock — 뒤로가기 무효화
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // 현재 상태를 history에 push
    window.history.pushState(null, '', pathname);

    const handlePopState = (e: PopStateEvent) => {
      // 뒤로가기 시도 시 현재 페이지 유지
      window.history.pushState(null, '', pathname);
      
      // /audit에서는 완전 차단
      if (pathname === '/audit') {
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 직접 URL 접근 차단
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const validPaths = ['/', '/solar', '/action', '/audit'];
    
    if (!validPaths.includes(pathname)) {
      router.replace('/solar');
    }
    
    // 루트 경로는 solar로 리다이렉트
    if (pathname === '/') {
      router.replace('/solar');
    }
  }, [pathname, router]);

  return (
    <html lang="ko">
      <head>
        <title>AUTUS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background: #000;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
          }
          button {
            font-family: inherit;
            border-radius: 8px;
            transition: all 0.2s;
          }
          button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0, 255, 136, 0.3);
          }
        `}</style>
      </head>
      <body>
        <StateProvider>
          {children}
        </StateProvider>
      </body>
    </html>
  );
}
