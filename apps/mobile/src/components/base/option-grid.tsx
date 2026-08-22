import { Pressable, Text, View } from 'react-native';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';

export interface GridOption<T extends string | number> {
  value: T;
  label: string;
  subtitle?: string;
}

interface Props<T extends string | number> {
  options: ReadonlyArray<GridOption<T>>;
  selectedValue?: T;
  onSelect: (value: T) => void;
  /** Compact chips (hours/minutes). Default: larger cards for air/presets. */
  density?: 'comfortable' | 'compact';
  columns?: number;
}

export const OptionGrid = <T extends string | number>({
  options,
  selectedValue,
  onSelect,
  density = 'comfortable',
  columns,
}: Props<T>) => {
  const isCompact = density === 'compact';
  const widthPercent = columns ? 100 / columns : isCompact ? 100 / 6 : 50;

  return (
    <View style={styles.grid}>
      {options.map((item) => {
        const isSelected = item.value === selectedValue;
        return (
          <View key={String(item.value)} style={[styles.cell, { width: `${widthPercent}%` }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={
                item.subtitle ? `${item.label}, ${item.subtitle}` : item.label
              }
              onPress={() => {
                onSelect(item.value);
              }}
              style={({ pressed }) => [
                styles.item,
                isCompact ? styles.itemCompact : styles.itemComfortable,
                isSelected ? styles.itemSelected : styles.itemIdle,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  isCompact ? styles.labelCompact : styles.label,
                  isSelected && styles.labelSelected,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {item.subtitle && !isCompact ? (
                <Text
                  style={[styles.subtitle, isSelected && styles.subtitleSelected]}
                  numberOfLines={1}
                >
                  {item.subtitle}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
};

const styles = createStyles({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xxs,
  },
  cell: {
    padding: spacing.xxs,
    minWidth: 0,
  },
  item: {
    borderRadius: radius.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemComfortable: {
    minHeight: 72,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
    gap: spacing.xxs,
  },
  itemCompact: {
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  itemIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  itemSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  label: {
    ...typography.bodyBold,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelCompact: {
    ...typography.bodyBold,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  subtitleSelected: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
});
