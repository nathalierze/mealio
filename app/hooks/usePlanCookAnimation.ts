import { useRef } from 'react';
import { Animated } from 'react-native';

// "Gekocht"-Animation (Stempel-Overlay + Scale), geteilt zwischen der
// normalen und der kompakten Plan-Karte.
export function usePlanCookAnimation(onCooked: () => void) {
  const scale = useRef(new Animated.Value(1)).current;
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  function handleCook() {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.02, friction: 4, useNativeDriver: true }),
        Animated.timing(stampOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(550),
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.95, duration: 280, useNativeDriver: true }),
      ]),
    ]).start(() => onCooked());
  }

  return { scale, stampOpacity, cardOpacity, handleCook };
}
