import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { supabase } from '@/lib/supabase/client';

import { describeAuthError } from './authErrors';
import { normalizeEmail, validateEmail } from './validation';

export function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next = {
      email: validateEmail(email),
      password: password ? null : 'Informe sua senha.',
    };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    setLoading(false);
    // Com sucesso, a sessão muda e o Stack.Protected leva para a home.
    if (error) setFormError(describeAuthError(error));
  };

  return (
    <FormScreen>
      <Text className="text-2xl font-bold text-text">Entrar</Text>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {formError ? <Text className="text-danger">{formError}</Text> : null}
      <Button title="Entrar" onPress={submit} loading={loading} />
      <Text className="mt-4 text-center text-muted">Ainda não tem conta?</Text>
      <Button title="Criar conta" variant="secondary" onPress={() => router.replace('/sign-up')} />
    </FormScreen>
  );
}
