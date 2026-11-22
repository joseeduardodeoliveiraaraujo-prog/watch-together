import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import { describeRpcError } from '@/lib/supabase/rpcErrors';
import { extractYouTubeVideoId } from '@/lib/youtube/videoId';

import { addToPlaylist, PLAYLIST_CAPACITY } from './api';
import { fetchVideoInfo } from './oembed';

/** Campo para colar um link do YouTube e pôr o vídeo na fila. */
export function AddVideoForm({
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
