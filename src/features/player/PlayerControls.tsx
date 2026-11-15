import { useState } from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { formatTime } from './format';

type PlayerControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  disabled: boolean;
  fullscreen: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeekBy: (delta: number) => void;
  onSeekTo: (seconds: number) => void;
  onToggleFullscreen: () => void;
};

/** Controles próprios do app (o player do YouTube roda com controls=0). Valem para toda a sala. */
export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  disabled,
  fullscreen,
  onPlay,
  onPause,
  onSeekBy,
  onSeekTo,
  onToggleFullscreen,
}: PlayerControlsProps) {
  const [barWidth, setBarWidth] = useState(0);
  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const seekFromTouch = (event: GestureResponderEvent) => {
    if (disabled || barWidth <= 0 || duration <= 0) return;
    onSeekTo((event.nativeEvent.locationX / barWidth) * duration);
  };

  return (
    <View className={`gap-2 px-4 py-2 ${fullscreen ? 'bg-black/60' : 'bg-surface'}`}>
      <Pressable
        onPress={seekFromTouch}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        disabled={disabled}
        accessibilityRole="adjustable"
        accessibilityLabel="Posição do vídeo"
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(currentTime) }}
        className="h-6 justify-center"
      >
        <View className="h-1.5 overflow-hidden rounded-full bg-border">
          <View className="h-full bg-primary" style={{ width: `${ratio * 100}%` }} />
        </View>
      </Pressable>

      <View className="flex-row items-center gap-2">
        <Text className="w-24 font-mono text-xs text-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
        <View className="flex-1 flex-row items-center justify-center gap-2">
          <ControlButton label="−10s" onPress={() => onSeekBy(-10)} disabled={disabled} />
          <ControlButton
            label={isPlaying ? 'Pausar' : 'Play'}
            onPress={isPlaying ? onPause : onPlay}
            disabled={disabled}
            primary
          />
          <ControlButton label="+10s" onPress={() => onSeekBy(10)} disabled={disabled} />
        </View>
        <View className="w-24 items-end">
          <ControlButton
            label={fullscreen ? 'Sair' : 'Tela cheia'}
            onPress={onToggleFullscreen}
            disabled={false}
          />
        </View>
      </View>
    </View>
  );
}

type ControlButtonProps = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  primary?: boolean;
};

function ControlButton({ label, onPress, disabled, primary = false }: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={6}
      className={`h-10 min-w-14 items-center justify-center rounded-lg px-3 active:opacity-70 ${primary ? 'bg-primary' : 'border border-border bg-surface-raised'} ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className="text-sm font-semibold text-primary-foreground">{label}</Text>
    </Pressable>
  );
}
