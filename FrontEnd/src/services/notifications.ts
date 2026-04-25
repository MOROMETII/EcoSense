import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BASE_URL = 'https://botryose-unshadily-wynell.ngrok-free.dev';

// Show notifications while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

/**
 * Requests permission, obtains the Expo push token, and registers it
 * with the server. Safe to call multiple times.
 */
export async function registerForPushNotifications(username: string): Promise<void> {
  if (!Device.isDevice) {
    console.warn('[Push] Running on simulator — skipping token registration.');
    // Uncomment the line below to test the fetch on a simulator anyway:
    // void testServerReachability();
    return;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission not granted. Status:', finalStatus);
    return;
  }

  // Android requires a notification channel.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  try {
    // projectId is required in SDK 51+. Read from EAS config if available.
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;


    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    const token = tokenData.data;
    const deviceName = Device.deviceName ?? 'Unknown Device';
    const payload = { "token":token, "deviceName":deviceName, "username":username };

    const res = await fetch(`${BASE_URL}/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
  } catch (e) {
  }
}
