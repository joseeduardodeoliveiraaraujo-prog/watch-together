import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';

// Composição da sala: player (Etapa 2/5), participantes (4), playlist (6) e chat (7).
export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <Screen padded={false}>
      <View className="aspect-video w-full items-center justify-center bg-surface">
        <Text className="text-muted">Player do YouTube (Etapa 2)</Text>
      </View>
      <View className="flex-1 gap-3 p-4">
        <Text className="text-lg font-bold text-text">Sala {id}</Text>
        <Text className="text-muted">Participantes, playlist e chat entram aqui.</Text>
        <Button title="Sair da sala" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
