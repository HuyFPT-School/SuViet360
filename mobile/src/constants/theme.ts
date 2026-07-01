/**
 * SuViet360 Theme — matching client web design
 * Colors & fonts from client globals.css
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Backgrounds
    background: 'transparent',
    backgroundDark: '#1f0a0d',
    backgroundCard: 'rgba(30, 18, 5, 0.95)',
    backgroundCardAlt: 'rgba(18, 10, 2, 0.98)',
    panel: '#fdf6e8',
    panelBorder: '#c7ab73',

    // Text
    text: '#2a2016',
    textMain: '#f0ddb7',
    textMuted: '#a08040',
    textDim: '#6b4f14',
    textInk: '#3a2b1b',
    textAuth: '#3a2312',

    // Gold accents
    gold: '#c9a15a',
    goldDark: '#8c6a34',
    goldMid: '#c4a052',
    goldDeeper: '#6b4f14',
    goldLight: '#f0ddb7',
    goldMuted: '#a37636',

    // Maroon
    maroon: '#4a1f24',
    maroonDark: '#2a0e13',

    // Auth
    authInputBg: 'rgba(255, 250, 238, 0.92)',
    authButtonGold: '#f1c97a',
    authButtonBrown: '#b58036',
    authLabel: '#4f361c',
    authBorder: '#c8a86a',
    authFrame: 'rgba(87, 60, 30, 0.8)',

    // Chat
    chatBg: '#0d0805',
    chatBgSecondary: '#1a0f0a',
    chatBgTertiary: '#241610',
    chatGold: '#c9a15a',
    chatGoldLight: '#f0ddb7',
    chatGoldDark: '#8b6914',
    chatGlass: 'rgba(26, 15, 10, 0.75)',
    chatGlassBorder: 'rgba(201, 161, 90, 0.15)',

    // Status
    error: '#b0302a',
    errorBg: 'rgba(255, 228, 228, 0.7)',
    success: '#2b6a2b',
    successBg: 'rgba(214, 245, 214, 0.7)',
    online: '#34d399',

    // Misc
    parchment: '#f4e7c9',
    ink: '#3a2b1b',
    divider: 'rgba(87, 60, 30, 0.5)',
  },
  dark: {
    background: '#0d0805',
    backgroundDark: '#1f0a0d',
    backgroundCard: 'rgba(30, 18, 5, 0.95)',
    backgroundCardAlt: 'rgba(18, 10, 2, 0.98)',
    panel: '#1a0f0a',
    panelBorder: '#8c6a34',

    text: '#f0ddb7',
    textMain: '#f0ddb7',
    textMuted: '#a08040',
    textDim: '#6b4f14',
    textInk: '#f0ddb7',
    textAuth: '#f0ddb7',

    gold: '#c9a15a',
    goldDark: '#8c6a34',
    goldMid: '#c4a052',
    goldDeeper: '#6b4f14',
    goldLight: '#f0ddb7',
    goldMuted: '#a37636',

    maroon: '#4a1f24',
    maroonDark: '#2a0e13',

    authInputBg: 'rgba(42, 30, 20, 0.92)',
    authButtonGold: '#b58036',
    authButtonBrown: '#8c6a34',
    authLabel: '#f0ddb7',
    authBorder: '#8c6a34',
    authFrame: 'rgba(200, 168, 106, 0.5)',

    chatBg: '#0d0805',
    chatBgSecondary: '#1a0f0a',
    chatBgTertiary: '#241610',
    chatGold: '#c9a15a',
    chatGoldLight: '#f0ddb7',
    chatGoldDark: '#8b6914',
    chatGlass: 'rgba(26, 15, 10, 0.75)',
    chatGlassBorder: 'rgba(201, 161, 90, 0.15)',

    error: '#e06060',
    errorBg: 'rgba(80, 30, 30, 0.7)',
    success: '#60c060',
    successBg: 'rgba(40, 80, 40, 0.7)',
    online: '#34d399',

    parchment: '#4a3510',
    ink: '#f0ddb7',
    divider: 'rgba(200, 168, 106, 0.3)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Fonts = Platform.select({
  ios: {
    heading: 'Cinzel',
    display: 'Playfair Display',
    body: 'Cormorant Garamond',
    mono: 'ui-monospace',
  },
  android: {
    heading: 'serif',
    display: 'serif',
    body: 'serif',
    mono: 'monospace',
  },
  default: {
    heading: 'Cinzel',
    display: 'Playfair Display',
    body: 'Cormorant Garamond',
    mono: 'monospace',
  },
}) as Record<string, string>;

export const FontSizes = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 26,
  hero: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  gold: {
    shadowColor: '#c9a15a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5002';
