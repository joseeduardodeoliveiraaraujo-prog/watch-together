import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

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

/** Tela com rolagem que sobe junto com o teclado. */
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
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          contentContainerClassName={`flex-grow ${contentClassName}`}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
