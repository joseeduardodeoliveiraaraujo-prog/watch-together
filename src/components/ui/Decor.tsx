import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

import { Icon } from './Icon';

/** Gradiente da marca (logo, avatar do perfil). `backgroundImage` é nativo no RN 0.76+. */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${Colors['gradient-start']}, ${Colors['gradient-end']})`;

/** Ícone do app: quadrado com gradiente e o "play". */
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.31,
        backgroundImage: BRAND_GRADIENT,
        boxShadow: `0px 12px 32px ${Colors.primary}66`,
      }}
    >
      <Icon name="play" size={size * 0.44} color={Colors['primary-foreground']} />
    </View>
  );
}

type GlowProps = {
  /** Posição e tamanho da mancha de luz (absoluta, atrás do conteúdo). */
  style: Pick<ViewStyle, 'top' | 'left' | 'width' | 'height'>;
  /** Opacidade no centro, em hexadecimal (ex.: "55"). */
  strength?: string;
};

/** Brilho roxo difuso no fundo das telas de entrada. */
export function Glow({ style, strength = '55' }: GlowProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        ...style,
        backgroundImage: `radial-gradient(closest-side, ${Colors.primary}${strength}, ${Colors.primary}00)`,
      }}
    />
  );
}

/** Fundo com gradiente linear genérico (ex.: card "Nova sala", sombras sobre o vídeo). */
export function GradientView({
  gradient,
  className,
  style,
  children,
}: {
  gradient: string;
  className?: string;
  style?: ViewStyle;
  children?: ReactNode;
}) {
  return (
    <View className={className} style={[{ backgroundImage: gradient }, style]}>
      {children}
    </View>
  );
}
