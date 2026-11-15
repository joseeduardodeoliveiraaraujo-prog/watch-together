import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function TextField({ label, error, ...rest }: TextFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-text">{label}</Text>
      <TextInput
        placeholderTextColor={Colors.muted}
        accessibilityLabel={label}
        className={`h-12 rounded-xl border bg-surface px-3 text-base text-text ${error ? 'border-danger' : 'border-border'}`}
        {...rest}
      />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
