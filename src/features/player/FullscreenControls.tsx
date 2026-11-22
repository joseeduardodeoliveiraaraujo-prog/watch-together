import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { GradientView } from '@/components/ui/Decor';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';

import type { CaptionSelection } from '@/lib/youtube/bridge';

import { CaptionsSheet } from './CaptionsSheet';
import type { ProgressStore } from './progressStore';
import { ProgressSeekBar, ProgressTime } from './ProgressViews';
import type { CaptionsState } from './useCaptions';

/** Tocando, os controles somem depois desse tempo sem interação. */
const HIDE_AFTER_MS = 3000;
/** Dois toques no mesmo lado dentro desse intervalo = pular 10 s. */
const DOUBLE_TAP_MS = 280;
const SEEK_STEP = 10;
const FADE_MS = 200;

type Side = 'left' | 'center' | 'right';

type FullscreenControlsProps = {
  isPlaying: boolean;
  progress: ProgressStore;
  disabled: boolean;
  title: string | null;
  captions: CaptionsState;
  onPlay: () => void;
  onPause: () => void;
  onSeekBy: (delta: number) => void;
  onSeekTo: (seconds: number) => void;
  onExit: () => void;
  onRequestCaptions: () => void;
  onSelectCaption: (selection: CaptionSelection | null) => void;
  /** Camada sem toque sobre o vídeo (chat), empurrada para baixo do título quando os controles aparecem. */
  overlay?: ReactNode;
};

/**
 * Controles da tela cheia no estilo do YouTube: ficam sobre o vídeo, somem sozinhos enquanto toca
 * e voltam com um toque. Dois toques nas laterais pulam 10 s. A camada de toque também impede que
 * o player do YouTube receba toques (o play dele não passaria pela sala).
 */
