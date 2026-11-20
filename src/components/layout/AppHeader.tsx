import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';

type AppHeaderProps = {
  /** Texto simples ou conteúdo próprio (ex.: código da sala + quem está online). */
  title: ReactNode;
  right?: ReactNode;
};

/** Cabeçalho das telas internas: voltar, título e ação à direita. */
export function AppHeader({ title, right }: AppHeaderProps) {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View className="h-[52px] flex-row items-center justify-between px-3">
      <View className="flex-1 flex-row items-center gap-1.5">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-raised"
        >
          <Icon name="chevron-left" size={24} />
        </Pressable>
        {typeof title === 'string' ? (
          <Text className="font-bold text-[17px] text-text" accessibilityRole="header">
            {title}
          </Text>
        ) : (
          title
        )}
      </View>
      {right}
    </View>
  );
}
