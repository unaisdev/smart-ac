import { useCallback, useRef } from 'react';
import {
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';

export interface CarouselOption<T extends string | number> {
  value: T;
  label: string;
  subtitle?: string;
}

interface Props<T extends string | number> {
  options: ReadonlyArray<CarouselOption<T>>;
  selectedValue?: T;
  onSelect: (value: T) => void;
  /** When true, snapping the carousel also selects (hour/minute pickers). */
  selectOnSnap?: boolean;
  itemWidth?: number;
}

export const OptionCarousel = <T extends string | number>({
  options,
  selectedValue,
  onSelect,
  selectOnSnap = false,
  itemWidth,
}: Props<T>) => {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = itemWidth ?? Math.min(148, Math.round(windowWidth * 0.38));
  const gap = spacing.s;
  const sidePad = Math.max(spacing.m, (windowWidth - cardWidth) / 2 - spacing.m);
  const listRef = useRef<FlatList<CarouselOption<T>>>(null);

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!selectOnSnap) {
        return;
      }
      const offset = event.nativeEvent.contentOffset.x;
      const index = Math.round(offset / (cardWidth + gap));
      const option = options[Math.min(Math.max(index, 0), options.length - 1)];
      if (option) {
        onSelect(option.value);
      }
    },
    [cardWidth, gap, onSelect, options, selectOnSnap],
  );

  const renderItem: ListRenderItem<CarouselOption<T>> = useCallback(
    ({ item }) => {
      const isSelected = item.value === selectedValue;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={item.subtitle ? `${item.label}, ${item.subtitle}` : item.label}
          onPress={() => {
            onSelect(item.value);
          }}
          style={({ pressed }) => [
            styles.card,
            { width: cardWidth },
            isSelected ? styles.cardSelected : styles.cardIdle,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.label, isSelected && styles.labelSelected]}>{item.label}</Text>
          {item.subtitle ? (
            <Text style={[styles.subtitle, isSelected && styles.subtitleSelected]}>
              {item.subtitle}
            </Text>
          ) : null}
        </Pressable>
      );
    },
    [cardWidth, onSelect, selectedValue],
  );

  return (
    <View>
      <FlatList
        ref={listRef}
        horizontal
        data={[...options]}
        keyExtractor={(item) => String(item.value)}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + gap}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingHorizontal: sidePad,
          gap,
          paddingVertical: spacing.xs,
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={(_, index) => ({
          length: cardWidth + gap,
          offset: (cardWidth + gap) * index,
          index,
        })}
      />
      <Text style={styles.hint}>Desliza para ver más opciones</Text>
    </View>
  );
};

const styles = createStyles({
  card: {
    minHeight: 88,
    borderRadius: radius.l,
    borderWidth: 1,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.s,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  cardIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  label: {
    ...typography.headline,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  subtitleSelected: {
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
});
