import { useLocalSearchParams } from 'expo-router';

import { YouTubeBrowserScreen } from '@/features/browse/YouTubeBrowserScreen';

export default function YouTubeBrowserRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <YouTubeBrowserScreen roomId={id} />;
}
