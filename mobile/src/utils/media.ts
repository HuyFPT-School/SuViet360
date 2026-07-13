import { Platform } from 'react-native';
import { API_URL as RAW_API_URL } from '@/constants/theme';

// Android emulator uses 10.0.2.2 to reach host machine's localhost
const API_URL = Platform.select({
  android: RAW_API_URL.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2'),
  default: RAW_API_URL,
}) as string;

// The API is served at e.g. https://suviet360.onrender.com/api
// Media files (uploads) are served from the same origin, e.g. https://suviet360.onrender.com/uploads/...
const BASE_SERVER = API_URL.replace(/\/api\/?$/, '');

/**
 * Resolve a media URL (avatar, image, audio) to an absolute URI.
 * If the URL already starts with http/https, return as-is.
 * If relative (starts with /), prepend the server base URL.
 */
export function resolveMediaUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Data URI
  if (url.startsWith('data:')) return url;
  // Relative path — prepend server base
  if (url.startsWith('/')) return `${BASE_SERVER}${url}`;
  return `${BASE_SERVER}/${url}`;
}

