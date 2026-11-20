import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { Glow, LogoMark } from '@/components/ui/Decor';

type AuthScaffoldProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerQuestion: string;
  footerAction: string;
  onFooterPress: () => void;
};

/** Moldura das telas de entrar e criar conta: marca, formulário e link no rodapé. */
export function AuthScaffold({
  title,
  subtitle,
  children,
  footerQuestion,
  footerAction,
  onFooterPress,
}: AuthScaffoldProps) {
  return (
    <FormScreen
      contentClassName="gap-9 px-6 pb-8 pt-10"
      background={<Glow style={{ top: -120, left: -60, width: 510, height: 420 }} />}
    >
      <View className="gap-5">
        <LogoMark />
        <View className="gap-2">
          <Text
            accessibilityRole="header"
            className="font-extrabold text-[32px] leading-[37px] tracking-[-0.8px] text-text"
          >
            {title}
          </Text>
          <Text className="font-sans text-[15px] leading-[22px] text-muted">{subtitle}</Text>
        </View>
      </View>

      <View className="gap-4">{children}</View>

      <View className="flex-1" />

      <View className="flex-row flex-wrap justify-center gap-1.5">
        <Text className="font-sans text-[15px] text-muted">{footerQuestion}</Text>
        <Pressable onPress={onFooterPress} accessibilityRole="link" hitSlop={10}>
          <Text className="font-bold text-[15px] text-primary">{footerAction}</Text>
        </Pressable>
      </View>
    </FormScreen>
  );
}
