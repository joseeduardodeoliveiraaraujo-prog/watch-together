import '@/global.css';

import { useFonts } from 'expo-font';
import { SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DialogProvider } from '@/components/ui/Dialog';
import { FONT_FILES } from '@/constants/fonts';
import { NavigationTheme } from '@/constants/theme';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';

// A splash fica na tela até a sessão salva no aparelho ser lida e as fontes carregarem.
void SplashScreen.preventAutoHideAsync();

function SplashScreenController({ ready }: { ready: boolean }) {
  const { isLoading } = useSession();

  useEffect(() => {
    if (ready && !isLoading) SplashScreen.hide();
  }, [ready, isLoading]);

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
        <Stack.Screen name="room/[id]/index" />
        <Stack.Screen name="room/[id]/youtube" />
        <Stack.Screen name="join/[code]" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Falha ao carregar fonte não trava o app: segue com a fonte do sistema.
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const ready = fontsLoaded || !!fontError;

  return (
    <ThemeProvider value={NavigationTheme}>
      <StatusBar style="light" />
      <SessionProvider>
        <SplashScreenController ready={ready} />
        <DialogProvider>{ready ? <RootNavigator /> : null}</DialogProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
