import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

import { describeAuthError } from './authErrors';
import { validateNewPassword } from './validation';

type Errors = { current?: string | null; password?: string | null; confirmation?: string | null };

/**
 * Troca de senha no perfil. Confere a senha atual (entrando de novo com ela) antes de trocar:
 * quem pega o celular desbloqueado não consegue mudar a senha da conta.
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const dialog = useDialog();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    setCurrent('');
    setPassword('');
    setConfirmation('');
    setErrors({});
    setFormError(null);
  };

  const save = async () => {
    const next: Errors = {
      current: current ? null : 'Informe sua senha atual.',
      ...validateNewPassword(password, confirmation),
    };
    setErrors(next);
    setFormError(null);
    if (next.current || next.password || next.confirmation) return;

    setSaving(true);
    const { error: checkError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (checkError) {
      setSaving(false);
      if (checkError.code === 'invalid_credentials') {
        setErrors({ current: 'Senha atual incorreta.' });
      } else {
        setFormError(describeAuthError(checkError));
      }
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setFormError(describeAuthError(error));
      return;
    }
    close();
    dialog.toast({ message: 'Senha alterada', icon: 'lock' });
  };

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="h-[52px] flex-row items-center gap-3 rounded-[14px] border border-border bg-surface px-4 active:opacity-80"
      >
        <Icon name="lock" size={18} color={Colors.muted} />
        <Text className="flex-1 font-semibold text-[15px] text-text">Alterar senha</Text>
        <Icon name="chevron-right" size={18} color={Colors.muted} />
      </Pressable>
    );
  }

  return (
    <View className="gap-3.5 rounded-[18px] border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-bold text-[15px] text-text">
          Alterar senha
        </Text>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Cancelar troca de senha"
          hitSlop={8}
          className="active:opacity-70"
        >
          <Icon name="x" size={18} color={Colors.muted} />
        </Pressable>
      </View>
      <TextField
        label="Senha atual"
        icon="lock"
        value={current}
        onChangeText={setCurrent}
        error={errors.current}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <TextField
        label="Nova senha"
        icon="key"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        placeholder="Pelo menos 8 caracteres"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirme a nova senha"
        icon="key"
        value={confirmation}
        onChangeText={setConfirmation}
        error={errors.confirmation}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      {formError ? <Text className="font-sans text-danger">{formError}</Text> : null}
      <Button title="Salvar nova senha" onPress={save} loading={saving} />
    </View>
  );
}
