import { Pressable, Text, View } from 'react-native';

import type { useRoomChat } from '@/features/chat/useRoomChat';

export type Tab = 'chat' | 'queue' | 'room';

/** Mensagens de outras pessoas que chegaram depois da última vista. */
export function countUnread(
  entries: ReturnType<typeof useRoomChat>['entries'],
  seenId: string | null,
  userId: string | null,
): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.id === seenId) break;
    if (entry.kind === 'user' && entry.userId !== userId) count++;
  }
  return count;
}

type TabBarProps = {
  tab: Tab;
  onChange: (tab: Tab) => void;
  unread: number;
  queueCount: number;
  online: number;
};

/** Abas da sala: chat (com não lidas), fila e sala. */
export function RoomTabBar({ tab, onChange, unread, queueCount, online }: TabBarProps) {
  const tabs: { id: Tab; label: string; a11y: string; badge?: number }[] = [
    { id: 'chat', label: 'Chat', a11y: 'Chat', badge: unread },
    { id: 'queue', label: `Fila · ${queueCount}`, a11y: `Fila, ${queueCount} vídeos` },
    { id: 'room', label: `Sala · ${online} on`, a11y: `Sala, ${online} online` },
  ];
  return (
    <View className="h-12 flex-row border-b border-border bg-surface" accessibilityRole="tablist">
      {tabs.map((t) => {
        const active = t.id === tab;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.badge ? `${t.a11y}, ${t.badge} novas` : t.a11y}
            className={`flex-1 flex-row items-center justify-center gap-1.5 ${active ? 'border-b-2 border-primary' : ''}`}
          >
            <Text
              className={`text-sm ${active ? 'font-bold text-text' : 'font-medium text-muted'}`}
            >
              {t.label}
            </Text>
            {t.badge ? (
              <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5">
                <Text className="font-extrabold text-[11px] text-primary-foreground">
                  {t.badge > 99 ? '99+' : t.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