export function FullscreenControls({
  isPlaying,
  progress,
  disabled,
  title,
  captions,
  onPlay,
  onPause,
  onSeekBy,
  onSeekTo,
  onExit,
  onRequestCaptions,
  onSelectCaption,
  overlay,
}: FullscreenControlsProps) {
  const [visible, setVisible] = useState(true);
  /** Muda a cada interação para reiniciar o tempo até esconder. */
  const [activity, setActivity] = useState(0);
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [seekHint, setSeekHint] = useState<{ side: 'left' | 'right'; key: number } | null>(null);
  const [width, setWidth] = useState(0);
  const [opacity] = useState(() => new Animated.Value(1));
  const lastTapRef = useRef<{ side: Side; at: number } | null>(null);
  const pendingTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keepVisible = !isPlaying || captionsOpen || scrubTime !== null;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  useEffect(() => {
    if (!visible || keepVisible) return;
    const timer = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [visible, keepVisible, activity]);

  useEffect(() => {
    if (!seekHint) return;
    const timer = setTimeout(() => setSeekHint(null), 650);
    return () => clearTimeout(timer);
  }, [seekHint]);

  useEffect(
    () => () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    },
    [],
  );

  const poke = () => {
    setVisible(true);
    setActivity((n) => n + 1);
  };

  const toggleVisible = () => {
    if (visible) setVisible(false);
    else poke();
  };

  const handleTap = (event: GestureResponderEvent) => {
    const x = event.nativeEvent.locationX;
    const side: Side =
      width <= 0 ? 'center' : x < width / 3 ? 'left' : x > (width * 2) / 3 ? 'right' : 'center';
    const now = Date.now();
    const last = lastTapRef.current;
    lastTapRef.current = { side, at: now };

    if (side !== 'center' && !disabled && last?.side === side && now - last.at < DOUBLE_TAP_MS) {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
      pendingTapRef.current = null;
      onSeekBy(side === 'left' ? -SEEK_STEP : SEEK_STEP);
      setSeekHint({ side, key: now });
      if (visible) poke();
      return;
    }

    if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    pendingTapRef.current = null;
    // Nas laterais espera um pouco para ver se vem o segundo toque.
    if (side === 'center' || disabled) toggleVisible();
    else
      pendingTapRef.current = setTimeout(() => {
        pendingTapRef.current = null;
        toggleVisible();
      }, DOUBLE_TAP_MS);
  };

  /** Envolve a ação de um botão para manter os controles visíveis. */
  const withPoke = (action: () => void) => () => {
    action();
    poke();
  };

  const openCaptions = () => {
    onRequestCaptions();
    setCaptionsOpen(true);
    poke();
  };

  const selectCaption = (selection: CaptionSelection | null) => {
    onSelectCaption(selection);
    setCaptionsOpen(false);
    poke();
  };

  return (
    <View className="absolute inset-0" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* Recebe todos os toques no vídeo: o player do YouTube não reage a nada. */}
      <Pressable
        onPress={handleTap}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Esconder controles' : 'Mostrar controles'}
        className="absolute inset-0"
      />

      {overlay ? (
        <View pointerEvents="none" className="absolute inset-0" style={{ top: visible ? 52 : 0 }}>
          {overlay}
        </View>
      ) : null}

      {seekHint ? (
        <View
          key={seekHint.key}
          pointerEvents="none"
          className={`absolute bottom-0 top-0 justify-center ${seekHint.side === 'left' ? 'left-16' : 'right-16'}`}
        >
          <View className="flex-row items-center gap-2 rounded-full bg-black/55 px-4 py-2.5">
            <Icon
              name={seekHint.side === 'left' ? 'rewind' : 'fast-forward'}
              size={16}
              color={Colors.white}
            />
            <Text className="font-semibold text-[13px] text-white">
              {seekHint.side === 'left' ? `−${SEEK_STEP} s` : `+${SEEK_STEP} s`}
            </Text>
          </View>
        </View>
      ) : null}

      <Animated.View
        pointerEvents={visible ? 'box-none' : 'none'}
        className="absolute inset-0"
        style={{ opacity }}
      >
        {/* Escurece o vídeo (mais no topo e na base) para os controles aparecerem. */}
        <GradientView
          gradient="linear-gradient(to bottom, #000000AA 0%, #00000055 30%, #00000055 65%, #000000CC 100%)"
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        />

        <View pointerEvents="box-none" className="flex-row items-center gap-4 px-10 pt-4">
          <Text className="flex-1 font-semibold text-[15px] text-white" numberOfLines={1}>
            {title ?? ''}
          </Text>
          <CaptionsButton
            active={captions.active !== null}
            disabled={disabled}
            onPress={openCaptions}
          />
        </View>

        <View
          pointerEvents="box-none"
          className="absolute inset-0 flex-row items-center justify-center gap-14"
        >
          <CircleButton
            label={`Voltar ${SEEK_STEP} segundos`}
            icon="rotate-ccw"
            onPress={withPoke(() => onSeekBy(-SEEK_STEP))}
            disabled={disabled}
          />
          <Pressable
            onPress={withPoke(isPlaying ? onPause : onPlay)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pausar' : 'Play'}
            accessibilityState={{ disabled }}
            className={`h-16 w-16 items-center justify-center rounded-full bg-white active:opacity-80 ${disabled ? 'opacity-40' : ''}`}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={26} color={Colors.background} />
          </Pressable>
          <CircleButton
            label={`Avançar ${SEEK_STEP} segundos`}
            icon="rotate-cw"
            onPress={withPoke(() => onSeekBy(SEEK_STEP))}
            disabled={disabled}
          />
        </View>

        <View
          pointerEvents="box-none"
          className="absolute bottom-0 left-0 right-0 gap-2 px-10 pb-5"
        >
          <View pointerEvents="box-none" className="flex-row items-center">
            <View className="flex-1">
              <ProgressTime
                store={progress}
                override={scrubTime}
                className="font-mono text-[13px] text-white/80"
              />
            </View>
            <Pressable
              onPress={onExit}
              accessibilityRole="button"
              accessibilityLabel="Sair da tela cheia"
              hitSlop={8}
              className="h-10 w-10 items-end justify-center active:opacity-70"
            >
              <Icon name="minimize" size={20} color={Colors.white} />
            </Pressable>
          </View>
          <ProgressSeekBar
            store={progress}
            disabled={disabled}
            variant="overlay"
            onSeekTo={(seconds) => {
              onSeekTo(seconds);
              poke();
            }}
            onScrub={setScrubTime}
          />
        </View>
      </Animated.View>

      {captionsOpen ? (
        <CaptionsSheet
          captions={captions}
          onSelect={selectCaption}
          onClose={() => {
            setCaptionsOpen(false);
            poke();
          }}
        />
      ) : null}
    </View>
  );
}

function CircleButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      className={`h-14 w-14 items-center justify-center rounded-full bg-black/35 active:bg-white/15 ${disabled ? 'opacity-40' : ''}`}
    >
      <Icon name={icon} size={24} color={Colors.white} />
    </Pressable>
  );
}

/** Botão "CC" como o do YouTube; a barrinha embaixo indica legenda ligada. */
function CaptionsButton({
  active,
  disabled,
  onPress,
}: {
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Legendas, ativadas' : 'Legendas, desativadas'}
      accessibilityState={{ disabled }}
      hitSlop={8}
      className={`h-10 items-center justify-center px-1 active:opacity-70 ${disabled ? 'opacity-40' : ''}`}
    >
      <View className="rounded-[4px] border-[1.5px] border-white px-1 py-px">
        <Text className="font-extrabold text-[11px] text-white">CC</Text>
      </View>
      <View
        className={`mt-1 h-[3px] w-5 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`}
      />
    </Pressable>
  );
}
