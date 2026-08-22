import { Text, View } from 'react-native';

import { createStyles } from '../../theme/create-styles';
import { colors, spacing, typography } from '../../theme/tokens';

type BackendStatus = 'checking' | 'ok' | 'error';

interface Props {
  /** `null` until the first API attempt finishes. */
  isBackendReachable: boolean | null;
}

function resolveStatus(isBackendReachable: boolean | null): BackendStatus {
  if (isBackendReachable === false) {
    return 'error';
  }
  if (isBackendReachable === true) {
    return 'ok';
  }
  return 'checking';
}

const STATUS_COPY: Record<BackendStatus, string> = {
  checking: 'Comprobando servicios…',
  ok: 'Todos los servicios en línea',
  error: 'Hay un problema con los servicios',
};

export const BackendStatusLine = ({ isBackendReachable }: Props) => {
  const status = resolveStatus(isBackendReachable);
  const label = STATUS_COPY[status];

  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={styles.row}>
      <View
        style={[
          styles.dot,
          status === 'ok' && styles.dotOk,
          status === 'error' && styles.dotError,
          status === 'checking' && styles.dotChecking,
        ]}
      />
      <Text
        style={[
          styles.label,
          status === 'ok' && styles.labelOk,
          status === 'error' && styles.labelError,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = createStyles({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOk: {
    backgroundColor: colors.success,
  },
  dotError: {
    backgroundColor: colors.danger,
  },
  dotChecking: {
    backgroundColor: colors.warning,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  labelOk: {
    color: colors.success,
  },
  labelError: {
    color: colors.danger,
  },
});
