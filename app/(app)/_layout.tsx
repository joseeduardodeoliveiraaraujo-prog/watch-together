import { Stack } from 'expo-router';

// Grupo protegido por sessão (ver Stack.Protected em app/_layout.tsx).
// As telas desenham o próprio cabeçalho (src/components/layout/AppHeader.tsx).
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Watch Together' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
