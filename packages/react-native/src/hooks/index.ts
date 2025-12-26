/**
 * ChatSDK React Native Hooks
 * Mobile-specific hooks for app state, keyboard, push notifications
 */

export {
  useAppState,
  useSyncOnForeground,
  type UseAppStateResult,
} from './useAppState';

export {
  useKeyboard,
  useKeyboardDismiss,
  useKeyboardAvoiding,
  type KeyboardInfo,
  type UseKeyboardOptions,
} from './useKeyboard';

export {
  usePushNotifications,
  useNotificationPreferences,
  getNotificationNavigationTarget,
  type PushNotificationConfig,
  type PushNotification,
  type UsePushNotificationsResult,
  type NotificationPreferences,
} from './usePushNotifications';
