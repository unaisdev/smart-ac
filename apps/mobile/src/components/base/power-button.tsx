import { Pressable, Text } from 'react-native';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';

interface Props {
  isPoweredOn: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}

export const PowerButton = ({ isPoweredOn, isDisabled = false, onPress }: Props) => {
  const label = isPoweredOn ? '🔴 Apagar' : '🟢 Encender';
  const accessibilityLabel = isPoweredOn ? 'Apagar' : 'Encender';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPoweredOn ? styles.on : styles.off,
        (pressed || isDisabled) && styles.dimmed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = createStyles({
  button: {
    paddingVertical: spacing.m,
    borderRadius: radius.m,
    alignItems: 'center',
    borderWidth: 1,
  },
  on: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  off: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  dimmed: {
    opacity: 0.65,
  },
  label: {
    ...typography.bodyBold,
    color: colors.text,
  },
});
