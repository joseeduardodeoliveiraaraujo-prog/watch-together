import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { supabase } from '@/lib/supabase/client';

import { AuthScaffold } from './AuthScaffold';
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
    <AuthScaffold
      title={'Assista junto,\nmesmo de longe.'}
      subtitle="Entre na sua conta para criar salas e ver vídeos do YouTube com até 4 amigos."
      footerQuestion="Ainda não tem conta?"
      footerAction="Criar conta"
      onFooterPress={() => router.replace('/sign-up')}
    >
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
        placeholder="Sua senha"
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Pressable
        onPress={() => router.push('/forgot-password')}
        accessibilityRole="link"
        hitSlop={8}
        className="-mt-1 self-end active:opacity-70"
      >
        <Text className="font-semibold text-sm text-accent">Esqueci a senha</Text>
      </Pressable>
      {formError ? <Text className="font-sans text-danger">{formError}</Text> : null}
      <Button title="Entrar" onPress={submit} loading={loading} />
    </AuthScaffold>
  );
}
