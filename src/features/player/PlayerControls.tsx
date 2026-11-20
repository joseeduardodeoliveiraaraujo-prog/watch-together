import { useState } from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

import { formatTime } from './format';

type PlayerControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  disabled: boolean;
  fullscreen: boolean;
  /** Título do vídeo atual (aparece na tela cheia). */
  title: string | null;
  onPlay: () => void;
  onPause: () => void;
  onSeekBy: (delta: number) => void;
  onSeekTo: (seconds: number) => void;
  onToggleFullscreen: () => void;
};

const THUMB = 14;

/** Controles próprios do app (o player do YouTube roda com controls=0). Valem para toda a sala. */
export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  disabled,
  fullscreen,
  title,
  onPlay,
  onPause,
  onSeekBy,
  onSeekTo,
  onToggleFullscreen,
}: PlayerControlsProps) {
  const [barWidth, setBarWidth] = useState(0);
  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  // Na tela cheia tudo fica branco sobre o vídeo.
  const iconColor = fullscreen ? Colors.white : Colors.text;

  const seekFromTouch = (event: GestureResponderEvent) => {
    if (disabled || barWidth <= 0 || duration <= 0) return;
    onSeekTo((event.nativeEvent.locationX / barWidth) * duration);
  };

  return (
    <View className={fullscreen ? 'gap-3 px-10 pb-5' : 'gap-2.5 bg-surface px-5 pb-1.5 pt-3.5'}>
      <Pressable
        onPress={seekFromTouch}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        disabled={disabled}
        accessibilityRole="adjustable"
        accessibilityLabel="Posição do vídeo"
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(currentTime) }}
        hitSlop={{ top: 10, bottom: 10 }}
        className="h-3.5 justify-center"
      >
        <View
          className={`h-1 overflow-hidden rounded-full ${fullscreen ? 'bg-white/25' : 'bg-border'}`}
        >
          <View className="h-full rounded-full bg-primary" style={{ width: `${ratio * 100}%` }} />
        </View>
        {disabled ? null : (
          <View
            pointerEvents="none"
            className="absolute rounded-full bg-white"
            style={{
              width: THUMB,
              height: THUMB,
              left: Math.max(0, ratio * barWidth - THUMB / 2),
              boxShadow: '0px 2px 6px #00000080',
            }}
          />
        )}
      </Pressable>

      <View className="flex-row items-center">
        <View className="flex-1">
          <Text
            className={`font-mono ${fullscreen ? 'text-[13px] text-white/80' : 'text-xs text-muted'}`}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>

        <View className={`flex-row items-center ${fullscreen ? 'gap-[18px]' : 'gap-3.5'}`}>
          <RoundButton
            label="Voltar 10 segundos"
            icon="rotate-ccw"
            color={iconColor}
            onPress={() => onSeekBy(-10)}
            disabled={disabled}
          />
          <Pressable
            onPress={isPlaying ? onPause : onPlay}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pausar' : 'Play'}
            accessibilityState={{ disabled }}
            className={`items-center justify-center rounded-full bg-white active:opacity-80 ${fullscreen ? 'h-12 w-12' : 'h-[52px] w-[52px]'} ${disabled ? 'opacity-40' : ''}`}
          >
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={fullscreen ? 20 : 22}
              color={Colors.background}
            />
          </Pressable>
          <RoundButton
            label="Avançar 10 segundos"
            icon="rotate-cw"
            color={iconColor}
            onPress={() => onSeekBy(10)}
            disabled={disabled}
          />
        </View>

        <View className="flex-1 flex-row items-center justify-end gap-4">
          {fullscreen && title ? (
            <Text
              className="flex-1 text-right font-semibold text-[13px] text-white/80"
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
          <Pressable
            onPress={onToggleFullscreen}
            accessibilityRole="button"
            accessibilityLabel={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            hitSlop={8}
            className="h-10 w-10 items-end justify-center active:opacity-70"
          >
            <Icon
              name={fullscreen ? 'minimize' : 'maximize'}
              size={20}
              color={fullscreen ? Colors.white : Colors.muted}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type RoundButtonProps = {
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
  disabled: boolean;
};

function RoundButton({ label, icon, color, onPress, disabled }: RoundButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      className={`h-10 w-10 items-center justify-center rounded-full active:bg-white/10 ${disabled ? 'opacity-40' : ''}`}
    >
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}
