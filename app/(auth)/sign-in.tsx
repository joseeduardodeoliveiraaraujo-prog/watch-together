import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';

// Placeholder — formulário e integração com Supabase Auth na Etapa 3.
export default function SignInScreen() {
  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Text className="text-2xl font-bold text-text">Entrar</Text>
        <Text className="text-muted">Login com e-mail e senha (Etapa 3).</Text>
        <Link href="/sign-up" className="text-primary">
          Ainda não tem conta? Cadastre-se
        </Link>
      </View>
    </Screen>
  );
}
