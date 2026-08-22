import { View } from 'react-native';
import { AIR_MODES, type AirMode } from '@smart-ac/shared';

import { createStyles } from '../../theme/create-styles';
import { spacing } from '../../theme/tokens';
import { formatModeLabel } from '../../utils/air-labels';
import { ControlChip } from './control-chip';

interface Props {
  mode: AirMode;
  isDisabled?: boolean;
  onChangeMode: (mode: AirMode) => void;
}

export const ModeSelector = ({ mode, isDisabled = false, onChangeMode }: Props) => {
  return (
    <View style={styles.row}>
      {AIR_MODES.map((value) => (
        <ControlChip
          key={value}
          label={formatModeLabel(value)}
          isSelected={mode === value}
          isDisabled={isDisabled}
          onPress={() => onChangeMode(value)}
        />
      ))}
    </View>
  );
};

const styles = createStyles({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
});
