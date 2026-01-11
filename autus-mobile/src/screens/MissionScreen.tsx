/**
 * AUTUS Mobile - Mission Screen (최적화됨)
 * FlatList + useCallback
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { useAutusStore } from '../stores/autusStore';
import { theme } from '../constants/theme';
import { FilterTabs, MissionCard, Toast } from '../components';
import { MissionFilter, Mission } from '../types';

export const MissionScreen: React.FC = () => {
  const { missions, updateMission, deleteMission } = useAutusStore();
  const [filter, setFilter] = useState<MissionFilter>('active');
  const [toast, setToast] = useState<string | null>(null);
  
  const filteredMissions = useMemo(() => 
    missions.filter(m => m.status === filter), 
    [missions, filter]
  );
  
  const counts = useMemo(() => ({
    active: missions.filter(m => m.status === 'active').length,
    done: missions.filter(m => m.status === 'done').length,
    ignored: missions.filter(m => m.status === 'ignored').length,
  }), [missions]);
  
  const filterOptions = useMemo(() => [
    { id: 'active' as MissionFilter, label: `활성 (${counts.active})` },
    { id: 'done' as MissionFilter, label: `완료 (${counts.done})` },
    { id: 'ignored' as MissionFilter, label: `무시 (${counts.ignored})` },
  ], [counts]);
  
  const handleComplete = useCallback((id: number) => {
    updateMission(id, { status: 'done', progress: 100 });
    setToast('미션이 완료되었습니다!');
  }, [updateMission]);
  
  const handleIgnore = useCallback((id: number) => {
    updateMission(id, { status: 'ignored' });
    setToast('미션이 무시되었습니다');
  }, [updateMission]);
  
  const handleDelete = useCallback((id: number) => {
    deleteMission(id);
    setToast('미션이 삭제되었습니다');
  }, [deleteMission]);
  
  const hideToast = useCallback(() => setToast(null), []);
  
  const renderItem: ListRenderItem<Mission> = useCallback(({ item }) => (
    <MissionCard
      mission={item}
      onComplete={handleComplete}
      onIgnore={handleIgnore}
      onDelete={handleDelete}
    />
  ), [handleComplete, handleIgnore, handleDelete]);
  
  const keyExtractor = useCallback((item: Mission) => String(item.id), []);
  
  const ListHeader = useMemo(() => (
    <FilterTabs
      options={filterOptions}
      selected={filter}
      onSelect={setFilter}
    />
  ), [filterOptions, filter]);
  
  const ListEmpty = useMemo(() => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyText}>미션이 없습니다</Text>
    </View>
  ), []);
  
  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMissions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.content}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
      
      <Toast
        message={toast || ''}
        visible={!!toast}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    padding: 15,
    paddingBottom: 30,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: theme.text3,
  },
});
