import { Image } from 'expo-image';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

import { Icon, type IconName } from './Icon';

/**
 * Diálogos com o visual do app, no lugar do `Alert` nativo (que no Android sai com o tema claro
 * do sistema). Use pelo hook `useDialog()`:
 *  - `sheet`: menu de ações que sobe da base (ex.: opções de um vídeo da fila);
 *  - `confirm`: pergunta com Cancelar / confirmar, no centro;
 *  - `toast`: aviso curto no rodapé que some sozinho (ex.: "Código copiado").
 */

export type SheetAction = {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
};

type SheetOptions = {
  title: string;
  subtitle?: string;
  /** Miniatura 16:9 ao lado do título (ex.: vídeo do YouTube). */
  thumbnail?: string;
  /** Aviso em destaque abaixo do título (ex.: "Este vídeo já está na fila"). */
  note?: string;
  actions: SheetAction[];
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

type ToastOptions = {
  message: string;
  icon?: IconName;
  /** `error`: ícone vermelho (ex.: falha ao adicionar). */
  tone?: 'success' | 'error';
};

type DialogApi = {
  sheet: (options: SheetOptions) => void;
  confirm: (options: ConfirmOptions) => void;
  toast: (options: ToastOptions) => void;
};

type Current =
  { kind: 'sheet'; options: SheetOptions } | { kind: 'confirm'; options: ConfirmOptions };

const TOAST_MS = 2400;

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = use(DialogContext);
  if (!api) throw new Error('useDialog precisa estar dentro de <DialogProvider>.');
  return api;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const [api] = useState<DialogApi>(() => ({
    sheet: (options) => setCurrent({ kind: 'sheet', options }),
    confirm: (options) => setCurrent({ kind: 'confirm', options }),
    toast: (options) => setToast({ ...options, key: Date.now() }),
  }));

  const close = () => setCurrent(null);
  /** Fecha primeiro e só então executa (a ação pode abrir outro diálogo). */
  const closeThen = (action: () => void) => () => {
    setCurrent(null);
    action();
  };

  return (
    <DialogContext value={api}>
      <View className="flex-1">
        {children}
        {toast ? (
          <Toast key={toast.key} message={toast.message} icon={toast.icon} tone={toast.tone} />
        ) : null}
      </View>

      <Modal
        visible={current?.kind === 'sheet'}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={close}
      >
        {current?.kind === 'sheet' ? (
          <Sheet options={current.options} onClose={close} closeThen={closeThen} />
        ) : null}
      </Modal>

      <Modal
        visible={current?.kind === 'confirm'}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={close}
      >
        {current?.kind === 'confirm' ? (
          <Confirm options={current.options} onClose={close} closeThen={closeThen} />
        ) : null}
      </Modal>
    </DialogContext>
  );
}

type PartProps<T> = {
  options: T;
  onClose: () => void;
  closeThen: (action: () => void) => () => void;
};

function Sheet({ options, onClose, closeThen }: PartProps<SheetOptions>) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 justify-end">
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        className="absolute inset-0 bg-black/60"
      />
      <View
        className="gap-1 rounded-t-[24px] border-x border-t border-border bg-surface px-4 pt-2.5"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
        accessibilityViewIsModal
      >
        <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
        <View className="flex-row items-center gap-3 px-2 pb-3">
          {options.thumbnail ? (
            <Image
              source={{ uri: options.thumbnail }}
              style={{
                width: 112,
                height: 63,
                borderRadius: 10,
                backgroundColor: Colors['surface-raised'],
              }}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <View className="flex-1 gap-1">
            <Text
              accessibilityRole="header"
              className="font-bold text-base leading-5 text-text"
              numberOfLines={options.thumbnail ? 3 : 2}
            >
              {options.title}
            </Text>
            {options.subtitle ? (
              <Text className="font-sans text-[13px] text-muted" numberOfLines={1}>
                {options.subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {options.note ? (
          <View className="mx-2 mb-2 flex-row items-center gap-2 rounded-xl bg-primary/15 px-3 py-2">
            <Icon name="info" size={14} color={Colors.accent} />
            <Text className="flex-1 font-semibold text-xs text-accent-text">{options.note}</Text>
          </View>
        ) : null}

        {options.actions.map((action) => {
          const color = action.destructive ? Colors.danger : Colors.text;
          return (
            <Pressable
              key={action.label}
              onPress={closeThen(action.onPress)}
              accessibilityRole="button"
              className="h-[52px] flex-row items-center gap-3.5 rounded-[14px] px-3 active:bg-surface-raised"
            >
              {action.icon ? (
                <View
                  className={`h-9 w-9 items-center justify-center rounded-full ${action.destructive ? 'bg-danger/10' : 'bg-primary/15'}`}
                >
                  <Icon
                    name={action.icon}
                    size={17}
                    color={action.destructive ? Colors.danger : Colors.accent}
                  />
                </View>
              ) : null}
              <Text className="flex-1 font-semibold text-[15px]" style={{ color }}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          className="mt-2 h-[52px] items-center justify-center rounded-[14px] border border-border bg-surface-raised active:opacity-80"
        >
          <Text className="font-semibold text-base text-text">Cancelar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Confirm({ options, onClose, closeThen }: PartProps<ConfirmOptions>) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cancelar"
        className="absolute inset-0 bg-black/60"
      />
      <View
        className="w-full max-w-[360px] gap-2 rounded-[22px] border border-border bg-surface p-5"
        accessibilityViewIsModal
      >
        <Text accessibilityRole="header" className="font-bold text-[17px] text-text">
          {options.title}
        </Text>
        {options.message ? (
          <Text className="font-sans text-sm leading-5 text-muted">{options.message}</Text>
        ) : null}
        <View className="mt-3 flex-row gap-2.5">
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            className="h-12 flex-1 items-center justify-center rounded-[14px] border border-border bg-surface-raised active:opacity-80"
          >
            <Text className="font-semibold text-[15px] text-text">Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={closeThen(options.onConfirm)}
            accessibilityRole="button"
            className={`h-12 flex-1 items-center justify-center rounded-[14px] active:opacity-80 ${options.destructive ? 'bg-danger' : 'bg-primary'}`}
          >
            <Text className="font-bold text-[15px] text-white">{options.confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Toast({ message, icon, tone = 'success' }: ToastOptions) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      className="absolute left-0 right-0 items-center px-6"
      style={{ bottom: insets.bottom + 24 }}
    >
      <View
        accessibilityLiveRegion="polite"
        className="flex-row items-center gap-2.5 rounded-full border border-border bg-surface-raised px-4 py-3"
        style={{ boxShadow: '0px 8px 24px #00000080' }}
      >
        <Icon
          name={icon ?? (tone === 'error' ? 'alert-circle' : 'check-circle')}
          size={17}
          color={tone === 'error' ? Colors.danger : Colors.success}
        />
        <Text className="shrink font-semibold text-sm text-text">{message}</Text>
      </View>
    </View>
  );
}
