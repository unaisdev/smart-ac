import { Pressable, Text, View } from 'react-native';
import { MAX_TEMPERATURE, MIN_TEMPERATURE } from '@smart-ac/shared';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';

interface Props {
  temperature: number;
  isDisabled?: boolean;
  onChangeTemperature: (temperature: number) => void;
}

export const TemperatureControl = ({
  temperature,
  isDisabled = false,
  onChangeTemperature,
}: Props) => {
  const handleDecrement = () => {
    if (temperature <= MIN_TEMPERATURE) {
      return;
    }
    onChangeTemperature(temperature - 1);
  };

  const handleIncrement = () => {
    if (temperature >= MAX_TEMPERATURE) {
      return;
    }
    onChangeTemperature(temperature + 1);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bajar temperatura"
        disabled={isDisabled || temperature <= MIN_TEMPERATURE}
        onPress={handleDecrement}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>−</Text>
      </Pressable>
      <Text style={styles.temperature}>{temperature}°</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Subir temperatura"
        disabled={isDisabled || temperature >= MAX_TEMPERATURE}
        onPress={handleIncrement}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonLabel}>+</Text>
      </Pressable>
    </View>
  );
};

const styles = createStyles({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.l,
  },
  temperature: {
    ...typography.temperature,
    color: colors.text,
    minWidth: 120,
    textAlign: 'center',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: radius.m,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  buttonLabel: {
    fontSize: 28,
    color: colors.text,
    fontWeight: '300',
  },
});
