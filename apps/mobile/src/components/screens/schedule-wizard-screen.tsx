import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DEFAULT_AIR_STATE,
  MAX_TEMPERATURE,
  MIN_TEMPERATURE,
  type AirState,
  type ScheduleRepeat,
} from '@smart-ac/shared';

import { useDevicesStore } from '../../stores/devices-store';
import { useSchedulesStore } from '../../stores/schedules-store';
import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { formatDeviceTitle } from '../../utils/air-labels';
import {
  formatClock,
  formatLeadLabel,
  formatRepeatLabel,
  LEAD_PRESETS,
  TIME_PRESETS,
  wizardPhaseIndex,
  wizardStepForPhase,
  wizardStepHint,
  wizardStepTitle,
  type WizardPhase,
  type WizardStep,
} from '../../utils/schedule-labels';
import { ControlChip } from '../base/control-chip';
import { FanSelector } from '../base/fan-selector';
import { ModeSelector } from '../base/mode-selector';
import { OptionGrid } from '../base/option-grid';
import { PowerButton } from '../base/power-button';
import { ScheduleSummaryCard } from '../base/schedule-summary-card';
import { TemperatureControl } from '../base/temperature-control';
import { WizardStepper } from '../base/wizard-stepper';
import { ScreenNames, type RootStackParamList } from '../navigation/screen-names';

