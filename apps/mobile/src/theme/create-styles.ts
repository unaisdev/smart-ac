import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

type RNStyle = ViewStyle | TextStyle | ImageStyle;

export function createStyles<T extends Record<string, RNStyle>>(styles: T): T {
  return StyleSheet.create(styles) as T;
}
