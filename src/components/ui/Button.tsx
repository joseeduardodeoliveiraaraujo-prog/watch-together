import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { Colors } from '@/constants/theme';

import { Icon, type IconName } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
};

const styles: Record<ButtonVariant, { container: string; label: string; color: string }> = {
  primary: {
    container: 'h-[52px] bg-primary',
    label: 'font-bold text-primary-foreground',
    color: Colors['primary-foreground'],
  },
  secondary: {
    container: 'h-[52px] border border-border bg-surface-raised',
    label: 'font-semibold text-text',
    color: Colors.text,
  },
  danger: {
    container: 'h-[50px] bg-danger/10',
    label: 'font-bold text-danger',
    color: Colors.danger,
  },
};

export function Button({
  title,
  variant = 'primary',
  icon,
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const style = styles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-[14px] px-4 active:opacity-80 ${style.container} ${isDisabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={style.color} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={style.color} /> : null}
          <Text className={`text-base ${style.label}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
