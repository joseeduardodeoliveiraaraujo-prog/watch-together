import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { PLAYER_URL } from '@/constants/config';
import { Colors } from '@/constants/theme';
import type { PlayerEvent, PlayerState } from '@/lib/youtube/bridge';
import { describePlayerError } from '@/lib/youtube/errors';
import { extractYouTubeVideoId } from '@/lib/youtube/videoId';
import { YouTubePlayer, type YouTubePlayerHandle } from '@/lib/youtube/YouTubePlayer';

/**
 * Tela TEMPORÁRIA da Etapa 2: valida o player do YouTube na WebView em aparelho real.
 * Mede latência de comandos e da ponte. Será removida quando o player entrar na sala.
 */

type PendingCommand =
  { kind: 'play' | 'pause'; at: number } | { kind: 'seek'; at: number; target: number };

type Metrics = {
  play?: number;
  pause?: number;
  seek?: number;
  /** Atraso página → app (Date.now() do app − `at` do status). */
  bridge?: number;
};

const SAMPLE_VIDEOS = [
  { label: 'Normal', url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' },
  { label: 'Clipe (anúncios)', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function describeEvent(event: PlayerEvent): string {
  switch (event.type) {
    case 'stateChange':
      return `estado → ${event.state} @ ${event.currentTime.toFixed(2)}s`;
    case 'error':
      return `ERRO ${event.code}: ${describePlayerError(event.code)}`;
    case 'apiLoadError':
      return 'ERRO: IFrame API não carregou';
    case 'log':
      return `log: ${event.message}`;
    default:
      return event.type;
  }
}

export function PlayerPocScreen() {
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const pendingRef = useRef<PendingCommand | null>(null);

  const [input, setInput] = useState(SAMPLE_VIDEOS[0].url);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayerState>('unstarted');
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [metrics, setMetrics] = useState<Metrics>({});
  const [log, setLog] = useState<string[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);

  const addLog = (line: string) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [`${stamp}  ${line}`, ...prev].slice(0, 40));
  };

  const resolvePending = (kind: PendingCommand['kind'], eventAt: number) => {
    const pending = pendingRef.current;
    if (!pending || pending.kind !== kind) return;
    pendingRef.current = null;
    setMetrics((m) => ({ ...m, [kind]: eventAt - pending.at }));
  };

  const handleEvent = (event: PlayerEvent) => {
    switch (event.type) {
      case 'ready':
        setReady(true);
        addLog('player pronto');
        return;
      case 'status': {
        setTime({ current: event.currentTime, duration: event.duration });
        setMetrics((m) => ({ ...m, bridge: Date.now() - event.at }));
        const pending = pendingRef.current;
        if (pending?.kind === 'seek' && Math.abs(event.currentTime - pending.target) < 1) {
          resolvePending('seek', event.at);
        }
        return;
      }
      case 'stateChange':
        setState(event.state);
        if (event.state === 'playing') resolvePending('play', event.at);
        if (event.state === 'paused') resolvePending('pause', event.at);
        break;
    }
    addLog(describeEvent(event));
  };

  const load = () => {
    const videoId = extractYouTubeVideoId(input);
    if (!videoId) {
      setInputError('Link do YouTube inválido.');
      return;
    }
    setInputError(null);
    playerRef.current?.send({ type: 'load', videoId, autoplay: true });
    pendingRef.current = { kind: 'play', at: Date.now() };
    addLog(`load ${videoId}`);
  };

  const play = () => {
    pendingRef.current = { kind: 'play', at: Date.now() };
    playerRef.current?.send({ type: 'play' });
  };

  const pause = () => {
    pendingRef.current = { kind: 'pause', at: Date.now() };
    playerRef.current?.send({ type: 'pause' });
  };

  const seekBy = (delta: number) => {
    const target = Math.max(0, time.current + delta);
    pendingRef.current = { kind: 'seek', at: Date.now(), target };
    playerRef.current?.send({ type: 'seek', seconds: target });
  };

  if (!PLAYER_URL) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-2">
          <Text className="text-lg font-bold text-text">Player não configurado</Text>
          <Text className="text-muted">
            Defina EXPO_PUBLIC_PLAYER_URL no arquivo .env.local (veja .env.example) e reinicie o
            servidor com `npx expo start -c`.
          </Text>
        </View>
      </Screen>
    );
  }

  const ms = (value?: number) => (value === undefined ? '—' : `${Math.round(value)} ms`);

  return (
    <Screen padded={false}>
      <YouTubePlayer ref={playerRef} playerUrl={PLAYER_URL} onEvent={handleEvent} />

      <ScrollView className="flex-1" contentContainerClassName="gap-3 p-4">
        <Text className="text-xs text-muted">
          {ready ? '● pronto' : '○ carregando player…'} · {state} · {formatTime(time.current)} /{' '}
          {formatTime(time.duration)}
        </Text>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Cole um link do YouTube"
          placeholderTextColor={Colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          className="h-12 rounded-xl border border-border bg-surface px-3 text-text"
        />
        {inputError && <Text className="text-danger">{inputError}</Text>}

        <View className="flex-row flex-wrap gap-2">
          {SAMPLE_VIDEOS.map((sample) => (
            <Pressable
              key={sample.url}
              onPress={() => setInput(sample.url)}
              className="rounded-full border border-border px-3 py-1"
            >
              <Text className="text-xs text-muted">{sample.label}</Text>
            </Pressable>
          ))}
        </View>

        <Button title="Carregar vídeo" onPress={load} disabled={!ready} />

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              title="−10s"
              variant="secondary"
              onPress={() => seekBy(-10)}
              disabled={!ready}
            />
          </View>
          <View className="flex-1">
            <Button
              title={state === 'playing' ? 'Pause' : 'Play'}
              onPress={state === 'playing' ? pause : play}
              disabled={!ready}
            />
          </View>
          <View className="flex-1">
            <Button title="+10s" variant="secondary" onPress={() => seekBy(10)} disabled={!ready} />
          </View>
        </View>

        <View className="rounded-xl border border-border bg-surface p-3">
          <Text className="mb-1 font-semibold text-text">Latências</Text>
          <Text className="text-muted">
            play: {ms(metrics.play)} · pause: {ms(metrics.pause)} · seek: {ms(metrics.seek)}
          </Text>
          <Text className="text-muted">ponte (página → app): {ms(metrics.bridge)}</Text>
        </View>

        <View className="rounded-xl border border-border bg-surface p-3">
          <Text className="mb-1 font-semibold text-text">Eventos</Text>
          {log.length === 0 ? (
            <Text className="text-muted">Nenhum evento ainda.</Text>
          ) : (
            log.map((line, index) => (
              <Text key={`${index}-${line}`} className="font-mono text-xs text-muted">
                {line}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
