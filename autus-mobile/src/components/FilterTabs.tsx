/**
 * AUTUS Mobile - Filter Tabs Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../constants/theme';
import { selection } from '../services/haptics';

interface FilterOption<T> {
  id: T;
  label: string;
}

interface FilterTabsProps<T> {
  options: FilterOption<T>[];
  selected: T;
  onSelect: (id: T) => void;
}

export function FilterTabs<T extends string>({ 
  options, 
  selected, 
  onSelect 
}: FilterTabsProps<T>) {
  const handleSelect = (id: T) => {
    selection();
    onSelect(id);
  };
  
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.tab,
            selected === option.id && styles.tabActive,
          ]}
          onPress={() => handleSelect(option.id)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selected === option.id && styles.tabTextActive,
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  content: {
    gap: 8,
    paddingRight: 20,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: theme.bg2,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tabActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  tabText: {
    fontSize: 12,
    color: theme.text,
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
});
