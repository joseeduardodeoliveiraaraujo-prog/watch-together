import '@/global.css';

import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { NavigationTheme } from '@/constants/theme';

export default function RootLayout() {
  return (
    <ThemeProvider value={NavigationTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="room/[id]" />
        <Stack.Screen name="join/[code]" />
      </Stack>
    </ThemeProvider>
  );
}
