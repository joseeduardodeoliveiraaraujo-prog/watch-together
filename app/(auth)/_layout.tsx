import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="sign-in" options={{ title: 'Entrar' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Criar conta' }} />
    </Stack>
  );
}
