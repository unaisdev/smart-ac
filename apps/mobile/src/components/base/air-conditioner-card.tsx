import { Pressable, Text, View } from 'react-native';
import type { AirConditionerView } from '@smart-ac/shared';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { formatDesiredSummary } from '../../utils/air-labels';

interface Props {
  device: AirConditionerView;
  onPress: () => void;
}

export const AirConditionerCard = ({ device, onPress }: Props) => {
  const summary = formatDesiredSummary(
    device.desiredState.power,
    device.desiredState.mode,
    device.desiredState.temperature,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, última orden ${summary}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={[styles.dot, device.online ? styles.dotOnline : styles.dotOffline]} />
        <Text style={styles.name}>{device.name}</Text>
      </View>
      <Text style={styles.meta}>Última orden: {summary}</Text>
    </Pressable>
  );
};

const styles = createStyles({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOnline: {
    backgroundColor: colors.success,
  },
  dotOffline: {
    backgroundColor: colors.powerOff,
  },
  name: {
    ...typography.headline,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 22,
  },
});
