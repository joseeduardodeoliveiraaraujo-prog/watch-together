import { useRouter, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Glow } from '@/components/ui/Decor';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

/** Código curto do erro para mostrar pequeno (tipo + começo da mensagem). */
export function errorCode(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.split('\n')[0].slice(0, 80);
    return message ? `${error.name}: ${message}` : error.name;
  }
  return 'erro desconhecido';
}

/**
 * "Algo deu errado": aparece no lugar da tela quando o app quebra (bug), em vez de tela branca.
 * Exportada como `ErrorBoundary` em app/_layout.tsx. Não usa os provedores do app (sessão,
 * diálogos), que podem ter sido justamente o que quebrou.
 */
export function AppErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const tryAgain = async () => {
    setBusy(true);
    await retry().finally(() => setBusy(false));
  };

  const goHome = async () => {
    setBusy(true);
    try {
      router.replace('/');
    } catch {
      // Se nem a navegação funciona, só tentar de novo já recomeça pela tela atual.
    }
    await retry().finally(() => setBusy(false));
  };

  return (
    <View
      className="flex-1 justify-center gap-6 bg-background px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Glow style={{ top: 120, left: -60, width: 510, height: 420 }} />
      <View className="items-center gap-6">
        <View className="h-[72px] w-[72px] items-center justify-center rounded-3xl bg-danger/15">
          <Icon name="alert-triangle" size={32} color={Colors.danger} />
        </View>
        <View className="items-center gap-2">
          <Text
            accessibilityRole="header"
            className="text-center font-extrabold text-[26px] text-text"
          >
            Algo deu errado
          </Text>
          <Text className="text-center font-sans text-[15px] leading-[22px] text-muted">
            O app encontrou um problema inesperado. Tente de novo; se continuar, volte ao início.
          </Text>
        </View>
      </View>
      <View className="gap-3">
        <Button title="Tentar de novo" icon="refresh-cw" onPress={tryAgain} disabled={busy} />
        <Button
          title="Voltar ao início"
          icon="home"
          variant="secondary"
          onPress={goHome}
          disabled={busy}
        />
      </View>
      <Text className="text-center font-mono text-[11px] text-subtle" selectable>
        código {errorCode(error)}
      </Text>
    </View>
  );
}
