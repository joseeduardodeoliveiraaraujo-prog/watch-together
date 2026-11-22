import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

import { AuthScaffold } from './AuthScaffold';
import { describeAuthError } from './authErrors';
import {
  normalizeEmail,
  normalizeRecoveryCode,
  validateEmail,
  validateNewPassword,
  validateRecoveryCode,
} from './validation';

/** Espera entre reenvios do código (o Supabase também limita os envios por hora). */
const RESEND_SECONDS = 60;

type Errors = {
  email?: string | null;
  code?: string | null;
  password?: string | null;
  confirmation?: string | null;
};

/**
 * Recuperação de senha com código numérico enviado por e-mail (ADR 0012).
 * 1. Pede o e-mail e envia o código. 2. Código + nova senha na mesma etapa: validar o código já
 * deixa a pessoa logada (e o Stack.Protected leva para a home), então a senha vai junto.
 */
export function ForgotPasswordScreen() {
  const router = useRouter();
  const dialog = useDialog();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    setFormError(null);
    if (emailError) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
    setLoading(false);
    if (error) {
      setFormError(describeAuthError(error));
      return;
    }
    setStep('code');
    setCooldown(RESEND_SECONDS);
  };

  const resend = async () => {
    if (cooldown > 0 || loading) return;
    setFormError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
    setLoading(false);
    if (error) {
      setFormError(describeAuthError(error));
      return;
    }
    setCooldown(RESEND_SECONDS);
    dialog.toast({ message: 'Enviamos um novo código', icon: 'mail' });
  };

  const reset = async () => {
    const next: Errors = {
      code: validateRecoveryCode(code),
      ...validateNewPassword(password, confirmation),
    };
    setErrors(next);
    setFormError(null);
    if (next.code || next.password || next.confirmation) return;

    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizeEmail(email),
      token: normalizeRecoveryCode(code),
      type: 'recovery',
    });
    if (verifyError) {
      setLoading(false);
      setFormError(describeAuthError(verifyError));
      return;
    }
    // A partir daqui a pessoa já está logada e esta tela pode sair a qualquer momento:
    // o resultado vai pelo aviso global (DialogProvider), que continua na tela.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      dialog.toast({
        message: `Você entrou, mas a senha não foi trocada: ${describeAuthError(updateError)} Troque no Perfil.`,
        tone: 'error',
      });
    } else {
      dialog.toast({ message: 'Senha redefinida. Bem-vindo de volta!' });
    }
  };

  const backToSignIn = () => router.replace('/sign-in');

  if (step === 'email') {
    return (
      <AuthScaffold
        title="Esqueceu a senha?"
        subtitle="Informe o e-mail da sua conta. Vamos mandar um código para você criar uma senha nova."
        footerQuestion="Lembrou a senha?"
        footerAction="Entrar"
        onFooterPress={backToSignIn}
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
          returnKeyType="send"
          onSubmitEditing={sendCode}
        />
        {formError ? <Text className="font-sans text-danger">{formError}</Text> : null}
        <Button title="Enviar código" icon="send" onPress={sendCode} loading={loading} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Crie uma senha nova"
      subtitle={`Se existir uma conta com ${normalizeEmail(email)}, enviamos um código para lá. Ele vale por 1 hora — confira também o spam.`}
      footerQuestion="Lembrou a senha?"
      footerAction="Entrar"
      onFooterPress={backToSignIn}
    >
      <TextField
        label="Código"
        icon="hash"
        value={code}
        onChangeText={setCode}
        error={errors.code}
        placeholder="Código do e-mail"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={10}
      />
      <TextField
        label="Nova senha"
        icon="lock"
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
        icon="lock"
        value={confirmation}
        onChangeText={setConfirmation}
        error={errors.confirmation}
        placeholder="Digite a senha de novo"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={reset}
      />
      {formError ? <Text className="font-sans text-danger">{formError}</Text> : null}
      <Button title="Redefinir senha" onPress={reset} loading={loading} />

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Pressable
          onPress={resend}
          disabled={cooldown > 0 || loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: cooldown > 0 || loading }}
          hitSlop={8}
          className="flex-row items-center gap-1.5 active:opacity-70"
        >
          <Icon name="refresh-cw" size={14} color={cooldown > 0 ? Colors.subtle : Colors.accent} />
          <Text className={`font-semibold text-sm ${cooldown > 0 ? 'text-subtle' : 'text-accent'}`}>
            {cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setStep('email');
            setCode('');
            setErrors({});
            setFormError(null);
          }}
          accessibilityRole="button"
          hitSlop={8}
          className="active:opacity-70"
        >
          <Text className="font-semibold text-sm text-muted">Usar outro e-mail</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
