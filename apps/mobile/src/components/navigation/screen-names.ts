export const ScreenNames = {
  DeviceList: 'DeviceList',
  Remote: 'Remote',
} as const;

export type ScreenName = (typeof ScreenNames)[keyof typeof ScreenNames];

export type RootStackParamList = {
  [ScreenNames.DeviceList]: undefined;
  [ScreenNames.Remote]: { deviceId: string };
};
