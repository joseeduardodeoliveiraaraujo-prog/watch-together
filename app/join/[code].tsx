import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';

// Destino do link de convite (watchtogether://join/CODIGO).
// Na Etapa 4 chama a RPC join_room e redireciona para /room/[id].
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-lg font-bold text-text">Entrando na sala</Text>
        <Text className="text-muted">Código: {code}</Text>
      </View>
    </Screen>
  );
}
