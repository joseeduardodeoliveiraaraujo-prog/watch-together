import { useLocalSearchParams } from 'expo-router';

import { JoinRoomScreen } from '@/features/rooms/JoinRoomScreen';

// Destino do link de convite (watchtogether://join/CODIGO).
export default function JoinRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <JoinRoomScreen key={code} code={code} />;
}
