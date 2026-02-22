/**
 * 온리쌤 App — WebView Bridge
 *
 * 기존 React Native 화면 → Next.js 웹앱으로 전환
 * Vercel에 배포된 최신 웹앱을 WebView로 로드
 *
 * 장점:
 * - 웹앱 배포 시 네이티브 앱도 자동 업데이트
 * - 하나의 코드베이스로 웹 + 앱 통합 관리
 * - App Store 재심사 없이 기능 업데이트 가능
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
  BackHandler,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { initSentry } from './src/lib/sentry';
import { UpdateBanner } from './src/components/UpdateBanner';

// Sentry 초기화
initSentry();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 설정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WEB_APP_URL = 'https://autus-ai.com/onlyssam/mobile';

// WebView에서 외부로 열어야 할 URL 패턴
const EXTERNAL_URL_PATTERNS = [
  'accounts.google.com',  // Google OAuth (WebView 차단 우회)
  'clerk.autus-ai.com/v1/oauth', // Clerk OAuth callback
  'kakao',        // 카카오 관련
  'pay.nice',     // 결제
  'pgweb',        // 결제
  'tel:',         // 전화
  'mailto:',      // 이메일
  'maps',         // 지도
  'youtube',      // 유튜브
  'instagram',    // 인스타그램
  'itunes.apple', // 앱스토어
  'play.google',  // 플레이스토어
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// App Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Android 뒤로가기 처리
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // 이벤트 소비
      }
      return false; // 기본 동작 (앱 종료)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  // 네비게이션 상태 변경
  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  // 외부 URL 처리
  const handleShouldStartLoad = useCallback((event: { url: string }) => {
    const { url } = event;

    // 앱 내부 URL은 WebView에서 로드
    if (url.startsWith(WEB_APP_URL) || url.includes('autus-ai.com') || url.includes('vercel.app')) {
      return true;
    }

    // 외부 URL 패턴 감지 → 기본 브라우저로 열기
    const isExternal = EXTERNAL_URL_PATTERNS.some(pattern => url.includes(pattern));
    if (isExternal) {
      Linking.openURL(url).catch(() => {});
      return false;
    }

    // 기타 http/https URL → WebView에서 로드
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return true;
    }

    // 커스텀 스킴 → 외부로
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  // WebView → Native 메시지 수신
  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'HAPTIC':
          // 진동 피드백 (추후 구현)
          break;
        case 'SHARE':
          // 공유 기능 (추후 구현)
          break;
        case 'NOTIFICATION':
          // 푸시 알림 (추후 구현)
          break;
        default:
          console.log('[WebView Bridge] Unknown message:', data.type);
      }
    } catch {
      // JSON이 아닌 메시지 무시
    }
  }, []);

  // 에러 화면
  if (hasError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorEmoji}>📡</Text>
        <Text style={styles.errorTitle}>연결할 수 없습니다</Text>
        <Text style={styles.errorMessage}>
          인터넷 연결을 확인하고{'\n'}다시 시도해주세요
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setHasError(false);
            setIsLoading(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 네이티브 → WebView 주입 스크립트
  const injectedJS = `
    (function() {
      // 네이티브 앱 환경 플래그 설정
      window.__NATIVE_APP__ = true;
      window.__APP_PLATFORM__ = '${Platform.OS}';
      window.__APP_VERSION__ = '1.0.0';

      // 네이티브 브릿지 함수
      window.nativeBridge = {
        send: function(type, payload) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
        },
        haptic: function() { this.send('HAPTIC'); },
        share: function(data) { this.send('SHARE', data); },
        notification: function(data) { this.send('NOTIFICATION', data); },
      };

      // viewport 최적화 (PWA 모드에서 double-tap zoom 방지)
      var meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }

      // 콘솔 로그 → 네이티브 전달
      var originalLog = console.log;
      console.log = function() {
        originalLog.apply(console, arguments);
      };

      true; // Required by Android WebView
    })();
  `;

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />

      <WebView
        ref={webViewRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.webview}

        // 성능 최적화
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState

        // 캐시 비활성화 (항상 최신 버전 로드)
        cacheEnabled={false}
        incognito={false}

        // iOS 설정
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures

        // Android 설정
        mixedContentMode="compatibility"
        allowFileAccess

        // 네이티브 브릿지
        injectedJavaScript={injectedJS}
        onMessage={handleMessage}

        // 네비게이션
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}

        // 로딩/에러
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { statusCode } = syntheticEvent.nativeEvent;
          if (statusCode >= 500) {
            setHasError(true);
          }
        }}

        // 로딩 인디케이터
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>온리쌤 로딩 중...</Text>
          </View>
        )}

        // User Agent (웹앱에서 네이티브 앱 감지용)
        applicationNameForUserAgent="OnlySSemApp/1.0.0"
      />

      {/* 로딩 오버레이 */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingEmoji}>👨‍🏫</Text>
            <Text style={styles.loadingTitle}>온리쌤</Text>
            <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
          </View>
        </View>
      )}

      {/* Expo OTA 업데이트 배너 */}
      <UpdateBanner />
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // 로딩
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingCard: {
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 12,
  },
  spinner: {
    marginTop: 8,
  },

  // 에러
  errorContainer: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
