import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameDay,
  isToday,
  isFuture,
} from 'date-fns';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';
import { PHASE_DISPLAY } from '@/constants/phases';
import { getCurrentPhaseFromISO } from '@/services/cycle/cycleEngine';
import type { CyclePhaseType } from '@/types/cycle';

interface Props {
  lastPeriodStart: string | null;
  avgCycleLength?: number;
  avgPeriodLength?: number;
  onSelectDate: (isoDate: string) => void;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function phaseColorForDay(
  date: Date,
  lastPeriodStart: string | null,
  avgCycleLength: number,
  avgPeriodLength: number,
): { bg: string; isPhased: boolean } {
  if (!lastPeriodStart) return { bg: 'transparent', isPhased: false };
  try {
    const iso = format(date, 'yyyy-MM-dd');
    const phase: CyclePhaseType = getCurrentPhaseFromISO(
      // Temporarily shift lastPeriodStart so getCurrentPhaseFromISO computes
      // dayOfCycle relative to `date` instead of today.
      shiftLastPeriodStart(lastPeriodStart, date),
      avgCycleLength,
      avgPeriodLength,
    );
    return { bg: PHASE_DISPLAY[phase].colorLight, isPhased: true };
  } catch {
    return { bg: 'transparent', isPhased: false };
  }
}

/**
 * Adjusts lastPeriodStart so that when getCurrentPhaseFromISO runs with
 * `new Date()` internally it produces the correct phase for `targetDate`.
 */
function shiftLastPeriodStart(lastPeriodStart: string, targetDate: Date): string {
  const start = new Date(lastPeriodStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate = new Date(targetDate);
  targetDate.setHours(0, 0, 0, 0);
  const diffMs = targetDate.getTime() - today.getTime();
  const shifted = new Date(start.getTime() + diffMs);
  return format(shifted, 'yyyy-MM-dd');
}

export function CycleCalendar({
  lastPeriodStart,
  avgCycleLength = 28,
  avgPeriodLength = 5,
  onSelectDate,
}: Props) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(lastPeriodStart);

  const monthStart = startOfMonth(viewDate);
  const monthEnd   = endOfMonth(viewDate);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leading empty cells so day 1 falls on the correct weekday
  const leadingBlanks = getDay(monthStart);

  function prevMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function handleDayPress(date: Date) {
    if (isFuture(date)) return;
    const iso = format(date, 'yyyy-MM-dd');
    setSelected(iso);
    onSelectDate(iso);
  }

  const isPeriodStart = (date: Date) =>
    lastPeriodStart ? isSameDay(date, new Date(lastPeriodStart)) : false;

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={prevMonth} hitSlop={8} activeOpacity={0.7}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={AppColors.dark} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{format(viewDate, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={8} activeOpacity={0.7}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={AppColors.dark} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.grid}>
        {DAY_LABELS.map(d => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}

        {/* Leading blanks */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`blank-${i}`} style={styles.cell} />
        ))}

        {/* Day cells */}
        {days.map(date => {
          const iso = format(date, 'yyyy-MM-dd');
          const future = isFuture(date);
          const isSelected = selected === iso;
          const isPeriod = isPeriodStart(date);
          const todayFlag = isToday(date);
          const { bg } = phaseColorForDay(date, lastPeriodStart, avgCycleLength, avgPeriodLength);

          return (
            <TouchableOpacity
              key={iso}
              style={[
                styles.cell,
                { backgroundColor: future ? 'transparent' : bg },
                todayFlag && styles.todayCell,
                isSelected && styles.selectedCell,
              ]}
              onPress={() => handleDayPress(date)}
              disabled={future}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  future && styles.futureText,
                  todayFlag && styles.todayText,
                  isSelected && styles.selectedText,
                ]}
              >
                {format(date, 'd')}
              </Text>
              {isPeriod && <View style={styles.periodDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {(['menstruation', 'follicular', 'ovulation', 'luteal'] as CyclePhaseType[]).map(p => (
          <View key={p} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PHASE_DISPLAY[p].color }]} />
            <Text style={styles.legendText}>{PHASE_DISPLAY[p].label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.hint}>Tap a day to set your period start date</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
    borderRadius: AppRadius.lg,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xs,
  },
  monthLabel: {
    fontSize: AppFontSize.lg,
    fontWeight: '700',
    color: AppColors.dark,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    fontWeight: '600',
    paddingVertical: AppSpacing.xs,
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppRadius.sm,
  },
  dayText: {
    fontSize: AppFontSize.sm,
    color: AppColors.text,
    fontWeight: '500',
  },
  futureText: {
    color: AppColors.border,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: AppColors.primary,
  },
  todayText: {
    color: AppColors.primary,
    fontWeight: '700',
  },
  selectedCell: {
    backgroundColor: AppColors.primary,
  },
  selectedText: {
    color: AppColors.surface,
    fontWeight: '700',
  },
  periodDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DC2626',
    position: 'absolute',
    bottom: 3,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
    paddingTop: AppSpacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
  hint: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
