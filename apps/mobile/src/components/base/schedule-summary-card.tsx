import { Pressable, Text, View } from 'react-native';
import type { AirState, ScheduleRepeat } from '@smart-ac/shared';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { deviceEmoji, formatModeHero } from '../../utils/air-labels';
import {
  formatRepeatLabelShort,
  formatScheduleCardWhen,
} from '../../utils/schedule-labels';

interface Props {
  airName: string;
  airConditionerId?: string;
  targetHour: number;
  targetMinute: number;
  leadMinutes: number;
  repeat: ScheduleRepeat;
  state: AirState;
  nextExecuteLabel?: string;
  onPress?: () => void;
  /** When true, outer radius is provided by a parent clip (e.g. swipe row). */
  isClipped?: boolean;
}

export const ScheduleSummaryCard = ({
  airName,
  airConditionerId = '',
  targetHour,
  targetMinute,
  leadMinutes,
  repeat,
  state,
  nextExecuteLabel,
  onPress,
  isClipped = false,
}: Props) => {
  const when = formatScheduleCardWhen(targetHour, targetMinute, leadMinutes);
  const airEmoji = deviceEmoji(airConditionerId, airName);
  const stateLabel = state.power
    ? `${formatModeHero(state.mode)}  ${state.temperature}°C`
    : '⏻ OFF';

  const content = (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {airEmoji} {airName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatRepeatLabelShort(repeat)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {stateLabel}
        </Text>
        {nextExecuteLabel ? (
          <Text style={styles.next} numberOfLines={1}>
            Próx. {nextExecuteLabel}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {when.ambient ? (
          <Text style={styles.timePrimary} numberOfLines={1}>
            {when.ambient}
          </Text>
        ) : null}
        <Text
          style={when.ambient ? styles.timeSecondary : styles.timePrimary}
          numberOfLines={1}
        >
          {when.order}
        </Text>
        {when.lead ? (
          <Text style={styles.timeSecondary} numberOfLines={1}>
            {when.lead}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const cardStyle = [styles.card, isClipped && styles.cardClipped];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar programa de ${airName}`}
        onPress={onPress}
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = createStyles({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    overflow: 'hidden',
  },
  cardClipped: {
    borderRadius: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
  },
  left: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  right: {
    flexShrink: 0,
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  next: {
    ...typography.caption,
    color: colors.accent,
  },
  timePrimary: {
    ...typography.bodyBold,
    color: colors.text,
    textAlign: 'right',
  },
  timeSecondary: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.85,
  },
});
