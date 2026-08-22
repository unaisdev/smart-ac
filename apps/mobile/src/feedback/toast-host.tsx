import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStyles } from '../theme/create-styles';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { useToastStore, type ToastTone } from './toast-store';

const ACCENT: Record<ToastTone, string> = {
  success: colors.success,
  warning: colors.warning,
  error: colors.danger,
};

export const ToastHost = () => {
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: Math.max(insets.bottom, spacing.m) + spacing.s }]}
    >
      {toasts.map((toast) => (
        <Pressable
          key={toast.id}
          accessibilityRole="button"
          accessibilityLabel={`${toast.title}. ${toast.message}`}
          onPress={() => dismiss(toast.id)}
          style={[styles.card, { borderLeftColor: ACCENT[toast.tone] }]}
        >
          <Text style={styles.title}>{toast.title}</Text>
          <Text style={styles.message}>{toast.message}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = createStyles({
  host: {
    position: 'absolute',
    left: spacing.m,
    right: spacing.m,
    gap: spacing.xs,
    zIndex: 1000,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.m,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
  },
  message: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
