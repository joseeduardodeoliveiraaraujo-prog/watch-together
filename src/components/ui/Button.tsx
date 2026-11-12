import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { Colors } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface-raised border border-border',
  danger: 'bg-danger',
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center rounded-xl px-4 active:opacity-80 ${containerByVariant[variant]} ${isDisabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={Colors['primary-foreground']} />
      ) : (
        <Text className="text-base font-semibold text-primary-foreground">{title}</Text>
      )}
    </Pressable>
  );
}
