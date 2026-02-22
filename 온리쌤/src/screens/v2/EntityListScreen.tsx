/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EntityListScreen - AUTUS v1.0 Entity 목록
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 기능:
 * - 정상/주의/위험 필터
 * - 검색
 * - 신규 등록 진입점
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography, PAGE_SIZE } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L, T } from '../../config/labelMap';
import type { AdminStackParamList } from '../../navigation/AppNavigatorV2';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type RiskStatus = 'all' | 'safe' | 'caution' | 'risk';

interface Entity {
  id: string;
  name: string;
  contact: string;
  vIndex: number;
  status: 'safe' | 'caution' | 'risk';
  lastSession?: string;
  nextSession?: string;
  unpaidAmount?: number;
}



// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function EntityListScreen() {
  const { config } = useIndustryConfig();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RiskStatus>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const mapRiskLevel = useCallback((riskLevel: string | null): Entity['status'] => {
    if (riskLevel === 'high' || riskLevel === 'critical') return 'risk';
    if (riskLevel === 'medium' || riskLevel === 'elevated') return 'caution';
    return 'safe';
  }, []);

  const fetchEntities = useCallback(async (page: number = 0, append: boolean = false) => {
    try {
      const offset = page * PAGE_SIZE;

      // 실제 Supabase 연동 with pagination - AUTUS profiles 테이블 (780명)
      // 🔥 V-Index 실시간 조회 (universal_profiles 조인)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          phone,
          metadata,
          status,
          created_at,
          universal_id,
          universal_profiles!inner(v_index)
        `)
        .eq('type', 'student')  // 학생만 필터링
        .eq('status', 'active')
        .order('name', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        if (__DEV__) console.error('[EntityList] Fetch error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const formatted: Entity[] = data.map((profile: { id: string; name?: string; phone?: string; universal_profiles?: { v_index?: number } }) => {
          // 🔥 실제 V-Index 사용
          const vIndex = Math.round(profile.universal_profiles?.v_index ?? 50);

          // V-Index 기반 상태 결정
          const getStatusFromVIndex = (v: number): Entity['status'] => {
            if (v >= 70) return 'safe';    // 70° 이상: 정상
            if (v >= 40) return 'caution';  // 40-70°: 주의
            return 'risk';                  // 40° 미만: 위험
          };

          return {
            id: profile.id,
            name: profile.name || '이름 없음',
            contact: profile.phone || '-',
            vIndex,
            status: getStatusFromVIndex(vIndex),
            lastSession: undefined,
            nextSession: undefined,
            unpaidAmount: undefined,
          };
        });

        if (append) {
          // Append to existing data for infinite scroll
          setEntities(prev => [...prev, ...formatted]);
        } else {
          // Replace data for initial load or refresh
          setEntities(formatted);
        }

        // Check if there are more items to load
        setHasMore(data.length === PAGE_SIZE);
      } else {
        if (!append) {
          setEntities([]);
        }
        setHasMore(false);
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('Failed to fetch entities:', error);
      if (!append) {
        setEntities([]);
      }
    } finally {
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [mapRiskLevel]);

  useEffect(() => {
    setCurrentPage(0);
    fetchEntities(0, false);
  }, [fetchEntities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentPage(0);
    setHasMore(true);
    fetchEntities(0, false);
  }, [fetchEntities]);

  const onEndReached = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchEntities(nextPage, true);
    }
  }, [currentPage, isLoadingMore, hasMore, fetchEntities]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Filtered Data
  // ─────────────────────────────────────────────────────────────────────────────

  const filteredEntities = useMemo(() => {
    return entities
      .filter(entity => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return entity.name.toLowerCase().includes(query) ||
                 entity.contact.includes(query);
        }
        return true;
      })
      .filter(entity => {
        // Status filter
        if (filterStatus === 'all') return true;
        return entity.status === filterStatus;
      })
      .sort((a, b) => a.vIndex - b.vIndex); // 위험 먼저
  }, [entities, searchQuery, filterStatus]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const getStatusColor = useCallback((status: Entity['status']) => {
    switch (status) {
      case 'safe': return colors.success.primary;
      case 'caution': return colors.caution.primary;
      case 'risk': return colors.danger.primary;
    }
  }, []);

  const getStatusIcon = useCallback((status: Entity['status']) => {
    switch (status) {
      case 'safe': return 'checkmark-circle';
      case 'caution': return 'alert-circle';
      case 'risk': return 'warning';
    }
  }, []);

  const statusCounts = useMemo(() => {
    return {
      all: entities.length,
      safe: entities.filter(e => e.status === 'safe').length,
      caution: entities.filter(e => e.status === 'caution').length,
      risk: entities.filter(e => e.status === 'risk').length,
    };
  }, [entities]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const renderEntity = useCallback(({ item }: { item: Entity }) => (
    <TouchableOpacity
      style={styles.entityCard}
      onPress={() => navigation.navigate('EntityDetail', { entityId: item.id, mode: 'view' })}
    >
      <View style={styles.entityHeader}>
        <View style={styles.entityInfo}>
          <View style={styles.nameRow}>
            <Ionicons
              name={getStatusIcon(item.status)}
              size={18}
              color={getStatusColor(item.status)}
            />
            <Text style={styles.entityName}>{item.name}</Text>
          </View>
          <Text style={styles.entityContact}>{item.contact}</Text>
        </View>
        <View style={[styles.vIndexBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.vIndexText, { color: getStatusColor(item.status) }]}>
            {item.vIndex}°
          </Text>
        </View>
      </View>

      {/* Meta Info */}
      <View style={styles.entityMeta}>
        {item.nextSession && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.text.muted} />
            <Text style={styles.metaText}>다음: {item.nextSession}</Text>
          </View>
        )}
        {item.unpaidAmount && (
          <View style={styles.metaItem}>
            <Ionicons name="card-outline" size={14} color={colors.danger.primary} />
            <Text style={[styles.metaText, { color: colors.danger.primary }]}>
              미납 {item.unpaidAmount.toLocaleString()}원
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [getStatusIcon, getStatusColor, navigation]);

  const renderLoadingFooter = () => (
    isLoadingMore ? (
      <View style={styles.loadingFooter}>
        <Text style={styles.loadingText}>더 불러오는 중...</Text>
      </View>
    ) : null
  );

  const FilterButton = ({ status, label }: { status: RiskStatus; label: string }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && { backgroundColor: config.color.primary, borderColor: config.color.primary }
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[
        styles.filterButtonText,
        filterStatus === status && { color: '#fff' }
      ]}>
        {label} ({statusCounts[status]})
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{L.entities(config)}</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: config.color.primary }]}
            onPress={() => navigation.navigate('EntityDetail', { mode: 'create' })}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={`${L.entity(config)} 검색...`}
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <FilterButton status="all" label="전체" />
          <FilterButton status="safe" label="정상" />
          <FilterButton status="caution" label="주의" />
          <FilterButton status="risk" label={config.labels.risk} />
        </View>

        {/* List */}
        <FlatList
          data={filteredEntities}
          renderItem={renderEntity}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderLoadingFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={config.color.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? '검색 결과가 없습니다' : `등록된 ${L.entity(config)}이 없습니다`}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  filterButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
    backgroundColor: colors.surface,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // List
  listContent: {
    padding: spacing[4],
    paddingTop: 0,
  },
  entityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  entityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entityInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  entityName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  entityContact: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginLeft: 26,
  },
  vIndexBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  vIndexText: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  entityMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  metaText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyTitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.muted,
    marginTop: spacing[4],
  },

  // Loading Footer
  loadingFooter: {
    paddingVertical: spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },
});
