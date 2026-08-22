import { Pressable, Text } from 'react-native';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';

interface Props {
  label: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

export const ControlChip = ({
  label,
  isSelected = false,
  isDisabled = false,
  onPress,
  accessibilityLabel,
}: Props) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isSelected ? styles.selected : styles.idle,
        (pressed || isDisabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
};

const styles = createStyles({
  base: {
    minWidth: 72,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radius.m,
    borderWidth: 1,
    alignItems: 'center',
  },
  idle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  dimmed: {
    opacity: 0.6,
  },
  label: {
    ...typography.bodyBold,
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.text,
  },
});
