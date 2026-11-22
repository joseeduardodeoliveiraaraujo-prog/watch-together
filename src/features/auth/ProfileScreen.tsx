import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppHeader } from '@/components/layout/AppHeader';
import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { BRAND_GRADIENT } from '@/components/ui/Decor';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

import { describeAuthError } from './authErrors';
import { ChangePasswordForm } from './ChangePasswordForm';
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
    setMessage(saveError ? { text: saveError, ok: false } : { text: 'Apelido salvo', ok: true });
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
  const savedName = profile?.display_name ?? '';

  return (
    <FormScreen header={<AppHeader title="Perfil" />} contentClassName="gap-7 px-5 pb-8 pt-4">
      <View className="items-center gap-3.5 py-2">
        <View
          className="h-[88px] w-[88px] items-center justify-center rounded-full"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >
          <Text className="font-extrabold text-4xl text-primary-foreground">
            {savedName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View className="items-center gap-1">
          <Text className="font-extrabold text-[22px] text-text">{savedName}</Text>
          <Text className="font-sans text-[13px] text-muted">
            Conectado como {session?.user.email}
          </Text>
        </View>
      </View>

      {error ? (
        <View className="gap-2">
          <Text className="font-sans text-danger">{error}</Text>
          <Button title="Tentar de novo" variant="secondary" onPress={reload} />
        </View>
      ) : (
        <View className="gap-3.5">
          <TextField
            label="Apelido"
            icon="user"
            value={name}
            onChangeText={setDraft}
            error={fieldError}
            maxLength={DISPLAY_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          {message ? (
            <View className="flex-row items-center gap-1.5">
              <Icon
                name={message.ok ? 'check-circle' : 'alert-circle'}
                size={14}
                color={message.ok ? Colors.success : Colors.danger}
              />
              <Text
                className={`font-sans text-[13px] ${message.ok ? 'text-success' : 'text-danger'}`}
              >
                {message.text}
              </Text>
            </View>
          ) : null}
          <Button title="Salvar apelido" onPress={save} loading={saving} disabled={unchanged} />
        </View>
      )}

      {session?.user.email ? <ChangePasswordForm email={session.user.email} /> : null}

      <View className="flex-1" />

      <Button
        title="Sair da conta"
        icon="log-out"
        variant="danger"
        onPress={signOut}
        loading={signingOut}
      />
    </FormScreen>
  );
}
