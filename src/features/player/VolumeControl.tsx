import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

import { SeekBar } from './SeekBar';
import type { VolumeControls } from './useVolume';
import { volumeIcon } from './volume';

/** Sem mexer, a barra aberta (modo em pé) fecha depois disso. */
const COLLAPSE_AFTER_MS = 3000;

type VolumeControlProps = {
  controls: VolumeControls;
  variant: 'overlay' | 'surface';
  /**
   * `inline`: alto-falante + barra sempre visíveis (tela cheia).
   * `expandable`: só o alto-falante; o primeiro toque abre a barra (quem usa decide o espaço
   * pelo `expanded`) e ela fecha sozinha depois de alguns segundos sem uso.
   */
  mode: 'inline' | 'expandable';
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Qualquer interação (para a tela cheia não esconder os controles). */
  onInteract?: () => void;
};

/** Volume do vídeo neste aparelho, no estilo do YouTube: alto-falante (mudo) e barra. */
export function VolumeControl({
  controls,
  variant,
  mode,
  expanded = false,
  onExpandedChange,
  onInteract,
}: VolumeControlProps) {
  const { volume, setVolume, toggleMute } = controls;
  const [dragging, setDragging] = useState(false);
  /** Muda a cada interação para reiniciar o tempo até fechar. */
  const [activity, setActivity] = useState(0);
  const open = mode === 'inline' || expanded;
  const color = variant === 'overlay' ? Colors.white : Colors.muted;
  const level = volume.muted ? 0 : volume.volume;

  useEffect(() => {
    if (mode !== 'expandable' || !expanded || dragging) return;
    const timer = setTimeout(() => onExpandedChange?.(false), COLLAPSE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [mode, expanded, dragging, activity, onExpandedChange]);

  const touch = () => {
    setActivity((n) => n + 1);
    onInteract?.();
  };

  const pressSpeaker = () => {
    touch();
    // Em pé, o primeiro toque só abre a barra; com ela aberta, o toque silencia.
    if (mode === 'expandable' && !expanded) onExpandedChange?.(true);
    else toggleMute();
  };

  return (
    <View
      className={`flex-row items-center gap-2 ${mode === 'expandable' && open ? 'flex-1' : ''}`}
    >
      <Pressable
        onPress={pressSpeaker}
        accessibilityRole="button"
        accessibilityLabel={
          mode === 'expandable' && !expanded ? 'Volume' : volume.muted ? 'Ativar som' : 'Silenciar'
        }
        hitSlop={6}
        className="h-10 w-9 items-start justify-center active:opacity-70"
      >
        <Icon name={volumeIcon(volume)} size={20} color={color} />
      </Pressable>
      {open ? (
        <View
          className={mode === 'expandable' ? 'flex-1' : ''}
          style={mode === 'inline' ? { width: 104 } : undefined}
        >
          <SeekBar
            currentTime={level}
            duration={100}
            disabled={false}
            variant={variant}
            label="Volume"
            a11yStep={10}
            onScrub={(value) => {
              setDragging(value !== null);
              touch();
              if (value !== null) setVolume(value, false);
            }}
            onSeekTo={(value) => {
              touch();
              setVolume(value);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
