import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import type { PlayerAction, PlayerIssue } from '@/lib/youtube/errors';

import { usePlayerProgress, type ProgressStore } from './progressStore';

/** Carregando há mais que isso: mostra "Conexão lenta…". */
const SLOW_AFTER_MS = 8000;

const ACTIONS: Record<PlayerAction, { label: string; icon: IconName }> = {
  retry: { label: 'Tentar de novo', icon: 'refresh-cw' },
  skip: { label: 'Pular vídeo', icon: 'skip-forward' },
  openYouTube: { label: 'Abrir no YouTube', icon: 'external-link' },
};

type PlayerStatusOverlayProps = {
  progress: ProgressStore;
  /** Problema a mostrar (tem prioridade sobre "carregando"). */
  issue: PlayerIssue | null;
  /** A página do player ainda não avisou que está pronta. */
  ready: boolean;
  hasVideo: boolean;
  /** A sala está tocando (vídeo parado no início com a sala tocando = ainda carregando). */
  expectPlaying: boolean;
  size: 'portrait' | 'fullscreen';
  onAction: (action: PlayerAction) => void;
  /** Na tela cheia o aviso cobre os controles: mantém o botão de sair. */
  onExitFullscreen?: () => void;
};

/**
 * Estados sobre o próprio vídeo: carregando, conexão lenta e o aviso de erro com ações e código.
 * Desenho: prancha "Erros e carregamento" no design/watch-together.pen.
 */
export function PlayerStatusOverlay({
  progress,
  issue,
  ready,
  hasVideo,
  expectPlaying,
  size,
  onAction,
  onExitFullscreen,
}: PlayerStatusOverlayProps) {
  const { state } = usePlayerProgress(progress);
  const loading =
    !issue &&
    (!ready ||
      (hasVideo &&
        (state === 'buffering' || (expectPlaying && (state === 'unstarted' || state === 'cued')))));

  if (issue) {
    return <IssueCard issue={issue} size={size} onAction={onAction} onExit={onExitFullscreen} />;
  }
  return loading ? <Loading /> : null;
}

function Loading() {
  const [slow, setSlow] = useState(false);
  // Montado só enquanto carrega: o tempo conta a partir de quando começou.
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      pointerEvents="none"
      className={`absolute inset-0 items-center justify-center gap-3 ${slow ? 'bg-black/50' : 'bg-black/40'}`}
      accessibilityLiveRegion="polite"
      accessibilityLabel={slow ? 'Conexão lenta, ainda tentando' : 'Carregando vídeo'}
    >
      <ActivityIndicator size="large" color={Colors.primary} />
      {slow ? (
        <View className="flex-row items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5">
          <Icon name="wifi" size={13} color="#FFFFFFCC" />
          <Text className="font-sans text-xs text-white/80">Conexão lenta… ainda tentando</Text>
        </View>
      ) : null}
    </View>
  );
}

function IssueCard({
  issue,
  size,
  onAction,
  onExit,
}: {
  issue: PlayerIssue;
  size: 'portrait' | 'fullscreen';
  onAction: (action: PlayerAction) => void;
  onExit?: () => void;
}) {
  const big = size === 'fullscreen';
  const danger = issue.tone === 'danger';
  const icon: IconName = danger ? 'slash' : 'wifi-off';

  return (
    <View
      className={`absolute inset-0 items-center justify-center bg-black/80 ${big ? 'gap-2.5 px-16' : 'gap-2 px-7'}`}
      accessibilityLiveRegion="assertive"
    >
      <View
        className={`items-center justify-center rounded-full ${danger ? 'bg-danger/15' : 'bg-primary/15'} ${big ? 'h-12 w-12' : 'h-10 w-10'}`}
      >
        <Icon name={icon} size={big ? 24 : 20} color={danger ? Colors.danger : Colors.accent} />
      </View>
      <View className={`items-center gap-1 ${big ? 'max-w-[420px]' : ''}`}>
        <Text
          accessibilityRole="header"
          className={`text-center font-bold text-white ${big ? 'text-lg' : 'text-[15px]'}`}
        >
          {issue.title}
        </Text>
        <Text
          className={`text-center font-sans text-white/70 ${big ? 'text-sm leading-5' : 'text-xs leading-[17px]'}`}
        >
          {issue.message}
        </Text>
      </View>
      <View className={`flex-row gap-2 ${big ? 'pt-1.5' : ''}`}>
        {issue.actions.map((action, index) => (
          <Pressable
            key={action}
            onPress={() => onAction(action)}
            accessibilityRole="button"
            className={`flex-row items-center gap-1.5 rounded-full active:opacity-80 ${index === 0 ? 'bg-primary' : 'bg-white/15'} ${big ? 'h-10 px-[18px]' : 'h-[34px] px-3.5'}`}
          >
            <Icon name={ACTIONS[action].icon} size={big ? 16 : 14} color={Colors.white} />
            <Text className={`font-bold text-white ${big ? 'text-sm' : 'text-xs'}`}>
              {ACTIONS[action].label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text className={`font-mono text-white/40 ${big ? 'text-[11px]' : 'text-[10px]'}`}>
        código {issue.code}
      </Text>

      {onExit ? (
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Sair da tela cheia"
          hitSlop={8}
          className="absolute bottom-5 right-10 h-10 w-10 items-end justify-center active:opacity-70"
        >
          <Icon name="minimize" size={20} color={Colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
}
