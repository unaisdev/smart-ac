import { Pressable, Text, View } from 'react-native';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { WIZARD_PHASES, type WizardPhase } from '../../utils/schedule-labels';

interface Props {
  activeIndex: number;
  /** Highest phase index the user has reached (inclusive). */
  maxReachableIndex: number;
  onSelectPhase?: (phase: WizardPhase, index: number) => void;
}

export const WizardStepper = ({
  activeIndex,
  maxReachableIndex,
  onSelectPhase,
}: Props) => {
  return (
    <View style={styles.row} accessibilityRole="progressbar">
      {WIZARD_PHASES.map((phase, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        const isReachable = index <= maxReachableIndex;
        const canPress = isReachable && !isActive && onSelectPhase !== undefined;

        return (
          <Pressable
            key={phase.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive, disabled: !canPress }}
            accessibilityLabel={`${phase.label}${isDone ? ', completado' : ''}${
              canPress ? ', ir a este paso' : ''
            }`}
            disabled={!canPress}
            onPress={() => {
              onSelectPhase?.(phase.id, index);
            }}
            style={({ pressed }) => [styles.item, pressed && canPress && styles.pressed]}
          >
            <View
              style={[
                styles.dot,
                isDone && styles.dotDone,
                isActive && styles.dotActive,
                isReachable && !isActive && !isDone && styles.dotReachable,
              ]}
            >
              <Text style={[styles.emoji, (isActive || isDone || isReachable) && styles.emojiActive]}>
                {phase.emoji}
              </Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {phase.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = createStyles({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xxs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  dotDone: {
    borderColor: colors.success,
    backgroundColor: colors.surfaceElevated,
  },
  dotReachable: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  emoji: {
    fontSize: 14,
    opacity: 0.55,
  },
  emojiActive: {
    opacity: 1,
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
