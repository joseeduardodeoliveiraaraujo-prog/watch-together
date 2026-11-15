import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  /** Aplica padding horizontal padrão. Desative para telas edge-to-edge (ex.: player). */
  padded?: boolean;
  /**
   * Respeita a área da barra de status no topo. Desative em telas com cabeçalho de navegação
   * (o cabeçalho já faz isso; senão sobra um espaço duplo).
   */
  topInset?: boolean;
  className?: string;
};

export function Screen({ children, padded = true, topInset = true, className = '' }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 bg-background ${padded ? 'px-4' : ''} ${className}`}
      style={{ paddingTop: topInset ? insets.top : 0, paddingBottom: insets.bottom }}
    >
      {children}
    </View>
  );
}
