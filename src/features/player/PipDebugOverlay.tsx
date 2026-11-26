import { PixelRatio, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WebLayout } from '@/lib/youtube/YouTubePlayer';

/**
 * Diagnóstico da janelinha (picture in picture): liga em desenvolvimento ou com
 * `EXPO_PUBLIC_PIP_DEBUG=1` no build. Um print da janelinha mostra as medidas reais.
 */
export const PIP_DEBUG = __DEV__ || process.env.EXPO_PUBLIC_PIP_DEBUG === '1';

export type AreaLayout = { x: number; y: number; width: number; height: number };

type Props = {
  area: AreaLayout | null;
  web: WebLayout | null;
};

const r = (n: number) => Math.round(n);

export function PipDebugOverlay({ area, web }: Props) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const lines = [
    `janela ${r(window.width)}x${r(window.height)} dp @${PixelRatio.get()}`,
    `insets t${r(insets.top)} b${r(insets.bottom)} l${r(insets.left)} r${r(insets.right)}`,
    area ? `área ${r(area.x)},${r(area.y)} ${r(area.width)}x${r(area.height)}` : 'área ?',
    web
      ? `web ${web.innerWidth}x${web.innerHeight} vv ${web.vvWidth}x${web.vvHeight}+${web.vvTop}`
      : 'web ?',
    web ? `iframe ${web.frame}` : '',
  ].filter(Boolean);

  return (
    <View
      className="absolute left-0 top-0 bg-black/70 px-1 py-0.5"
      style={{ pointerEvents: 'none' }}
    >
      {lines.map((line) => (
        <Text key={line} className="font-mono text-[9px] leading-[11px] text-white">
          {line}
        </Text>
      ))}
    </View>
  );
}
