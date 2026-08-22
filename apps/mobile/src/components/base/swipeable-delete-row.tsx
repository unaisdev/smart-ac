import { type PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  type PanResponderGestureState,
  Pressable,
  Text,
  View,
} from 'react-native';

import { createStyles } from '../../theme/create-styles';
import { colors, radius, spacing, typography } from '../../theme/tokens';

const ACTION_WIDTH = 88;
/** Snap open only past ~40% of the action width (avoids half-open stuck states). */
const OPEN_THRESHOLD = ACTION_WIDTH * 0.4;
const OPEN_VELOCITY = -0.4;
const CLOSE_VELOCITY = 0.4;

interface Props extends PropsWithChildren {
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Called when a horizontal swipe begins — parent should close other rows. */
  onSwipeStart?: () => void;
  onDeletePress: () => void;
  isDisabled?: boolean;
}

export const SwipeableDeleteRow = ({
  children,
  isOpen = false,
  onOpenChange,
  onSwipeStart,
  onDeletePress,
  isDisabled = false,
}: Props) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetX = useRef(0);
  const isOpenRef = useRef(isOpen);
  const isDisabledRef = useRef(isDisabled);
  const onOpenChangeRef = useRef(onOpenChange);
  const onSwipeStartRef = useRef(onSwipeStart);
  const onDeletePressRef = useRef(onDeletePress);

  isOpenRef.current = isOpen;
  isDisabledRef.current = isDisabled;
  onOpenChangeRef.current = onOpenChange;
  onSwipeStartRef.current = onSwipeStart;
  onDeletePressRef.current = onDeletePress;

  const clamp = (value: number) => Math.min(0, Math.max(-ACTION_WIDTH, value));

  const animateTo = (toValue: number) => {
    offsetX.current = toValue;
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const commitOpen = (nextOpen: boolean) => {
    animateTo(nextOpen ? -ACTION_WIDTH : 0);
    if (isOpenRef.current !== nextOpen) {
      onOpenChangeRef.current?.(nextOpen);
    }
  };

  useEffect(() => {
    const target = isOpen ? -ACTION_WIDTH : 0;
    if (offsetX.current === target) {
      return;
    }
    animateTo(target);
  }, [isOpen, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !isDisabledRef.current &&
        Math.abs(gesture.dx) > 8 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        onSwipeStartRef.current?.();
        translateX.stopAnimation((value) => {
          offsetX.current = typeof value === 'number' ? value : offsetX.current;
        });
      },
      onPanResponderMove: (_, gesture: PanResponderGestureState) => {
        translateX.setValue(clamp(offsetX.current + gesture.dx));
      },
      onPanResponderRelease: (_, gesture: PanResponderGestureState) => {
        const next = clamp(offsetX.current + gesture.dx);
        if (gesture.vx > CLOSE_VELOCITY) {
          commitOpen(false);
          return;
        }
        if (next < -OPEN_THRESHOLD || gesture.vx < OPEN_VELOCITY) {
          commitOpen(true);
          return;
        }
        commitOpen(false);
      },
      onPanResponderTerminate: () => {
        commitOpen(isOpenRef.current);
      },
    }),
  ).current;

  const handleDeletePress = () => {
    commitOpen(false);
    onDeletePressRef.current();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.actions} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar programa"
          disabled={isDisabled}
          onPress={handleDeletePress}
          style={({ pressed }) => [styles.deleteAction, pressed && styles.pressed]}
        >
          <Text style={styles.deleteIcon}>🗑</Text>
          <Text style={styles.deleteLabel}>Borrar</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = createStyles({
  wrap: {
    overflow: 'hidden',
    borderRadius: radius.m,
    backgroundColor: colors.danger,
  },
  actions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: colors.danger,
  },
  deleteAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.s,
  },
  deleteIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  deleteLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
  foreground: {
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
});
