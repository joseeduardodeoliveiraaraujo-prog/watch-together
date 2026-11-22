import { Text } from 'react-native';

import { formatTime } from './format';
import { usePlayerProgress, type ProgressStore } from './progressStore';
import { SeekBar } from './SeekBar';

type ProgressSeekBarProps = {
  store: ProgressStore;
  disabled: boolean;
  variant: 'overlay' | 'surface';
  onSeekTo: (seconds: number) => void;
  onScrub?: (seconds: number | null) => void;
};

/** Barra de progresso ligada à posição do player (só ela redesenha quando o vídeo anda). */
export function ProgressSeekBar({ store, ...rest }: ProgressSeekBarProps) {
  const { currentTime, duration } = usePlayerProgress(store);
  return <SeekBar currentTime={currentTime} duration={duration} {...rest} />;
}

type ProgressTimeProps = {
  store: ProgressStore;
  className: string;
  /** Mostra este tempo no lugar da posição atual (prévia durante o arraste). */
  override?: number | null;
};

/** "1:23 / 4:56" ligado à posição do player. */
export function ProgressTime({ store, className, override }: ProgressTimeProps) {
  const { currentTime, duration } = usePlayerProgress(store);
  return (
    <Text className={className}>
      {formatTime(override ?? currentTime)} / {formatTime(duration)}
    </Text>
  );
}
