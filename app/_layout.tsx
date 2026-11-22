import '@/global.css';

import { isRunningInExpoGo } from 'expo';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AppErrorScreen } from '@/components/layout/AppErrorScreen';
import { DialogProvider } from '@/components/ui/Dialog';
import { FONT_FILES } from '@/constants/fonts';
import { NavigationTheme } from '@/constants/theme';
import { SessionProvider, useSession } from '@/features/auth/SessionProvider';

/** Erro inesperado em qualquer tela: "Algo deu errado" em vez de tela branca. */
export const ErrorBoundary = AppErrorScreen;

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
        <Stack.Screen name="join/[code]" />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * Nos builds as fontes vêm embutidas pelo plugin do expo-font (app.json) e já estão prontas.
 * Só o Expo Go, que não embute fontes, precisa carregá-las ao abrir.
 */
const LOAD_FONTS_AT_RUNTIME = isRunningInExpoGo();

export default function RootLayout() {
  // Falha ao carregar fonte não trava o app: segue com a fonte do sistema.
  const [fontsLoaded, fontError] = useFonts(LOAD_FONTS_AT_RUNTIME ? FONT_FILES : {});
  const ready = fontsLoaded || !!fontError;

  return (
    <KeyboardProvider>
      <ThemeProvider value={NavigationTheme}>
        <StatusBar style="light" />
        <SessionProvider>
          <SplashScreenController ready={ready} />
          <DialogProvider>{ready ? <RootNavigator /> : null}</DialogProvider>
        </SessionProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
}
