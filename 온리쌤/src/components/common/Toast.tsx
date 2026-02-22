/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🍞 Toast - 토스트 알림 컴포넌트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  show: (config: ToastConfig | string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  hide: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════════════

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════════

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setToast(null);
    });
  }, []);

  const show = useCallback((config: ToastConfig | string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const toastConfig: ToastConfig = typeof config === 'string' 
      ? { message: config, type: 'info' }
      : config;

    setToast(toastConfig);
    setVisible(true);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const duration = toastConfig.duration || 3000;
    timeoutRef.current = setTimeout(hide, duration);
  }, [hide]);

  const success = useCallback((message: string) => show({ message, type: 'success' }), [show]);
  const error = useCallback((message: string) => show({ message, type: 'error' }), [show]);
  const warning = useCallback((message: string) => show({ message, type: 'warning' }), [show]);
  const info = useCallback((message: string) => show({ message, type: 'info' }), [show]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getToastStyle = (type: ToastType = 'info') => {
    const styles: Record<ToastType, { bg: string; icon: string; iconName: keyof typeof Ionicons.glyphMap }> = {
      success: { bg: '#1C3D2E', icon: colors.apple.green, iconName: 'checkmark-circle' },
      error: { bg: '#3D1C1C', icon: colors.apple.red, iconName: 'close-circle' },
      warning: { bg: '#3D351C', icon: colors.apple.orange, iconName: 'warning' },
      info: { bg: '#1C2D3D', icon: colors.apple.blue, iconName: 'information-circle' },
    };
    return styles[type];
  };

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, hide }}>
      {children}
      {visible && toast && (
        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top + spacing[2],
              transform: [{ translateY }],
              opacity,
              backgroundColor: getToastStyle(toast.type).bg,
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.content} 
            onPress={hide}
            activeOpacity={0.9}
          >
            <Ionicons
              name={getToastStyle(toast.type).iconName}
              size={22}
              color={getToastStyle(toast.type).icon}
            />
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action && (
              <TouchableOpacity onPress={toast.action.onPress}>
                <Text style={styles.actionText}>{toast.action.label}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: 9999,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  message: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text.primary,
  },
  actionText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.apple.blue,
  },
});
