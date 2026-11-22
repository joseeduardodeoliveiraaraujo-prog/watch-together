import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cornerForRelease,
  cornerPosition,
  miniPlayerSize,
  TAP_SLOP,
  type Corner,
  type MiniPlayerArea,
  type Point,
} from './miniPlayerLayout';

const MARGIN = 12;

type Options = {
  enabled: boolean;
  /** Espaço ocupado no topo (barra de status + cabeçalho da tela por baixo). */
  topInset: number;
  /** Toque sem arrastar. */
  onTap: () => void;
};

/**
 * Miniplayer flutuante: fica num canto, pode ser arrastado e gruda no canto mais próximo ao soltar.
 * Devolve o tamanho, a posição animada e os gestos para a camada de toque.
 */
export function useMiniPlayer({ enabled, topInset, onTap }: Options) {
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = miniPlayerSize(screen.width);
  const area: MiniPlayerArea = {
    screen: { width: screen.width, height: screen.height },
    size,
    insets: {
      top: topInset + MARGIN,
      bottom: insets.bottom + MARGIN,
      left: MARGIN,
      right: MARGIN,
    },
  };

  const [position] = useState(() => new Animated.ValueXY());
  const cornerRef = useRef<Corner>('bottom-right');
  const startRef = useRef<Point>({ x: 0, y: 0 });
  // O PanResponder é criado uma vez (recriar no meio do gesto perderia o arraste): lê o valor
  // mais recente destes pelos refs.
  const areaRef = useRef(area);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    areaRef.current = area;
    onTapRef.current = onTap;
  });

  // Ao abrir e se a tela mudar de tamanho: vai direto para o canto atual.
  useEffect(() => {
    if (enabled) position.setValue(cornerPosition(cornerRef.current, areaRef.current));
  }, [enabled, position, screen.width, screen.height, topInset, insets.bottom]);

  // Os refs só são lidos dentro dos gestos (depois da renderização), não ao criar o responder.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        position.stopAnimation();
        startRef.current = cornerPosition(cornerRef.current, areaRef.current);
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({
          x: startRef.current.x + gesture.dx,
          y: startRef.current.y + gesture.dy,
        });
      },
      onPanResponderRelease: (_, gesture) => {
        const start = startRef.current;
        if (Math.abs(gesture.dx) < TAP_SLOP && Math.abs(gesture.dy) < TAP_SLOP) {
          position.setValue(start);
          onTapRef.current();
          return;
        }
        const next = cornerForRelease(
          { x: start.x + gesture.dx, y: start.y + gesture.dy },
          { x: gesture.vx, y: gesture.vy },
          areaRef.current,
        );
        cornerRef.current = next;
        Animated.spring(position, {
          toValue: cornerPosition(next, areaRef.current),
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminate: () => {
        position.setValue(cornerPosition(cornerRef.current, areaRef.current));
      },
    }),
  );

  return {
    size,
    transform: position.getTranslateTransform(),
    panHandlers: responder.panHandlers,
  };
}
