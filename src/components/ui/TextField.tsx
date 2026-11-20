import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/theme';

import { Icon, type IconName } from './Icon';

type TextFieldProps = TextInputProps & {
  label: string;
  icon?: IconName;
  error?: string | null;
};

export function TextField({ label, icon, error, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const border = error ? 'border-danger' : focused ? 'border-primary' : 'border-border';

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
        />
      </View>
      {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
