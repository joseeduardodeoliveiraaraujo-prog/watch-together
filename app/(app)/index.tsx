import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';

// Home: criar sala / entrar por código. Lógica real na Etapa 4.
export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 justify-center gap-3">
        <Text className="mb-2 text-center text-muted">
          Assista vídeos do YouTube junto com até 4 pessoas.
        </Text>
        <Button title="Criar sala" onPress={() => router.push('/room/demo')} />
        <Button
          title="Entrar com código"
          variant="secondary"
          onPress={() => router.push('/join/DEMO1234')}
        />
        <Button title="Perfil" variant="secondary" onPress={() => router.push('/profile')} />
        <Button title="Tela de login" variant="secondary" onPress={() => router.push('/sign-in')} />
        {__DEV__ && (
          <Button
            title="POC: player do YouTube"
            variant="secondary"
            onPress={() => router.push('/poc/player')}
          />
        )}
      </View>
    </Screen>
  );
}
