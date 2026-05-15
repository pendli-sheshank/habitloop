import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, AppSpacing, AppRadius, AppFontSize } from '@/constants/theme';
import { ALL_PROTOCOLS, DIFFICULTY_CONFIG, getUnlockedProtocols } from '@/constants/protocols';
import type { FastingProtocol, ProtocolCategory } from '@/types/fasting';

interface Props {
  selected: FastingProtocol;
  onSelect: (protocol: FastingProtocol) => void;
  totalCompletedFasts: number;
  disabled?: boolean;
}

const TABS: Array<{ id: ProtocolCategory; label: string }> = [
  { id: 'daily-trf', label: 'Daily TRF' },
  { id: 'extended',  label: 'Extended' },
];

export function ProtocolPicker({ selected, onSelect, totalCompletedFasts, disabled = false }: Props) {
  const unlockedIds = getUnlockedProtocols(totalCompletedFasts);

  // Determine which tab the selected protocol lives in, default to daily-trf
  const selectedProtocolMeta = ALL_PROTOCOLS.find(p => p.id === selected);
  const initialTab: ProtocolCategory = selectedProtocolMeta?.category ?? 'daily-trf';
  const [activeTab, setActiveTab] = useState<ProtocolCategory>(initialTab);

  const visibleProtocols = ALL_PROTOCOLS.filter(p => p.category === activeTab);

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Protocol cards */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleProtocols.map(protocol => {
          const isSelected = selected === protocol.id;
          const isLocked = !unlockedIds.includes(protocol.id);
          const diffConfig = DIFFICULTY_CONFIG[protocol.difficulty];
          const fastsNeeded = protocol.unlockAfterFasts - totalCompletedFasts;

          return (
            <TouchableOpacity
              key={protocol.id}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
                isLocked && styles.cardLocked,
              ]}
              onPress={() => {
                if (!isLocked && !disabled) onSelect(protocol.id);
              }}
              activeOpacity={isLocked || disabled ? 1 : 0.75}
            >
              {/* Header row */}
              <View style={styles.cardHeader}>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected, isLocked && styles.cardLabelLocked]}>
                  {protocol.label}
                </Text>
                <View style={styles.cardHeaderRight}>
                  {/* Difficulty badge */}
                  <View style={[styles.diffBadge, { backgroundColor: diffConfig.bgColor }]}>
                    <Text style={[styles.diffText, { color: diffConfig.color }]}>
                      {diffConfig.label}
                    </Text>
                  </View>
                  {isLocked && (
                    <MaterialCommunityIcons name="lock-outline" size={16} color={AppColors.gray} />
                  )}
                </View>
              </View>

              {/* Tagline */}
              <Text style={[styles.tagline, isSelected && styles.taglineSelected, isLocked && styles.taglineLocked]}>
                {protocol.tagline}
              </Text>

              {/* Locked overlay info */}
              {isLocked && (
                <Text style={styles.unlockText}>
                  Unlock after {fastsNeeded} more fast{fastsNeeded !== 1 ? 's' : ''}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: AppSpacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.surfaceAlt,
    borderRadius: AppRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: AppSpacing.sm,
    alignItems: 'center',
    borderRadius: AppRadius.sm,
  },
  tabActive: {
    backgroundColor: AppColors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabLabel: {
    fontSize: AppFontSize.sm,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
  tabLabelActive: {
    color: AppColors.primary,
  },
  scroll: {
    maxHeight: 300,
  },
  scrollContent: {
    gap: AppSpacing.sm,
    paddingBottom: AppSpacing.sm,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    gap: AppSpacing.xs,
  },
  cardSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primaryLight,
  },
  cardLocked: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  cardLabel: {
    fontSize: AppFontSize.md,
    fontWeight: '700',
    color: AppColors.dark,
  },
  cardLabelSelected: {
    color: AppColors.primary,
  },
  cardLabelLocked: {
    color: AppColors.gray,
  },
  diffBadge: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
    borderRadius: AppRadius.full,
  },
  diffText: {
    fontSize: AppFontSize.xs,
    fontWeight: '700',
  },
  tagline: {
    fontSize: AppFontSize.sm,
    color: AppColors.textMuted,
    lineHeight: 18,
  },
  taglineSelected: {
    color: AppColors.primary,
  },
  taglineLocked: {
    color: AppColors.gray,
  },
  unlockText: {
    fontSize: AppFontSize.xs,
    color: AppColors.gray,
    fontStyle: 'italic',
    marginTop: AppSpacing.xs,
  },
});
