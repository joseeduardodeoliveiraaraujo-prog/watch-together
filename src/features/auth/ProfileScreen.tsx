import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

import { describeAuthError } from './authErrors';
import { useSession } from './SessionProvider';
import { useProfile } from './useProfile';
import { DISPLAY_NAME_MAX, normalizeDisplayName, validateDisplayName } from './validation';

export function ProfileScreen() {
  const { session } = useSession();
  const { profile, isLoading, error, reload, updateDisplayName } = useProfile();
  // null = o usuário ainda não editou; mostra o apelido salvo.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? profile?.display_name ?? '';
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const save = async () => {
    const validation = validateDisplayName(name);
    setFieldError(validation);
    setMessage(null);
    if (validation) return;

    setSaving(true);
    const saveError = await updateDisplayName(name);
    setSaving(false);
    if (!saveError) setDraft(null);
    setMessage(saveError ? { text: saveError, ok: false } : { text: 'Apelido salvo.', ok: true });
  };

  const signOut = async () => {
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    setSigningOut(false);
    // Com sucesso, a sessão some e o Stack.Protected leva para a tela de entrar.
    if (signOutError) setMessage({ text: describeAuthError(signOutError), ok: false });
  };

  if (isLoading && !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const unchanged = !!profile && normalizeDisplayName(name) === profile.display_name;

  return (
    <FormScreen topInset={false}>
      <View className="gap-1">
        <Text className="text-sm text-muted">Conectado como</Text>
        <Text className="text-base text-text">{session?.user.email}</Text>
      </View>

      {error ? (
        <View className="gap-2">
          <Text className="text-danger">{error}</Text>
          <Button title="Tentar de novo" variant="secondary" onPress={reload} />
        </View>
      ) : (
        <>
          <TextField
            label="Apelido"
            value={name}
            onChangeText={setDraft}
            error={fieldError}
            maxLength={DISPLAY_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Button title="Salvar apelido" onPress={save} loading={saving} disabled={unchanged} />
        </>
      )}

      {message ? (
        <Text className={message.ok ? 'text-success' : 'text-danger'}>{message.text}</Text>
      ) : null}

      <View className="mt-6">
        <Button title="Sair da conta" variant="danger" onPress={signOut} loading={signingOut} />
      </View>
    </FormScreen>
  );
}
