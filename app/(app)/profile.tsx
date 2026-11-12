import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';

// Placeholder — nome, avatar e logout na Etapa 3.
export default function ProfileScreen() {
  return (
    <Screen>
      <View className="flex-1 justify-center gap-2">
        <Text className="text-xl font-bold text-text">Perfil</Text>
        <Text className="text-muted">Nome, avatar e logout (Etapa 3).</Text>
      </View>
    </Screen>
  );
}
