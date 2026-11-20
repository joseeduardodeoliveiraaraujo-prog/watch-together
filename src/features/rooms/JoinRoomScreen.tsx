import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Glow } from '@/components/ui/Decor';
import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { describeRpcError } from '@/lib/supabase/rpcErrors';

import { joinRoom } from './api';
import { normalizeRoomCode, validateRoomCode } from './roomCode';

/** Destino do link de convite: entra na sala e abre a tela dela. */
export function JoinRoomScreen({ code: rawCode }: { code: string }) {
  const router = useRouter();
  const code = normalizeRoomCode(rawCode);
  const invalid = validateRoomCode(code);
  const join = useAsyncData(invalid ? null : `join:${code}`, () => joinRoom(code));
  const roomId = join.data?.id;

  useEffect(() => {
    if (roomId) router.replace(`/room/${roomId}`);
  }, [roomId, router]);

  const error = invalid ?? (join.error ? describeRpcError(join.error) : null);

  return (
    <Screen className="overflow-hidden px-7">
      <Glow style={{ top: 180, left: -100, width: 590, height: 460 }} strength="40" />
      <View className="flex-1 items-center justify-center gap-7 pb-12">
        {error ? (
          <>
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-danger/10">
              <Icon name="alert-circle" size={30} color={Colors.danger} />
            </View>
            <View className="items-center gap-2.5">
              <Text className="text-center font-extrabold text-[22px] text-text">
                Não foi possível entrar na sala
              </Text>
              <Text className="text-center font-sans text-sm leading-5 text-muted">{error}</Text>
            </View>
            <View className="w-full gap-3">
              {join.error ? <Button title="Tentar de novo" onPress={join.reload} /> : null}
              <Button
                title="Voltar ao início"
                variant="secondary"
                onPress={() => router.replace('/')}
              />
            </View>
          </>
        ) : (
          <>
            <View className="h-[72px] w-[72px] items-center justify-center">
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
            <View className="items-center gap-2.5">
              <Text className="font-extrabold text-[22px] text-text">Entrando na sala</Text>
              <View
                className="flex-row gap-1.5"
                accessible
                accessibilityLabel={`Código ${code.split('').join(' ')}`}
              >
                {code.split('').map((char, index) => (
                  <View
                    key={index}
                    className="h-[50px] w-10 items-center justify-center rounded-[10px] border border-border bg-surface"
                  >
                    <Text className="font-mono-bold text-[22px] text-text">{char}</Text>
                  </View>
                ))}
              </View>
              <Text className="text-center font-sans text-sm text-muted">
                Você foi convidado. Já já o vídeo começa.
              </Text>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
