import { Pressable, Text, View } from 'react-native';
import type { AirConditionerView } from '@smart-ac/shared';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { formatActiveStateLine, formatDeviceTitle } from '../../utils/air-labels';

interface Props {
  device: AirConditionerView;
  onPress: () => void;
}

export const AirConditionerCard = ({ device, onPress }: Props) => {
  const isPoweredOn = device.desiredState.power;
  const stateLine = formatActiveStateLine(device.desiredState);
  const powerLabel = isPoweredOn ? 'encendido' : 'apagado';
  const onlineLabel = device.online ? undefined : 'desconectado';
  const accessibilityLabel = [
    formatDeviceTitle(device.id, device.name),
    powerLabel,
    onlineLabel,
    stateLine ?? undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View
          style={[styles.dot, isPoweredOn ? styles.dotOn : styles.dotOff]}
        />
        <Text style={styles.name} numberOfLines={1}>
          {formatDeviceTitle(device.id, device.name)}
        </Text>
      </View>
      {stateLine ? (
        <Text style={styles.meta} numberOfLines={2}>
          {stateLine}
        </Text>
      ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOn: {
    backgroundColor: colors.success,
  },
  dotOff: {
    backgroundColor: colors.danger,
  },
  name: {
    ...typography.headline,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 24,
  },
});
