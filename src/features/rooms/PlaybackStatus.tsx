import { Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import type { LastAction } from '@/features/player/useRoomPlayback';

import type { RoomDetails } from './api';

/** Texto da última ação. `withName`: começa com o nome de quem fez ("Ana pausou"). */
const ACTION_TEXT: Record<
  LastAction['action'],
  { text: string; withName: boolean; icon: IconName } | null
> = {
  none: null,
  play: { text: 'deu play', withName: true, icon: 'play' },
  pause: { text: 'pausou', withName: true, icon: 'pause' },
  seek: { text: 'mudou a posição', withName: true, icon: 'fast-forward' },
  load: { text: 'colocou um vídeo', withName: true, icon: 'film' },
  play_item: { text: 'escolheu um vídeo da fila', withName: true, icon: 'list' },
  next: { text: 'Próximo vídeo da fila', withName: false, icon: 'skip-forward' },
  skip_error: { text: 'Um vídeo indisponível foi pulado', withName: false, icon: 'skip-forward' },
  stop: { text: 'A fila acabou', withName: false, icon: 'square' },
};

type PlaybackStatusProps = {
  lastAction: LastAction | null;
  members: RoomDetails['members'];
  userId: string | null;
  hasVideo: boolean;
  error: string | null;
};

/** Linha abaixo dos controles: última ação de alguém (ou erro do player). */
export function PlaybackStatus({
  lastAction,
  members,
  userId,
  hasVideo,
  error,
}: PlaybackStatusProps) {
  let icon: IconName = 'refresh-cw';
  let color: string = Colors.success;
  let text: string | null = null;

  const described = lastAction ? ACTION_TEXT[lastAction.action] : null;
  if (error) {
    icon = 'alert-circle';
    color = Colors.danger;
    text = error;
  } else if (described && lastAction) {
    icon = described.icon;
    if (described.withName) {
      const who =
        lastAction.userId === userId
          ? 'Você'
          : (members.find((m) => m.userId === lastAction.userId)?.displayName ?? 'Alguém');
      text = `${who} ${described.text}`;
    } else {
      text = described.text;
    }
  } else if (!hasVideo) {
    icon = 'info';
    color = Colors.muted;
    text = 'Nenhum vídeo tocando. Adicione um na aba Fila.';
  }

  return (
    <View
      className="min-h-[31px] flex-row items-center gap-2 bg-surface px-5 pb-3 pt-1"
      accessibilityLiveRegion="polite"
    >
      {text ? (
        <>
          <Icon name={icon} size={13} color={color} />
          <Text
            className={`flex-1 font-sans text-xs ${error ? 'text-danger' : 'text-muted'}`}
            numberOfLines={2}
          >
            {text}
          </Text>
        </>
      ) : null}
    </View>
  );
}
