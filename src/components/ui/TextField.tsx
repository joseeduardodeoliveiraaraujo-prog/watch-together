import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/theme';

import { Icon, type IconName } from './Icon';

type TextFieldProps = TextInputProps & {
  label: string;
  icon?: IconName;
  error?: string | null;
};

/**
 * Campo de formulário com rótulo, ícone e erro.
 * Com `secureTextEntry` vira campo de senha: botão de olho para mostrar/esconder e sem
 * maiúscula automática nem corretor (senão "Senha123" vira outra senha sem a pessoa ver).
 */
export function TextField({
  label,
  icon,
  error,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const border = error ? 'border-danger' : focused ? 'border-primary' : 'border-border';
  const isPassword = !!secureTextEntry;

  return (
    <View className="gap-2">
      <Text className="font-semibold text-[13px] text-muted">{label}</Text>
      <View
        className={`h-[52px] flex-row items-center gap-2.5 rounded-[14px] border bg-surface px-4 ${border}`}
      >
        {icon ? (
          <Icon name={icon} size={18} color={focused ? Colors.accent : Colors.muted} />
        ) : null}
        <TextInput
          placeholderTextColor={Colors.subtle}
          selectionColor={Colors.primary}
          accessibilityLabel={label}
          className="h-full flex-1 font-sans text-base text-text"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
          {...(isPassword
            ? {
                secureTextEntry: !revealed,
                autoCapitalize: 'none',
                autoCorrect: false,
                spellCheck: false,
              }
            : null)}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? `Esconder ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`
            }
            hitSlop={10}
            className="h-10 w-8 items-end justify-center active:opacity-70"
          >
            <Icon name={revealed ? 'eye-off' : 'eye'} size={18} color={Colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
