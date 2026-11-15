import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import { Screen } from './Screen';

type FormScreenProps = {
  children: ReactNode;
  /** Centraliza o conteúdo na vertical (telas de login). */
  centered?: boolean;
  /** Ver `Screen.topInset`: desative em telas com cabeçalho de navegação. */
  topInset?: boolean;
};

/** Tela com rolagem que sobe junto com o teclado. */
export function FormScreen({ children, centered = true, topInset = true }: FormScreenProps) {
  return (
    <Screen topInset={topInset}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          contentContainerClassName={`flex-grow gap-4 py-6 ${centered ? 'justify-center' : ''}`}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
