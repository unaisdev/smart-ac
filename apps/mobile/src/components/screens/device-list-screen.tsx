import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AirConditionerView } from '@smart-ac/shared';

import { useDevicesStore } from '../../stores/devices-store';
import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { AirConditionerCard } from '../base/air-conditioner-card';
import { BackendStatusLine } from '../base/backend-status-line';
import { ScreenNames, type RootStackParamList } from '../navigation/screen-names';

type Props = NativeStackScreenProps<RootStackParamList, typeof ScreenNames.DeviceList>;

export const DeviceListScreen = ({ navigation }: Props) => {
  const devices = useDevicesStore((state) => state.devices);
  const isLoading = useDevicesStore((state) => state.isLoading);
  const isBackendReachable = useDevicesStore((state) => state.isBackendReachable);
  const errorMessage = useDevicesStore((state) => state.errorMessage);
  const loadDevices = useDevicesStore((state) => state.loadDevices);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleRefresh = useCallback(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleOpenDevice = useCallback(
    (id: string) => {
      navigation.navigate(ScreenNames.Remote, { deviceId: id });
    },
    [navigation],
  );

  const handleOpenSchedules = useCallback(() => {
    navigation.navigate(ScreenNames.ScheduleList);
  }, [navigation]);

  const renderItem = useCallback(
    ({ item }: { item: AirConditionerView }) => (
      <AirConditionerCard device={item} onPress={() => handleOpenDevice(item.id)} />
    ),
    [handleOpenDevice],
  );

  const listFooter = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Programas"
      onPress={handleOpenSchedules}
      style={({ pressed }) => [styles.schedulesButton, pressed && styles.pressed]}
    >
      <Text style={styles.schedulesLabel}>Programas</Text>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <BackendStatusLine isBackendReachable={isBackendReachable} />
      <Text style={styles.title}>🏠 Mis aires</Text>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {isLoading && devices.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} style={styles.loader} />
          {listFooter}
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={listFooter}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No hay aires. ¿Está el backend en marcha?</Text>
          }
        />
      )}
    </View>
  );
};

const styles = createStyles({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.l,
    paddingBottom: spacing.m,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.m,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.s,
  },
  loadingWrap: {
    flex: 1,
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    paddingBottom: spacing.m,
    flexGrow: 1,
  },
  separator: {
    height: spacing.s,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  schedulesButton: {
    marginTop: spacing.l,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.s,
    alignItems: 'center',
  },
  schedulesLabel: {
    ...typography.bodyBold,
    color: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
