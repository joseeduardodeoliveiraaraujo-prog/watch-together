import { useLocalSearchParams } from 'expo-router';

import { RoomScreen } from '@/features/rooms/RoomScreen';

export default function RoomRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // `key`: trocar de sala remonta a tela (zera presença e dados da sala anterior).
  return <RoomScreen key={id} roomId={id} />;
}
