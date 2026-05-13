/**
 * Reusable SVG bar chart.
 * react-native-svg is already installed as a peer of
 * react-native-countdown-circle-timer — no new dependency needed.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { AppColors, AppFontSize, AppSpacing } from '@/constants/theme';

export interface BarDatum {
  label: string;       // x-axis label (e.g. "Mon", "13")
  value: number;       // raw value (e.g. ml, minutes)
  goal?: number;       // optional goal line value
  highlighted?: boolean; // accent colour override
}

interface Props {
  data: BarDatum[];
  height?: number;
  barColor?: string;
  goalColor?: string;
  unit?: string;       // suffix shown on y-axis ticks (e.g. "ml", "h")
  maxValue?: number;   // override auto-scale ceiling
}

const CHART_PADDING = { top: 12, right: 8, bottom: 36, left: 40 };

export function BarChart({
  data,
  height = 180,
  barColor = AppColors.primary,
  goalColor = AppColors.accent,
  unit = '',
  maxValue,
}: Props) {
  if (data.length === 0) return null;

  const chartWidth = 320;
  const chartHeight = height;
  const innerW = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  const innerH = chartHeight - CHART_PADDING.top - CHART_PADDING.bottom;

  const rawMax = maxValue ?? Math.max(...data.map(d => Math.max(d.value, d.goal ?? 0)));
  const scale = rawMax > 0 ? innerH / rawMax : 1;

  const barW = Math.max(4, (innerW / data.length) * 0.6);
  const barSpacing = innerW / data.length;

  // Y-axis ticks: 0, 50%, 100%
  const ticks = [0, rawMax / 2, rawMax].map(v => ({
    value: v,
    y: CHART_PADDING.top + innerH - v * scale,
    label: unit ? `${Math.round(v)}${unit}` : String(Math.round(v)),
  }));

  // Goal line y position (use first datum's goal as representative)
  const goalY = data[0]?.goal
    ? CHART_PADDING.top + innerH - data[0].goal * scale
    : null;

  return (
    <View style={styles.container}>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Y-axis ticks */}
        {ticks.map(tick => (
          <React.Fragment key={tick.value}>
            <Line
              x1={CHART_PADDING.left}
              y1={tick.y}
              x2={chartWidth - CHART_PADDING.right}
              y2={tick.y}
              stroke={AppColors.border}
              strokeWidth={1}
              strokeDasharray={tick.value === 0 ? undefined : '3 3'}
            />
            <SvgText
              x={CHART_PADDING.left - 4}
              y={tick.y + 4}
              textAnchor="end"
              fontSize={9}
              fill={AppColors.textMuted}
            >
              {tick.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Goal line */}
        {goalY !== null && (
          <Line
            x1={CHART_PADDING.left}
            y1={goalY}
            x2={chartWidth - CHART_PADDING.right}
            y2={goalY}
            stroke={goalColor}
            strokeWidth={1.5}
            strokeDasharray="5 3"
          />
        )}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max(2, d.value * scale);
          const x = CHART_PADDING.left + i * barSpacing + (barSpacing - barW) / 2;
          const y = CHART_PADDING.top + innerH - barH;
          const fill = d.highlighted ? AppColors.accent : barColor;

          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={fill}
                opacity={d.value === 0 ? 0.2 : 0.9}
              />
              <SvgText
                x={x + barW / 2}
                y={chartHeight - CHART_PADDING.bottom + 14}
                textAnchor="middle"
                fontSize={9}
                fill={AppColors.textMuted}
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// Compact heatmap: 7 columns × N rows of day squares
export interface HeatmapDatum {
  date: string;     // YYYY-MM-DD
  value: number;    // 0 = none, 1 = partial, 2 = complete
}

interface HeatmapProps {
  data: HeatmapDatum[];
  weeks?: number;
}

const CELL = 14;
const CELL_GAP = 3;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const HEAT_COLORS = [
  AppColors.surfaceAlt,     // 0 – no fast
  AppColors.primaryMid,     // 1 – partial
  AppColors.primary,        // 2 – completed
];

export function FastHeatmap({ data, weeks = 13 }: HeatmapProps) {
  const totalCells = weeks * 7;
  const svgW = 7 * (CELL + CELL_GAP) + 20;
  const svgH = (weeks + 1) * (CELL + CELL_GAP) + 12;

  // Build a date-indexed lookup
  const byDate = new Map(data.map(d => [d.date, d.value]));

  // Pad grid to align to Sunday start
  const today = new Date();
  const cells: Array<{ date: string; value: number } | null> = [];
  for (let i = totalCells - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, value: byDate.get(key) ?? 0 });
  }
  // Pad front so col 0 = Sunday
  const offset = (today.getDay() - (totalCells % 7) + 7 + 1) % 7;
  const padded: Array<{ date: string; value: number } | null> = [
    ...Array(offset).fill(null),
    ...cells,
  ];

  return (
    <View>
      <Svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Day-of-week column headers */}
        {DAY_LABELS.map((lbl, col) => (
          <SvgText
            key={col}
            x={20 + col * (CELL + CELL_GAP) + CELL / 2}
            y={10}
            textAnchor="middle"
            fontSize={8}
            fill={AppColors.textMuted}
          >
            {lbl}
          </SvgText>
        ))}

        {padded.map((cell, idx) => {
          const col = idx % 7;
          const row = Math.floor(idx / 7);
          const x = 20 + col * (CELL + CELL_GAP);
          const y = 14 + row * (CELL + CELL_GAP);
          if (!cell) return null;
          return (
            <Rect
              key={idx}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={3}
              fill={HEAT_COLORS[cell.value] ?? HEAT_COLORS[0]}
            />
          );
        })}
      </Svg>
      <View style={styles.legend}>
        {['No fast', 'Partial', 'Completed'].map((lbl, i) => (
          <View key={lbl} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: HEAT_COLORS[i] }]} />
            <Text style={styles.legendText}>{lbl}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AppSpacing.md,
    marginTop: AppSpacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: AppFontSize.xs,
    color: AppColors.textMuted,
  },
});
