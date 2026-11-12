import { Stack } from 'expo-router';

// Na Etapa 3 este grupo passa a exigir sessão (redireciona para /sign-in sem login).
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Watch Together' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
