import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '온리쌤 - 학원 자동화 플랫폼',
  description: 'Tesla FSD 스타일의 학원 운영 자동화 콘솔 - 6개 역할 멀티 콘솔',
  applicationName: '온리쌤',
  keywords: ['학원', '자동화', '관리', 'ERP', 'LMS', '학원관리', '온리쌤'],
  authors: [{ name: '온리쌤 Team' }],
  creator: '온리쌤',
  publisher: '온리쌤',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '온리쌤',
    startupImage: [
      {
        url: '/splash/splash-640x1136.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash/splash-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash/splash-1242x2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash/splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: '온리쌤',
    title: '온리쌤 - 학원 자동화 플랫폼',
    description: 'Tesla FSD 스타일의 학원 운영 자동화 콘솔',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '온리쌤 - 학원 자동화 플랫폼',
    description: 'Tesla FSD 스타일의 학원 운영 자동화 콘솔',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#0ea5e9' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#05050a' },
    { media: '(prefers-color-scheme: dark)', color: '#05050a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        {/* PWA 추가 메타 태그 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="온리쌤" />
        <meta name="msapplication-TileColor" content="#05050a" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* 터치 아이콘 */}
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        
        {/* 프리로드 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Service Worker 등록 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[App] SW registered:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('[App] SW registration failed:', error);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className="antialiased bg-[#05050a] text-white overflow-x-hidden">
        {children}
        
        {/* iOS 설치 프롬프트 (선택적) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // iOS 설치 안내
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
              const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
              
              if (isIOS && !isStandalone) {
                // iOS에서 홈 화면에 추가하지 않은 경우
                // 필요시 설치 안내 배너 표시
                console.log('[App] iOS 사용자: 홈 화면에 추가하여 앱처럼 사용하세요');
              }
              
              // beforeinstallprompt 이벤트 (Android/Chrome)
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                console.log('[App] 앱 설치 가능');
                // 설치 버튼 표시 로직 추가 가능
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
