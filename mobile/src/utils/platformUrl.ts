import { Platform } from 'react-native';

/**
 * Android emulator uses 10.0.2.2 to reach the host machine's localhost.
 * iOS simulator and web use localhost directly.
 * Physical devices need the actual LAN IP of the dev machine.
 */
export function resolveUrl(url: string): string {
  if (Platform.OS === 'android') {
    return url
      .replace('localhost', '10.0.2.2')
      .replace('127.0.0.1', '10.0.2.2');
  }
  return url;
}
