import { useRef, useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

const THUMB = 14;
const A11Y_STEP_SECONDS = 10;

type SeekBarProps = {
  currentTime: number;
  duration: number;
  disabled: boolean;
  /** `overlay`: sobre o vídeo (tela cheia); `surface`: abaixo do vídeo. */
  variant: 'overlay' | 'surface';
  onSeekTo: (seconds: number) => void;
  /** Durante o arraste: posição prevista em segundos; `null` ao soltar ou cancelar. */
  onScrub?: (seconds: number | null) => void;
  /** Rótulo para leitores de tela (padrão: posição do vídeo). */
  label?: string;
  /** Passo dos gestos de acessibilidade (aumentar/diminuir), na mesma unidade de `currentTime`. */
  a11yStep?: number;
};

/** Barra de progresso: toque pula para o ponto; arrastar mostra a prévia e busca ao soltar. */
export function SeekBar({
  currentTime,
  duration,
  disabled,
  variant,
  onSeekTo,
  onScrub,
  label = 'Posição do vídeo',
  a11yStep = A11Y_STEP_SECONDS,
}: SeekBarProps) {
  const [width, setWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  /** pageX da borda esquerda da barra (medido no início do toque). */
  const originRef = useRef(0);

  const enabled = !disabled && duration > 0 && width > 0;
  const playedRatio = duration > 0 ? clamp(currentTime / duration) : 0;
  const ratio = dragRatio ?? playedRatio;

  const update = (next: number | null) => {
    dragRef.current = next;
    setDragRatio(next);
    onScrub?.(next === null ? null : next * duration);
  };

  const handleGrant = (event: GestureResponderEvent) => {
    const { pageX, locationX } = event.nativeEvent;
    originRef.current = pageX - locationX;
    update(clamp(locationX / width));
  };

  const handleMove = (event: GestureResponderEvent) => {
    update(clamp((event.nativeEvent.pageX - originRef.current) / width));
  };

  const handleRelease = () => {
    const final = dragRef.current;
    update(null);
    if (final !== null) onSeekTo(final * duration);
  };

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => enabled}
      onMoveShouldSetResponder={() => enabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderMove={handleMove}
      onResponderRelease={handleRelease}
      onResponderTerminate={() => update(null)}
      hitSlop={{ top: 12, bottom: 12 }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(currentTime) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (disabled) return;
        const delta = e.nativeEvent.actionName === 'increment' ? a11yStep : -a11yStep;
        onSeekTo(Math.min(duration, Math.max(0, currentTime + delta)));
      }}
      className="h-3.5 justify-center"
    >
      <View
        pointerEvents="none"
        className={`overflow-hidden rounded-full ${dragRatio !== null ? 'h-1.5' : 'h-1'} ${variant === 'overlay' ? 'bg-white/25' : 'bg-border'}`}
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
            left: Math.max(0, ratio * width - THUMB / 2),
            boxShadow: '0px 2px 6px #00000080',
            transform: [{ scale: dragRatio !== null ? 1.25 : 1 }],
          }}
        />
      )}
    </View>
  );
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}