type Props = NativeStackScreenProps<RootStackParamList, typeof ScreenNames.ScheduleWizard>;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const ScheduleWizardScreen = ({ navigation, route }: Props) => {
  const scheduleId = route.params?.scheduleId;
  const devices = useDevicesStore((state) => state.devices);
  const loadDevices = useDevicesStore((state) => state.loadDevices);
  const schedules = useSchedulesStore((state) => state.schedules);
  const loadSchedules = useSchedulesStore((state) => state.loadSchedules);
  const createSchedule = useSchedulesStore((state) => state.createSchedule);
  const updateSchedule = useSchedulesStore((state) => state.updateSchedule);
  const isMutating = useSchedulesStore((state) => state.isMutating);
  const errorMessage = useSchedulesStore((state) => state.errorMessage);

  const existing = useMemo(
    () => (scheduleId ? schedules.find((item) => item.id === scheduleId) : undefined),
    [scheduleId, schedules],
  );

  const [step, setStep] = useState<WizardStep>(existing ? 'confirm' : 'air');
  const [maxReachableIndex, setMaxReachableIndex] = useState(() =>
    existing ? wizardPhaseIndex('confirm') : 0,
  );
  const [airConditionerId, setAirConditionerId] = useState<string | undefined>(
    existing?.airConditionerId,
  );
  const [targetHour, setTargetHour] = useState<number | undefined>(existing?.targetHour);
  const [targetMinute, setTargetMinute] = useState<number | undefined>(existing?.targetMinute);
  const [leadMinutes, setLeadMinutes] = useState<number | undefined>(existing?.leadMinutes);
  const [repeat, setRepeat] = useState<ScheduleRepeat | undefined>(existing?.repeat);
  const [pickingCustomTime, setPickingCustomTime] = useState(false);
  const [state, setState] = useState<AirState>(
    existing ? { ...existing.state } : { ...DEFAULT_AIR_STATE, power: true },
  );
  const [didHydrateEdit, setDidHydrateEdit] = useState(!scheduleId);

  useEffect(() => {
    if (devices.length === 0) {
      void loadDevices();
    }
  }, [devices.length, loadDevices]);

  useEffect(() => {
    if (scheduleId && !existing) {
      void loadSchedules();
    }
  }, [existing, loadSchedules, scheduleId]);

  useEffect(() => {
    if (!scheduleId || didHydrateEdit || !existing) {
      return;
    }
    setAirConditionerId(existing.airConditionerId);
    setTargetHour(existing.targetHour);
    setTargetMinute(existing.targetMinute);
    setLeadMinutes(existing.leadMinutes);
    setRepeat(existing.repeat);
    setState({ ...existing.state });
    setStep('confirm');
    setMaxReachableIndex(wizardPhaseIndex('confirm'));
    setDidHydrateEdit(true);
  }, [didHydrateEdit, existing, scheduleId]);

  useEffect(() => {
    navigation.setOptions({ title: wizardStepTitle(step) });
  }, [navigation, step]);

  const goToStep = useCallback((next: WizardStep) => {
    setStep(next);
    setMaxReachableIndex((current) => Math.max(current, wizardPhaseIndex(next)));
  }, []);

  const airName = useMemo(
    () => devices.find((device) => device.id === airConditionerId)?.name,
    [airConditionerId, devices],
  );

  const airOptions = useMemo(
    () =>
      devices.map((device) => ({
        value: device.id,
        label: formatDeviceTitle(device.id, device.name),
        subtitle: device.online ? 'En línea' : 'Offline',
      })),
    [devices],
  );

  const timePresetOptions = useMemo(
    () =>
      TIME_PRESETS.map((preset) => ({
        value: formatClock(preset.hour, preset.minute),
        label: formatClock(preset.hour, preset.minute),
        subtitle: 'Preset',
      })),
    [],
  );

  const hourOptions = useMemo(
    () =>
      HOURS.map((hour) => ({
        value: hour,
        label: String(hour).padStart(2, '0'),
      })),
    [],
  );

  const minuteOptions = useMemo(
    () =>
      MINUTES.map((minute) => ({
        value: minute,
        label: String(minute).padStart(2, '0'),
      })),
    [],
  );

  const leadOptions = useMemo(
    () =>
      LEAD_PRESETS.map((minutes) => ({
        value: minutes,
        label: minutes === 0 ? '0 min' : formatLeadLabel(minutes).replace(' antes', ''),
        subtitle: minutes === 0 ? 'Misma hora' : 'Antes',
      })),
    [],
  );

  const patchState = useCallback((patch: Partial<AirState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'air':
        navigation.goBack();
        return;
      case 'time':
        goToStep('air');
        return;
      case 'hour':
        setPickingCustomTime(false);
        goToStep('time');
        return;
      case 'minute':
        goToStep('hour');
        return;
      case 'lead':
        goToStep(pickingCustomTime ? 'minute' : 'time');
        return;
      case 'repeat':
        goToStep('lead');
        return;
      case 'state':
        goToStep('repeat');
        return;
      case 'confirm':
        goToStep('state');
    }
  }, [goToStep, navigation, pickingCustomTime, step]);

  const handleSelectPhase = useCallback(
    (phase: WizardPhase) => {
      const next = wizardStepForPhase(phase);
      if (next === 'time') {
        setPickingCustomTime(false);
      }
      setStep(next);
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (
      airConditionerId === undefined ||
      targetHour === undefined ||
      targetMinute === undefined ||
      leadMinutes === undefined ||
      repeat === undefined
    ) {
      return;
    }

    const input = {
      airConditionerId,
      targetHour,
      targetMinute,
      leadMinutes,
      repeat,
      state,
    };

    const saved = scheduleId
      ? await updateSchedule(scheduleId, input)
      : await createSchedule(input);

    if (saved) {
      navigation.goBack();
    }
  }, [
    airConditionerId,
    createSchedule,
    leadMinutes,
    navigation,
    repeat,
    scheduleId,
    state,
    targetHour,
    targetMinute,
    updateSchedule,
  ]);

  const handleSelectTimePreset = useCallback(
    (value: string) => {
      const [hourText, minuteText] = value.split(':');
      setTargetHour(Number(hourText));
      setTargetMinute(Number(minuteText));
      setPickingCustomTime(false);
      goToStep('lead');
    },
    [goToStep],
  );

  const activeIndex = wizardPhaseIndex(step);
  const saveLabel = scheduleId
    ? isMutating
      ? 'Guardando…'
      : '✅ Guardar cambios'
    : isMutating
      ? 'Guardando…'
      : '✅ Guardar programa';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Atrás"
        onPress={handleBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backLabel}>{step === 'air' && !scheduleId ? 'Cancelar' : '← Atrás'}</Text>
      </Pressable>

      <WizardStepper
        activeIndex={activeIndex}
        maxReachableIndex={maxReachableIndex}
        onSelectPhase={handleSelectPhase}
      />

      <View style={styles.intro}>
        <Text style={styles.hint}>{wizardStepHint(step)}</Text>
        {airName && step !== 'air' ? (
          <Text style={styles.progress}>
            {airConditionerId ? formatDeviceTitle(airConditionerId, airName) : airName}
          </Text>
        ) : null}
      </View>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {step === 'air' ? (
        <View style={styles.section}>
          {airOptions.length > 0 ? (
            <OptionGrid
              options={airOptions}
              selectedValue={airConditionerId}
              onSelect={(value) => {
                setAirConditionerId(value);
                goToStep('time');
              }}
            />
          ) : (
            <Text style={styles.empty}>No hay aires disponibles.</Text>
          )}
        </View>
      ) : null}

      {step === 'time' ? (
        <View style={styles.section}>
          <OptionGrid
            options={timePresetOptions}
            selectedValue={
              targetHour !== undefined && targetMinute !== undefined && !pickingCustomTime
                ? formatClock(targetHour, targetMinute)
                : undefined
            }
            onSelect={handleSelectTimePreset}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Elegir otra hora"
            onPress={() => {
              setPickingCustomTime(true);
              setTargetHour(undefined);
              setTargetMinute(undefined);
              goToStep('hour');
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>🕐 Otra hora…</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'hour' ? (
        <View style={styles.section}>
          <OptionGrid
            options={hourOptions}
            selectedValue={targetHour}
            density="compact"
            columns={6}
            onSelect={(hour) => {
              setTargetHour(hour);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuar a minutos"
            disabled={targetHour === undefined}
            onPress={() => {
              if (targetHour !== undefined) {
                goToStep('minute');
              }
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || targetHour === undefined) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryLabel}>Continuar</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'minute' ? (
        <View style={styles.section}>
          <OptionGrid
            options={minuteOptions}
            selectedValue={targetMinute}
            density="compact"
            columns={4}
            onSelect={(minute) => {
              setTargetMinute(minute);
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuar a antelación"
            disabled={targetMinute === undefined}
            onPress={() => {
              if (targetMinute !== undefined) {
                goToStep('lead');
              }
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || targetMinute === undefined) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryLabel}>Continuar</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'lead' ? (
        <View style={styles.section}>
          <OptionGrid
            options={leadOptions}
            selectedValue={leadMinutes}
            onSelect={(minutes) => {
              setLeadMinutes(minutes);
              goToStep('repeat');
            }}
          />
          {targetHour !== undefined && targetMinute !== undefined ? (
            <Text style={styles.helper}>
              Objetivo {formatClock(targetHour, targetMinute)}. La antelación adelanta el envío de la
              orden.
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 'repeat' ? (
        <View style={styles.section}>
          <View style={styles.chips}>
            {(['once', 'daily'] as const).map((value) => (
              <ControlChip
                key={value}
                label={formatRepeatLabel(value)}
                isSelected={repeat === value}
                onPress={() => {
                  setRepeat(value);
                  goToStep('state');
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {step === 'state' ? (
        <View style={styles.section}>
          <PowerButton
            isPoweredOn={state.power}
            onPress={() => {
              patchState({ power: !state.power });
            }}
          />
          <TemperatureControl
            temperature={state.temperature}
            isDisabled={!state.power}
            onChangeTemperature={(temperature) => {
              patchState({
                temperature: Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, temperature)),
              });
            }}
          />
          <Text style={styles.sectionLabel}>Modo</Text>
          <ModeSelector
            mode={state.mode}
            isDisabled={!state.power}
            onChangeMode={(mode) => {
              patchState({ mode });
            }}
          />
          <Text style={styles.sectionLabel}>Ventilador</Text>
          <FanSelector
            fan={state.fan}
            isDisabled={!state.power}
            onChangeFan={(fan) => {
              patchState({ fan });
            }}
          />
          <View style={styles.chips}>
            <ControlChip
              label={state.swing ? '↕️ Swing ON' : '↕️ Swing'}
              isSelected={state.swing}
              isDisabled={!state.power}
              onPress={() => {
                patchState({ swing: !state.swing });
              }}
            />
            <ControlChip
              label={state.turbo ? '⚡ Turbo ON' : '⚡ Turbo'}
              isSelected={state.turbo}
              isDisabled={!state.power}
              onPress={() => {
                patchState({ turbo: !state.turbo });
              }}
            />
            <ControlChip
              label={state.eco ? '🌱 Eco ON' : '🌱 Eco'}
              isSelected={state.eco}
              isDisabled={!state.power}
              onPress={() => {
                patchState({ eco: !state.eco });
              }}
            />
            <ControlChip
              label={state.led ? '💡 LED ON' : '💡 LED'}
              isSelected={state.led}
              isDisabled={!state.power}
              onPress={() => {
                patchState({ led: !state.led });
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuar a confirmar"
            onPress={() => {
              goToStep('confirm');
            }}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryLabel}>Revisar resumen</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'confirm' &&
      airConditionerId &&
      airName &&
      targetHour !== undefined &&
      targetMinute !== undefined &&
      leadMinutes !== undefined &&
      repeat ? (
        <View style={styles.section}>
          <ScheduleSummaryCard
            airName={airName}
            airConditionerId={airConditionerId}
            targetHour={targetHour}
            targetMinute={targetMinute}
            leadMinutes={leadMinutes}
            repeat={repeat}
            state={state}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={scheduleId ? 'Guardar cambios' : 'Guardar programa'}
            disabled={isMutating}
            onPress={() => {
              void handleConfirm();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isMutating) && styles.pressed,
            ]}
          >
            <Text style={styles.primaryLabel}>{saveLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = createStyles({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.xl,
    gap: spacing.m,
  },
  intro: {
    gap: spacing.xxs,
  },
  progress: {
    ...typography.caption,
    color: colors.textMuted,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  section: {
    gap: spacing.m,
  },
  hint: {
    ...typography.body,
    color: colors.text,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.m,
    paddingVertical: spacing.s,
    alignItems: 'center',
  },
  primaryLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.l,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    ...typography.bodyBold,
    color: colors.accent,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  backLabel: {
    ...typography.bodyBold,
    color: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
