import { DarkTheme, type Theme } from 'expo-router';

import colors from './colors.json';

/** Paleta única do app. A mesma fonte alimenta o Tailwind (tailwind.config.js). */
export const Colors = colors;

/** Tema do React Navigation (headers, fundo das telas) alinhado à paleta. */
export const NavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};
