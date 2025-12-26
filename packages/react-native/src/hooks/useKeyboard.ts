/**
 * useKeyboard - React Native keyboard handling for ChatSDK
 * Handles keyboard show/hide and adjusts layout accordingly
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  Platform,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface KeyboardInfo {
  isVisible: boolean;
  height: number;
  duration: number;
  screenHeight: number;
}

export interface UseKeyboardOptions {
  useLayoutAnimation?: boolean;
}

/**
 * useKeyboard - Track keyboard visibility and height
 *
 * @example
 * ```tsx
 * const { isVisible, height } = useKeyboard();
 *
 * return (
 *   <View style={{ paddingBottom: isVisible ? height : 0 }}>
 *     <MessageList />
 *     <MessageInput />
 *   </View>
 * );
 * ```
 */
export function useKeyboard(options: UseKeyboardOptions = {}): KeyboardInfo {
  const { useLayoutAnimation = true } = options;
  const screenHeight = Dimensions.get('window').height;

  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
    duration: 250,
    screenHeight,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: KeyboardEvent) => {
      if (useLayoutAnimation) {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            event.duration || 250,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity
          )
        );
      }

      setKeyboardInfo({
        isVisible: true,
        height: event.endCoordinates.height,
        duration: event.duration || 250,
        screenHeight,
      });
    };

    const handleKeyboardHide = (event: KeyboardEvent) => {
      if (useLayoutAnimation) {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            event.duration || 250,
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity
          )
        );
      }

      setKeyboardInfo({
        isVisible: false,
        height: 0,
        duration: event.duration || 250,
        screenHeight,
      });
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [screenHeight, useLayoutAnimation]);

  return keyboardInfo;
}

/**
 * useKeyboardDismiss - Dismiss keyboard on tap outside
 */
export function useKeyboardDismiss(): {
  dismissKeyboard: () => void;
} {
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return { dismissKeyboard };
}

/**
 * useKeyboardAvoiding - Calculate offset for keyboard avoiding behavior
 *
 * @param extraOffset - Additional offset to add
 */
export function useKeyboardAvoiding(extraOffset = 0): {
  keyboardOffset: number;
  isKeyboardVisible: boolean;
} {
  const { isVisible, height } = useKeyboard();

  return {
    keyboardOffset: isVisible ? height + extraOffset : 0,
    isKeyboardVisible: isVisible,
  };
}
