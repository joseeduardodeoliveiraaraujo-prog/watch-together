import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
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
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const current = items?.find((item) => item.id === currentItemId) ?? null;
  const upcoming = items?.filter((item) => item.id !== currentItemId) ?? [];

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

  return (
    <View className="gap-3">
      <AddVideoForm
        roomId={roomId}
        full={(items?.length ?? 0) >= PLAYLIST_CAPACITY}
        onAdded={onChanged}
      />

      {error ? <Text className="text-danger">{error}</Text> : null}

      {isFirstLoad ? (
        <ActivityIndicator color={Colors.primary} />
      ) : loadFailed && !items ? (
        <View className="gap-2">
          <Text className="text-danger">Não foi possível carregar a fila.</Text>
          <Button title="Tentar de novo" variant="secondary" onPress={onChanged} />
        </View>
      ) : (
        <>
          {current ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-muted">Tocando agora</Text>
              <ItemRow item={current} names={names} highlight>
                <IconButton
                  label="Remover"
                  icon="✕"
                  onPress={() => void run(current.id, () => removeFromPlaylist(roomId, current.id))}
                  disabled={busyItem !== null}
                />
              </ItemRow>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="text-sm font-semibold text-muted">A seguir ({upcoming.length})</Text>
            {upcoming.length === 0 ? (
              <Text className="text-muted">
                {current ? 'Nada na fila depois deste vídeo.' : 'A fila está vazia.'}
              </Text>
            ) : (
              upcoming.map((item, index) => (
                <ItemRow key={item.id} item={item} names={names}>
                  <IconButton
                    label="Tocar agora"
                    icon="▶"
                    onPress={() => void run(item.id, () => playPlaylistItem(roomId, item.id))}
                    disabled={busyItem !== null}
                  />
                  <IconButton
                    label="Subir"
                    icon="↑"
                    onPress={() => void run(item.id, () => moveInPlaylist(roomId, item.id, -1))}
                    disabled={busyItem !== null || index === 0}
                  />
                  <IconButton
                    label="Descer"
                    icon="↓"
                    onPress={() => void run(item.id, () => moveInPlaylist(roomId, item.id, 1))}
                    disabled={busyItem !== null || index === upcoming.length - 1}
                  />
                  <IconButton
                    label="Remover"
                    icon="✕"
                    onPress={() => void run(item.id, () => removeFromPlaylist(roomId, item.id))}
                    disabled={busyItem !== null}
                  />
                </ItemRow>
              ))
            )}
          </View>
        </>
      )}
    </View>
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

  const submit = async () => {
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

  return (
    <View className="gap-2 rounded-xl border border-border bg-surface p-3">
      <TextField
        label="Adicionar à fila"
        value={link}
        onChangeText={setLink}
        error={error}
        placeholder="Cole um link do YouTube"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={submit}
        editable={!adding}
      />
      <Button
        title={full ? `Fila cheia (${PLAYLIST_CAPACITY})` : 'Adicionar'}
        variant="secondary"
        onPress={submit}
        loading={adding}
        disabled={full}
      />
    </View>
  );
}

type ItemRowProps = {
  item: PlaylistItem;
  names: ReadonlyMap<string, string>;
  highlight?: boolean;
  children: ReactNode;
};

function ItemRow({ item, names, highlight = false, children }: ItemRowProps) {
  const addedBy = item.addedBy ? names.get(item.addedBy) : undefined;
  return (
    <View
      className={`gap-2 rounded-xl border p-2 ${highlight ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
    >
      <View className="flex-row gap-3">
        <Image
          source={{ uri: thumbnailUrl(item.videoId) }}
          style={{ width: 96, height: 54, borderRadius: 6 }}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View className="flex-1 justify-center">
          <Text className="text-text" numberOfLines={2}>
            {item.title ?? `Vídeo ${item.videoId}`}
          </Text>
          {addedBy ? <Text className="text-xs text-muted">por {addedBy}</Text> : null}
        </View>
      </View>
      <View className="flex-row justify-end gap-2">{children}</View>
    </View>
  );
}

function IconButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      className={`h-9 w-11 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-70 ${disabled ? 'opacity-30' : ''}`}
    >
      <Text className="text-base text-text">{icon}</Text>
    </Pressable>
  );
}
