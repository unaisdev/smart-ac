import { View } from 'react-native';
import { FAN_SPEEDS, type FanSpeed } from '@smart-ac/shared';

import { createStyles } from '../../theme/create-styles';
import { spacing } from '../../theme/tokens';
import { formatFanLabel } from '../../utils/air-labels';
import { ControlChip } from './control-chip';

interface Props {
  fan: FanSpeed;
  isDisabled?: boolean;
  onChangeFan: (fan: FanSpeed) => void;
}

export const FanSelector = ({ fan, isDisabled = false, onChangeFan }: Props) => {
  return (
    <View style={styles.row}>
      {FAN_SPEEDS.map((value) => (
        <ControlChip
          key={value}
          label={formatFanLabel(value)}
          isSelected={fan === value}
          isDisabled={isDisabled}
          onPress={() => onChangeFan(value)}
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
