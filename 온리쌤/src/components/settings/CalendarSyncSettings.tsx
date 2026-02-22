/**
 * CalendarSyncSettings.tsx
 * 구글 캘린더 연동 설정 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useGoogleCalendarAuth,
  saveGoogleTokens,
  getGoogleTokens,
  syncLessonsToCalendar,
} from '../../services/googleCalendar';
import { supabase } from '../../lib/supabase';

const THEME = {
  background: '#0D1117',
  surface: '#161B22',
  primary: '#2ED573',
  google: '#4285F4',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.08)',
  error: '#FF6B6B',
};

interface CalendarSyncSettingsProps {
  userId: string;
}

const CalendarSyncSettings: React.FC<CalendarSyncSettingsProps> = ({ userId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<{
    created: number;
    updated: number;
    errors: number;
  } | null>(null);

  const { request, response, promptAsync } = useGoogleCalendarAuth();

  // 연동 상태 확인
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // OAuth 응답 처리
  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      handleAuthSuccess(response.authentication);
    }
  }, [response]);

  const checkConnectionStatus = async () => {
    try {
      const tokens = await getGoogleTokens(userId);
      setIsConnected(!!tokens);
    } catch (error: unknown) {
      if (__DEV__) console.error('연동 상태 확인 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (authentication: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  }) => {
    try {
      if (!authentication.accessToken) {
        throw new Error('Access token not available');
      }
      await saveGoogleTokens(
        userId,
        authentication.accessToken,
        authentication.refreshToken,
        authentication.expiresIn
      );
      setIsConnected(true);
      Alert.alert('연동 완료', '구글 캘린더가 연결되었습니다!');
    } catch (error: unknown) {
      Alert.alert('오류', '토큰 저장에 실패했습니다.');
    }
  };

  const handleConnect = async () => {
    try {
      await promptAsync();
    } catch (error: unknown) {
      Alert.alert('오류', '구글 로그인에 실패했습니다.');
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      '연동 해제',
      '구글 캘린더 연동을 해제하시겠습니까?\n기존 동기화된 일정은 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('user_oauth_tokens')
              .delete()
              .eq('user_id', userId)
              .eq('provider', 'google_calendar');
            setIsConnected(false);
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const tokens = await getGoogleTokens(userId);
      if (!tokens?.access_token) {
        throw new Error('토큰이 없습니다');
      }

      // 오늘부터 30일 동기화
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const result = await syncLessonsToCalendar(
        tokens.access_token,
        startDate,
        endDate
      );

      setLastSyncResult(result);

      if (result.errors === 0) {
        Alert.alert(
          '동기화 완료',
          `${result.created}개 생성, ${result.updated}개 업데이트`
        );
      } else {
        Alert.alert(
          '동기화 완료 (일부 오류)',
          `${result.created}개 생성, ${result.updated}개 업데이트\n${result.errors}개 오류 발생`
        );
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '동기화 실패';
      Alert.alert('동기화 실패', errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={THEME.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={24} color={THEME.google} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>구글 캘린더</Text>
          <Text style={styles.subtitle}>
            {isConnected ? '연동됨' : '연동되지 않음'}
          </Text>
        </View>
        {isConnected && (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={THEME.primary} />
          </View>
        )}
      </View>

      {/* 설명 */}
      <Text style={styles.description}>
        수업 일정을 구글 캘린더에 자동으로 동기화합니다.
        학부모님께 캘린더 초대장이 발송됩니다.
      </Text>

      {/* 연동 버튼 */}
      {!isConnected ? (
        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleConnect}
          disabled={!request}
        >
          <LinearGradient
            colors={['#4285F4', '#34A853']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.connectGradient}
          >
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.connectButtonText}>Google 계정으로 연결</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <>
          {/* 설정 옵션 */}
          <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
              <Ionicons name="sync" size={20} color={THEME.textSecondary} />
              <Text style={styles.optionLabel}>자동 동기화</Text>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: THEME.border, true: THEME.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* 수동 동기화 */}
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color={THEME.primary} size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color={THEME.primary} />
                <Text style={styles.syncButtonText}>지금 동기화</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 마지막 동기화 결과 */}
          {lastSyncResult && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>마지막 동기화</Text>
              <View style={styles.resultRow}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultValue}>{lastSyncResult.created}</Text>
                  <Text style={styles.resultLabel}>생성</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultValue}>{lastSyncResult.updated}</Text>
                  <Text style={styles.resultLabel}>업데이트</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={[
                    styles.resultValue,
                    lastSyncResult.errors > 0 && { color: THEME.error }
                  ]}>
                    {lastSyncResult.errors}
                  </Text>
                  <Text style={styles.resultLabel}>오류</Text>
                </View>
              </View>
            </View>
          )}

          {/* 연동 해제 */}
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <Text style={styles.disconnectText}>연동 해제</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  connectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 213, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  connectButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  connectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionLabel: {
    fontSize: 14,
    color: THEME.text,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.primary,
  },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  resultTitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultItem: {
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.primary,
  },
  resultLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  disconnectButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  disconnectText: {
    fontSize: 13,
    color: THEME.error,
  },
});

export default CalendarSyncSettings;
