import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useDevicesStore } from '../../stores/devices-store';
import { createStyles } from '../../theme/create-styles';
import { colors, spacing, typography } from '../../theme/tokens';
import { formatDesiredSummary, formatModeLabel } from '../../utils/air-labels';
import { ControlChip } from '../base/control-chip';
import { FanSelector } from '../base/fan-selector';
import { ModeSelector } from '../base/mode-selector';
import { PowerButton } from '../base/power-button';
import { TemperatureControl } from '../base/temperature-control';
import { ScreenNames, type RootStackParamList } from '../navigation/screen-names';

type Props = NativeStackScreenProps<RootStackParamList, typeof ScreenNames.Remote>;

export const RemoteScreen = ({ route }: Props) => {
  const { deviceId } = route.params;
  const device = useDevicesStore((state) =>
    state.devices.find((item) => item.id === deviceId),
  );
  const isMutating = useDevicesStore((state) => state.isMutating);
  const errorMessage = useDevicesStore((state) => state.errorMessage);
  const setPower = useDevicesStore((state) => state.setPower);
  const setTemperature = useDevicesStore((state) => state.setTemperature);
  const setMode = useDevicesStore((state) => state.setMode);
  const setFan = useDevicesStore((state) => state.setFan);
  const setSwing = useDevicesStore((state) => state.setSwing);
  const patchDesired = useDevicesStore((state) => state.patchDesired);

  if (!device) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>Dispositivo no encontrado</Text>
      </View>
    );
  }

  const { desiredState } = device;
  const summary = formatDesiredSummary(
    desiredState.power,
    desiredState.mode,
    desiredState.temperature,
  );

  const handleTogglePower = () => {
    void setPower(device.id, !desiredState.power);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{device.name}</Text>
      <Text style={styles.summary}>Última orden: {summary}</Text>
      <Text style={styles.online}>{device.online ? 'Controlador en línea' : 'Controlador offline'}</Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <Text style={styles.modeHero}>
        {desiredState.power ? formatModeLabel(desiredState.mode) : 'OFF'}
      </Text>

      <TemperatureControl
        temperature={desiredState.temperature}
        isDisabled={isMutating || !desiredState.power}
        onChangeTemperature={(temperature) => {
          void setTemperature(device.id, temperature);
        }}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Modo</Text>
        <ModeSelector
          mode={desiredState.mode}
          isDisabled={isMutating || !desiredState.power}
          onChangeMode={(mode) => {
            void setMode(device.id, mode);
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Ventilador</Text>
        <FanSelector
          fan={desiredState.fan}
          isDisabled={isMutating || !desiredState.power}
          onChangeFan={(fan) => {
            void setFan(device.id, fan);
          }}
        />
      </View>

      <View style={styles.toggles}>
        <ControlChip
          label="Swing"
          isSelected={desiredState.swing}
          isDisabled={isMutating || !desiredState.power}
          onPress={() => {
            void setSwing(device.id, !desiredState.swing);
          }}
        />
        <ControlChip
          label="Eco"
          isSelected={desiredState.eco}
          isDisabled={isMutating || !desiredState.power}
          onPress={() => {
            void patchDesired(device.id, { eco: !desiredState.eco });
          }}
        />
        <ControlChip
          label="Turbo"
          isSelected={desiredState.turbo}
          isDisabled={isMutating || !desiredState.power}
          onPress={() => {
            void patchDesired(device.id, { turbo: !desiredState.turbo });
          }}
        />
        <ControlChip
          label="LED"
          isSelected={desiredState.led}
          isDisabled={isMutating || !desiredState.power}
          onPress={() => {
            void patchDesired(device.id, { led: !desiredState.led });
          }}
        />
      </View>

      <PowerButton
        isPoweredOn={desiredState.power}
        isDisabled={isMutating}
        onPress={handleTogglePower}
      />
    </ScrollView>
  );
};

const styles = createStyles({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.m,
    gap: spacing.m,
    paddingBottom: spacing.xxl,
  },
  name: {
    ...typography.title,
    color: colors.text,
  },
  summary: {
    ...typography.body,
    color: colors.textMuted,
  },
  online: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modeHero: {
    ...typography.headline,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.s,
  },
  section: {
    gap: spacing.s,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  toggles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
