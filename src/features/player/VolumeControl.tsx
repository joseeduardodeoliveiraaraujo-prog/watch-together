import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type HostInstance } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

import type { VolumeControls } from './useVolume';
import { volumeIcon } from './volume';

/** Sem mexer, a barra que sobe (modo em pé) fecha depois disso. */
const CLOSE_AFTER_MS = 3000;
const THUMB = 12;
/** Largura da pílula da barra (w-11), usada para centralizá-la sobre o alto-falante. */
export const VOLUME_POPOVER_WIDTH = 44;

/**
 * Em pé (P1): alto-falante ao lado da tela cheia. Fechado, o toque abre a barra que sobe;
 * aberto, o toque silencia.
 */
export function VolumeButton({
  controls,
  open,
  onPress,
}: {
  controls: VolumeControls;
  open: boolean;
  /** Recebe o centro horizontal do botão na tela (para alinhar a barra que sobe). */
  onPress: (centerX: number) => void;
}) {
  const ref = useRef<HostInstance>(null);
  return (
    <Pressable
      ref={ref}
      onPress={() => {
        const node = ref.current;
        if (!node) return onPress(0);
        node.measureInWindow((x, _y, width) => onPress(x + width / 2));
      }}
      accessibilityRole="button"
      accessibilityLabel={open ? (controls.volume.muted ? 'Ativar som' : 'Silenciar') : 'Volume'}
      accessibilityState={{ expanded: open }}
      hitSlop={6}
      className={`h-10 w-9 items-center justify-center rounded-xl active:opacity-70 ${open ? 'bg-primary/15' : ''}`}
    >
      <Icon
        name={volumeIcon(controls.volume)}
        size={20}
        color={open ? Colors.accent : Colors.muted}
      />
    </Pressable>
  );
}

/**
 * Barra vertical de volume (0 embaixo, 100 em cima). Toque pula para o ponto; arrastar muda na
 * hora e salva ao soltar. `onActivity` avisa cada interação; `onDragChange`, início e fim do arraste.
 */
function VerticalVolumeSlider({
  controls,
  height,
  trackClassName,
  onActivity,
  onDragChange,
}: {
  controls: VolumeControls;
  height: number;
  trackClassName: string;
  onActivity?: () => void;
  onDragChange?: (dragging: boolean) => void;
}) {
  const { volume, setVolume } = controls;
  const [drag, setDrag] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  /** pageY do topo da barra (medido no início do toque). */
  const originRef = useRef(0);
  const level = drag ?? (volume.muted ? 0 : volume.volume);

  const valueAt = (y: number) => Math.round(Math.min(1, Math.max(0, 1 - y / height)) * 100);

  const update = (next: number | null) => {
    if ((dragRef.current === null) !== (next === null)) onDragChange?.(next !== null);
    dragRef.current = next;
    setDrag(next);
    onActivity?.();
    if (next !== null) setVolume(next, false);
  };

  const handleGrant = (e: GestureResponderEvent) => {
    originRef.current = e.nativeEvent.pageY - e.nativeEvent.locationY;
    update(valueAt(e.nativeEvent.locationY));
  };

  const handleRelease = () => {
    const final = dragRef.current;
    update(null);
    if (final !== null) setVolume(final);
  };

  return (
    <View
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderMove={(e) => update(valueAt(e.nativeEvent.pageY - originRef.current))}
      onResponderRelease={handleRelease}
      onResponderTerminate={() => update(null)}
      hitSlop={{ left: 14, right: 14 }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Volume"
      accessibilityValue={{ min: 0, max: 100, now: level }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        onActivity?.();
        setVolume(level + (e.nativeEvent.actionName === 'increment' ? 10 : -10));
      }}
      className="w-3.5 items-center"
      style={{ height }}
    >
      <View
        pointerEvents="none"
        className={`h-full w-1 justify-end overflow-hidden rounded-full ${trackClassName}`}
      >
        <View className="w-full rounded-full bg-primary" style={{ height: `${level}%` }} />
      </View>
      <View
        pointerEvents="none"
        className="absolute rounded-full bg-white"
        style={{
          width: THUMB,
          height: THUMB,
          top: Math.min(height - THUMB, Math.max(0, (1 - level / 100) * height - THUMB / 2)),
          boxShadow: '0px 2px 6px #00000080',
        }}
      />
    </View>
  );
}

/**
 * Barra que sobe acima do alto-falante (P1). Fica dentro da área do vídeo para receber toques
 * (no Android, toques fora do componente pai não chegam). Fecha sozinha sem uso.
 */
export function VolumePopover({
  controls,
  onClose,
  activityKey,
}: {
  controls: VolumeControls;
  onClose: () => void;
  /** Muda quando o alto-falante é tocado com a barra aberta (reinicia o tempo para fechar). */
  activityKey: number;
}) {
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(0);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (dragging) return;
    const timer = setTimeout(() => onCloseRef.current(), CLOSE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [dragging, touched, activityKey]);

  // Mesmo visual da barra da tela cheia (F2): pílula escura translúcida, sem número.
  return (
    <View className="w-11 items-center rounded-[22px] bg-black/50 py-3.5">
      <VerticalVolumeSlider
        controls={controls}
        height={120}
        trackClassName="bg-white/25"
        onActivity={() => setTouched((n) => n + 1)}
        onDragChange={setDragging}
      />
    </View>
  );
}

/**
 * Tela cheia (F2): barra vertical na borda direita, aparece e some com os controles. O
 * alto-falante embaixo silencia.
 */
export function SideVolume({
  controls,
  onInteract,
}: {
  controls: VolumeControls;
  onInteract: () => void;
}) {
  const { volume, toggleMute } = controls;
  return (
    <View className="w-11 items-center gap-2.5 rounded-[22px] bg-black/50 pb-2 pt-3.5">
      <VerticalVolumeSlider
        controls={controls}
        height={120}
        trackClassName="bg-white/25"
        onActivity={onInteract}
      />
      <Pressable
        onPress={() => {
          toggleMute();
          onInteract();
        }}
        accessibilityRole="button"
        accessibilityLabel={volume.muted ? 'Ativar som' : 'Silenciar'}
        hitSlop={6}
        className="h-8 w-8 items-center justify-center active:opacity-70"
      >
        <Icon name={volumeIcon(volume)} size={18} color={Colors.white} />
      </Pressable>
    </View>
  );
}
