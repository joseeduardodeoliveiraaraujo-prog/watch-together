import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import { extractYouTubeVideoId } from '@/lib/youtube/videoId';

import {
  addToPlaylist,
  moveInPlaylist,
  PLAYLIST_CAPACITY,
  playPlaylistItem,
  removeFromPlaylist,
  type PlaylistItem,
} from './api';
import { fetchVideoInfo, thumbnailUrl } from './oembed';

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

function AddVideoForm({
  roomId,
  full,
  onAdded,
}: {
  roomId: string;
  full: boolean;
  onAdded: () => void;
}) {
  const [link, setLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    if (full || adding) return;
    const videoId = extractYouTubeVideoId(link);
    if (!videoId) {
      setError('Link do YouTube inválido.');
      return;
    }
    setError(null);
    setAdding(true);
    try {
      const info = await fetchVideoInfo(videoId);
      if (info.status === 'blocked') {
        setError('O dono deste vídeo não permite que ele seja tocado fora do YouTube.');
        return;
      }
      if (info.status === 'not_found') {
        setError('Vídeo não encontrado (removido ou privado).');
        return;
      }
      await addToPlaylist(roomId, videoId, info.status === 'ok' ? info.title : null);
      setLink('');
      onAdded();
    } catch (e) {
      setError(describeRpcError(e));
    } finally {
      setAdding(false);
    }
  };

  const border = error ? 'border-danger' : focused ? 'border-primary' : 'border-border';

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <View
          className={`h-[46px] flex-1 flex-row items-center gap-2.5 rounded-[14px] border bg-surface px-3.5 ${border}`}
        >
          <Icon name="link" size={16} color={Colors.muted} />
          <TextInput
            value={link}
            onChangeText={setLink}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              full ? `Fila cheia (${PLAYLIST_CAPACITY} vídeos)` : 'Cole um link do YouTube'
            }
            placeholderTextColor={Colors.subtle}
            selectionColor={Colors.primary}
            accessibilityLabel="Adicionar à fila"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!adding && !full}
            className="h-full flex-1 font-sans text-sm text-text"
          />
        </View>
        <Pressable
          onPress={submit}
          disabled={full || adding || !link.trim()}
          accessibilityRole="button"
          accessibilityLabel="Adicionar"
          accessibilityState={{ disabled: full || adding || !link.trim(), busy: adding }}
          className={`h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-primary active:opacity-80 ${full || !link.trim() ? 'opacity-40' : ''}`}
        >
          {adding ? (
            <ActivityIndicator color={Colors['primary-foreground']} />
          ) : (
            <Icon name="plus" size={20} color={Colors['primary-foreground']} />
          )}
        </Pressable>
      </View>
      {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
    </View>
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
