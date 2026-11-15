import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView } from 'react-native';

import { Screen } from './Screen';

/** Tela de formulário: rola e sobe junto com o teclado. */
export function FormScreen({ children }: { children: ReactNode }) {
  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-4 py-6"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
