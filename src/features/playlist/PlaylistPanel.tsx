import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import { describeRpcError } from '@/lib/supabase/rpcErrors';

import {
  moveInPlaylist,
  PLAYLIST_CAPACITY,
  playPlaylistItem,
  removeFromPlaylist,
  type PlaylistItem,
} from './api';
import { AddVideoForm } from './AddVideoForm';
import { thumbnailUrl } from './oembed';

type PlaylistPanelProps = {
  roomId: string;
  items: PlaylistItem[] | null;
  isFirstLoad: boolean;
  loadFailed: boolean;
  currentItemId: string | null;
  /** userId → apelido, para "adicionado por". */
  names: ReadonlyMap<string, string>;
  /** Recarrega a fila (a mudança também chega pelo canal; isto deixa a resposta imediata). */
  onChanged: () => void;
  /** Abre o navegador do YouTube (camada da sala, com o vídeo num miniplayer). */
  onBrowse: () => void;
};

/** Fila compartilhada: todos adicionam, removem, reordenam e escolhem o que tocar. */
export function PlaylistPanel({
  roomId,
  items,
  isFirstLoad,
  loadFailed,
  currentItemId,
  names,
  onChanged,
  onBrowse,
}: PlaylistPanelProps) {
  const dialog = useDialog();
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const current = items?.find((item) => item.id === currentItemId) ?? null;
  const upcoming = items?.filter((item) => item.id !== currentItemId) ?? [];
  const busy = busyItem !== null;

  const run = async (itemId: string, action: () => Promise<void>) => {
    setBusyItem(itemId);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(describeRpcError(e));
    } finally {
      setBusyItem(null);
    }
  };

  const remove = (item: PlaylistItem) =>
    void run(item.id, () => removeFromPlaylist(roomId, item.id));

  const openMenu = (item: PlaylistItem) => {
    dialog.sheet({
      title: itemTitle(item),
      subtitle: item.addedBy ? `Adicionado por ${names.get(item.addedBy) ?? 'alguém'}` : undefined,
      actions: [
        {
          label: 'Tocar agora',
          icon: 'play',
          onPress: () => void run(item.id, () => playPlaylistItem(roomId, item.id)),
        },
        {
          label: 'Remover da fila',
          icon: 'trash-2',
          destructive: true,
          onPress: () => remove(item),
        },
      ],
    });
  };

  const confirmRemoveCurrent = (item: PlaylistItem) => {
    dialog.confirm({
      title: 'Remover o vídeo que está tocando?',
      message: itemTitle(item),
      confirmLabel: 'Remover',
      destructive: true,
      onConfirm: () => remove(item),
    });
  };

  return (
    <View className="gap-4">
      <AddVideoForm
        roomId={roomId}
        full={(items?.length ?? 0) >= PLAYLIST_CAPACITY}
        onAdded={onChanged}
      />
      <Button
        title="Buscar no YouTube"
        icon="youtube"
        variant="secondary"
        disabled={(items?.length ?? 0) >= PLAYLIST_CAPACITY}
        onPress={onBrowse}
      />

      {error ? <Text className="font-sans text-danger">{error}</Text> : null}

      {isFirstLoad ? (
        <ActivityIndicator color={Colors.primary} />
      ) : loadFailed && !items ? (
        <View className="gap-2">
          <Text className="font-sans text-danger">Não foi possível carregar a fila.</Text>
          <Button title="Tentar de novo" variant="secondary" onPress={onChanged} />
        </View>
      ) : (
        <>
          {current ? (
            <View className="flex-row items-center gap-3 rounded-2xl border border-primary/30 bg-primary/15 p-2.5">
              <Thumb videoId={current.videoId} />
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-[5px]">
                  <Icon name="bar-chart-2" size={12} color={Colors.accent} />
                  <Text className="font-bold text-[11px] text-accent">Tocando agora</Text>
                </View>
                <ItemText item={current} names={names} />
              </View>
              <SmallButton
                label="Remover o vídeo atual"
                icon="x"
                onPress={() => confirmRemoveCurrent(current)}
                disabled={busy}
              />
            </View>
          ) : null}

          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="font-bold text-[13px] text-muted">A seguir</Text>
              <Text className="font-sans text-[13px] text-subtle">
                {upcoming.length === 1 ? '1 vídeo' : `${upcoming.length} vídeos`}
              </Text>
            </View>
            {upcoming.length === 0 ? (
              <View className="items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-6">
                <Icon name="youtube" size={22} color={Colors.muted} />
                <Text className="text-center font-sans text-sm text-muted">
                  {current
                    ? 'Nada na fila depois deste vídeo.'
                    : 'A fila está vazia. Cole um link do YouTube acima.'}
                </Text>
              </View>
            ) : (
              upcoming.map((item, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center gap-3 py-0.5 ${busyItem === item.id ? 'opacity-50' : ''}`}
                >
                  <Thumb videoId={item.videoId} />
                  <View className="flex-1 gap-1">
                    <ItemText item={item} names={names} />
                  </View>
                  <View className="items-center gap-0.5">
                    <SmallButton
                      label="Subir na fila"
                      icon="chevron-up"
                      compact
                      onPress={() => void run(item.id, () => moveInPlaylist(roomId, item.id, -1))}
                      disabled={busy || index === 0}
                    />
                    <SmallButton
                      label="Descer na fila"
                      icon="chevron-down"
                      compact
                      onPress={() => void run(item.id, () => moveInPlaylist(roomId, item.id, 1))}
                      disabled={busy || index === upcoming.length - 1}
                    />
                  </View>
                  <SmallButton
                    label={`Opções de ${itemTitle(item)}`}
                    icon="more-vertical"
                    onPress={() => openMenu(item)}
                    disabled={busy}
                  />
                </View>
              ))
            )}
          </View>
        </>
      )}
    </View>
  );
}

function itemTitle(item: PlaylistItem): string {
  return item.title ?? `Vídeo ${item.videoId}`;
}

function Thumb({ videoId }: { videoId: string }) {
  return (
    <Image
      source={{ uri: thumbnailUrl(videoId) }}
      style={{ width: 96, height: 54, borderRadius: 10, backgroundColor: Colors['surface-raised'] }}
      contentFit="cover"
      accessibilityIgnoresInvertColors
    />
  );
}

function ItemText({ item, names }: { item: PlaylistItem; names: ReadonlyMap<string, string> }) {
  const addedBy = item.addedBy ? names.get(item.addedBy) : undefined;
  return (
    <>
      <Text className="font-semibold text-sm leading-[18px] text-text" numberOfLines={2}>
        {itemTitle(item)}
      </Text>
      {addedBy ? <Text className="font-sans text-xs text-muted">por {addedBy}</Text> : null}
    </>
  );
}

function SmallButton({
  label,
  icon,
  onPress,
  disabled,
  compact = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={compact ? 2 : 6}
      className={`items-center justify-center rounded-full active:bg-surface-raised ${compact ? 'h-6 w-7' : 'h-8 w-8'} ${disabled ? 'opacity-30' : ''}`}
    >
      <Icon name={icon} size={compact ? 16 : 18} color={Colors.muted} />
    </Pressable>
  );
}
