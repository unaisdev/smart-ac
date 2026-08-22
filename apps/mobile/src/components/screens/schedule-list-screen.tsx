import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AirConditionerSchedule } from '@smart-ac/shared';

import { useDevicesStore } from '../../stores/devices-store';
import { useSchedulesStore } from '../../stores/schedules-store';
import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { formatNextExecuteAt } from '../../utils/schedule-labels';
import { ScheduleSummaryCard } from '../base/schedule-summary-card';
import { SwipeableDeleteRow } from '../base/swipeable-delete-row';
import { ScreenNames, type RootStackParamList } from '../navigation/screen-names';

type Props = NativeStackScreenProps<RootStackParamList, typeof ScreenNames.ScheduleList>;

export const ScheduleListScreen = ({ navigation }: Props) => {
  const schedules = useSchedulesStore((state) => state.schedules);
  const isLoading = useSchedulesStore((state) => state.isLoading);
  const isMutating = useSchedulesStore((state) => state.isMutating);
  const errorMessage = useSchedulesStore((state) => state.errorMessage);
  const loadSchedules = useSchedulesStore((state) => state.loadSchedules);
  const deleteSchedule = useSchedulesStore((state) => state.deleteSchedule);
  const devices = useDevicesStore((state) => state.devices);
  const loadDevices = useDevicesStore((state) => state.loadDevices);
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  useEffect(() => {
    void loadSchedules();
    if (devices.length === 0) {
      void loadDevices();
    }
  }, [devices.length, loadDevices, loadSchedules]);

  const handleRefresh = useCallback(() => {
    setOpenRowId(null);
    void loadSchedules();
  }, [loadSchedules]);

  const handleCreate = useCallback(() => {
    setOpenRowId(null);
    navigation.navigate(ScreenNames.ScheduleWizard);
  }, [navigation]);

  const handleEdit = useCallback(
    (scheduleId: string) => {
      setOpenRowId(null);
      navigation.navigate(ScreenNames.ScheduleWizard, { scheduleId });
    },
    [navigation],
  );

  const handleDeleteRequest = useCallback(
    (item: AirConditionerSchedule) => {
      Alert.alert('¿Borrar este programa?', undefined, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            setOpenRowId(null);
            void deleteSchedule(item.id);
          },
        },
      ]);
    },
    [deleteSchedule],
  );

  const deviceName = useCallback(
    (airConditionerId: string) =>
      devices.find((device) => device.id === airConditionerId)?.name ?? airConditionerId,
    [devices],
  );

  const renderItem = useCallback(
    ({ item }: { item: AirConditionerSchedule }) => (
      <SwipeableDeleteRow
        isDisabled={isMutating}
        isOpen={openRowId === item.id}
        onOpenChange={(isOpen) => {
          setOpenRowId(isOpen ? item.id : null);
        }}
        onSwipeStart={() => {
          setOpenRowId((current) =>
            current !== null && current !== item.id ? null : current,
          );
        }}
        onDeletePress={() => {
          handleDeleteRequest(item);
        }}
      >
        <ScheduleSummaryCard
          isClipped
          airName={deviceName(item.airConditionerId)}
          airConditionerId={item.airConditionerId}
          targetHour={item.targetHour}
          targetMinute={item.targetMinute}
          leadMinutes={item.leadMinutes}
          repeat={item.repeat}
          state={item.state}
          nextExecuteLabel={formatNextExecuteAt(item.nextExecuteAt)}
          onPress={() => {
            handleEdit(item.id);
          }}
        />
      </SwipeableDeleteRow>
    ),
    [deviceName, handleDeleteRequest, handleEdit, isMutating, openRowId],
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.subtitle}>
        📋 El backend ejecuta los programas (hora de Madrid). No hace falta dejar la app abierta.
      </Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {isLoading && schedules.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <FlatList
          data={schedules}
          extraData={openRowId}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              📋 No hay programas. Crea uno (p. ej. 1 h antes de las 08:00).
            </Text>
          }
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nuevo programa"
        onPress={handleCreate}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryLabel}>⏰ Nuevo programa</Text>
      </Pressable>
    </View>
  );
};

const styles = createStyles({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    paddingBottom: spacing.m,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.m,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.s,
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    paddingBottom: spacing.m,
    flexGrow: 1,
  },
  separator: {
    height: spacing.m,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: radius.m,
    paddingVertical: spacing.s,
    alignItems: 'center',
  },
  primaryLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
});
