import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

import { formatTime } from './format';
import { SeekBar } from './SeekBar';

type PlayerControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  disabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeekBy: (delta: number) => void;
  onSeekTo: (seconds: number) => void;
  onToggleFullscreen: () => void;
};

/**
 * Controles próprios do app abaixo do vídeo (o player do YouTube roda com controls=0).
 * Valem para toda a sala. Na tela cheia quem desenha os controles é `FullscreenControls`.
 */
export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  disabled,
  onPlay,
  onPause,
  onSeekBy,
  onSeekTo,
  onToggleFullscreen,
}: PlayerControlsProps) {
  return (
    <View className="gap-2.5 bg-surface px-5 pb-1.5 pt-3.5">
      <SeekBar
        currentTime={currentTime}
        duration={duration}
        disabled={disabled}
        variant="surface"
        onSeekTo={onSeekTo}
      />

      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="font-mono text-xs text-muted">
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>

        <View className="flex-row items-center gap-3.5">
          <RoundButton
            label="Voltar 10 segundos"
            icon="rotate-ccw"
            onPress={() => onSeekBy(-10)}
            disabled={disabled}
          />
          <Pressable
            onPress={isPlaying ? onPause : onPlay}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pausar' : 'Play'}
            accessibilityState={{ disabled }}
            className={`h-[52px] w-[52px] items-center justify-center rounded-full bg-white active:opacity-80 ${disabled ? 'opacity-40' : ''}`}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={22} color={Colors.background} />
          </Pressable>
          <RoundButton
            label="Avançar 10 segundos"
            icon="rotate-cw"
            onPress={() => onSeekBy(10)}
            disabled={disabled}
          />
        </View>

        <View className="flex-1 flex-row items-center justify-end">
          <Pressable
            onPress={onToggleFullscreen}
            accessibilityRole="button"
            accessibilityLabel="Tela cheia"
            hitSlop={8}
            className="h-10 w-10 items-end justify-center active:opacity-70"
          >
            <Icon name="maximize" size={20} color={Colors.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type RoundButtonProps = {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled: boolean;
};

function RoundButton({ label, icon, onPress, disabled }: RoundButtonProps) {
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
      <Icon name={icon} size={22} color={Colors.text} />
    </Pressable>
  );
}
