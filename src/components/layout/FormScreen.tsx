import type { ReactNode } from 'react';
import { cssInterop } from 'nativewind';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Screen } from './Screen';

type FormScreenProps = {
  children: ReactNode;
  /** Classes do conteúdo rolável (padding, espaçamento). */
  contentClassName?: string;
  /** Ver `Screen.topInset`. */
  topInset?: boolean;
  /** Fica atrás do conteúdo e não rola (ex.: brilho de fundo). */
  background?: ReactNode;
  /** Fica acima do conteúdo e não rola (ex.: cabeçalho). */
  header?: ReactNode;
};

// Para aceitar `contentContainerClassName` como o ScrollView do react-native.
cssInterop(KeyboardAwareScrollView, { contentContainerClassName: 'contentContainerStyle' });

/** Distância entre o campo focado e o topo do teclado. */
const KEYBOARD_GAP = 24;

/**
 * Tela com rolagem que acompanha o teclado: rola até o campo focado para ele não ficar coberto.
 * (O KeyboardAvoidingView do react-native calcula errado a posição do teclado no Android.)
 */
export function FormScreen({
  children,
  contentClassName = 'gap-4 px-5 py-6',
  topInset = true,
  background,
  header,
}: FormScreenProps) {
  return (
    <Screen padded={false} topInset={topInset} className="overflow-hidden">
      {background}
      {header}
      <KeyboardAwareScrollView
        bottomOffset={KEYBOARD_GAP}
        contentContainerClassName={`flex-grow ${contentClassName}`}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </KeyboardAwareScrollView>
    </Screen>
  );
}
