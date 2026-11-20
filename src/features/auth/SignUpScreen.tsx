import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { supabase } from '@/lib/supabase/client';

import { AuthScaffold } from './AuthScaffold';
import { describeAuthError } from './authErrors';
import {
  DISPLAY_NAME_MAX,
  normalizeDisplayName,
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from './validation';

type FieldErrors = { name?: string | null; email?: string | null; password?: string | null };

export function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: FieldErrors = {
      name: validateDisplayName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    setFormError(null);
    setNotice(null);
    if (next.name || next.email || next.password) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      // Lido pelo trigger que cria o perfil (supabase/migrations).
      options: { data: { display_name: normalizeDisplayName(name) } },
    });
    setLoading(false);

    if (error) {
      setFormError(describeAuthError(error));
      return;
    }
    // Sem sessão = o projeto exige confirmação de e-mail.
    if (!data.session) {
      setNotice('Conta criada! Confirme pelo link que enviamos ao seu e-mail e depois entre.');
    }
  };

  return (
    <AuthScaffold
      title="Crie sua conta"
      subtitle="Leva menos de um minuto. Seu apelido é como os amigos vão te ver na sala."
      footerQuestion="Já tem conta?"
      footerAction="Entrar"
      onFooterPress={() => router.replace('/sign-in')}
    >
      <TextField
        label="Apelido"
        icon="user"
        value={name}
        onChangeText={setName}
        error={errors.name}
        maxLength={DISPLAY_NAME_MAX}
        autoComplete="nickname"
        placeholder="Como seus amigos vão te ver"
      />
      <TextField
        label="E-mail"
        icon="mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="voce@email.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Senha"
        icon="lock"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="Mínimo de 8 caracteres"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {formError ? <Text className="font-sans text-danger">{formError}</Text> : null}
      {notice ? <Text className="font-sans text-success">{notice}</Text> : null}
      <Button title="Criar conta" onPress={submit} loading={loading} />
    </AuthScaffold>
  );
}
