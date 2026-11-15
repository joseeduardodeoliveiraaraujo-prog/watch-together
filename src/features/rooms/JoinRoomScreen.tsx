import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';

import { joinRoom } from './api';
import { normalizeRoomCode, validateRoomCode } from './roomCode';
import { describeRoomError } from './roomErrors';

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

  const error = invalid ?? (join.error ? describeRoomError(join.error) : null);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-4">
        {error ? (
          <>
            <Text className="text-center text-lg font-bold text-text">
              Não foi possível entrar na sala
            </Text>
            <Text className="text-center text-muted">{error}</Text>
            <View className="w-full gap-2">
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
            <ActivityIndicator color={Colors.primary} />
            <Text className="text-muted">Entrando na sala {code}…</Text>
          </>
        )}
      </View>
    </Screen>
  );
}
