import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  /** Aplica padding horizontal padrão. Desative para telas edge-to-edge (ex.: player). */
  padded?: boolean;
  className?: string;
};

export function Screen({ children, padded = true, className = '' }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-1 bg-background ${padded ? 'px-4' : ''} ${className}`}
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {children}
    </View>
  );
}
