import { Stack } from 'expo-router';

// Grupo protegido por sessão (ver Stack.Protected em app/_layout.tsx).
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Watch Together' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
