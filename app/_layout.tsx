import '@/global.css';

import { SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NavigationTheme } from '@/constants/theme';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';

// A splash fica na tela até a sessão salva no aparelho ser lida.
void SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hide();
  }, [isLoading]);

  return null;
}

function RootNavigator() {
  const { session } = useSession();
  const signedIn = !!session;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Telas que exigem conta. `redirectTo` explícito: o grupo (auth) não tem index, e o
          destino padrão do Expo Router ("/(auth)") cairia em "page could not be found". */}
      <Stack.Protected guard={signedIn} redirectTo="/sign-in">
        <Stack.Screen name="(app)" />
        <Stack.Screen name="room/[id]" />
        <Stack.Screen name="join/[code]" />
        <Stack.Screen name="poc/player" options={{ headerShown: true, title: 'POC Player' }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={NavigationTheme}>
      <StatusBar style="light" />
      <SessionProvider>
        <SplashScreenController />
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}
