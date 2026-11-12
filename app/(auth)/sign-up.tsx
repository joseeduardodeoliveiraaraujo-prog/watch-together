import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';

// Placeholder — cadastro com Supabase Auth na Etapa 3.
export default function SignUpScreen() {
  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Text className="text-2xl font-bold text-text">Criar conta</Text>
        <Text className="text-muted">Cadastro com nome, e-mail e senha (Etapa 3).</Text>
        <Link href="/sign-in" className="text-primary">
          Já tem conta? Entrar
        </Link>
      </View>
    </Screen>
  );
}
