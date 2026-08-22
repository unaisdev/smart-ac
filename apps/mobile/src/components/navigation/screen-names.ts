export const ScreenNames = {
  DeviceList: 'DeviceList',
  Remote: 'Remote',
  ScheduleList: 'ScheduleList',
  ScheduleWizard: 'ScheduleWizard',
} as const;

export type ScreenName = (typeof ScreenNames)[keyof typeof ScreenNames];

export type RootStackParamList = {
  [ScreenNames.DeviceList]: undefined;
  [ScreenNames.Remote]: { deviceId: string };
  [ScreenNames.ScheduleList]: undefined;
  [ScreenNames.ScheduleWizard]: { scheduleId?: string } | undefined;
};
