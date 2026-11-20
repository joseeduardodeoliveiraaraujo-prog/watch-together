import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Colors } from '@/constants/theme';
import type { CaptionSelection, CaptionTrack } from '@/lib/youtube/bridge';

import type { CaptionsState } from './useCaptions';

type CaptionsSheetProps = {
  captions: CaptionsState;
  onSelect: (selection: CaptionSelection | null) => void;
  onClose: () => void;
};

/**
 * Seletor de legendas da tela cheia, como a engrenagem do YouTube: faixas do vídeo (manuais e
 * geradas automaticamente) e, numa segunda tela, a tradução automática para outro idioma.
 */
export function CaptionsSheet({ captions, onSelect, onClose }: CaptionsSheetProps) {
  const [view, setView] = useState<'tracks' | 'translate'>('tracks');
  const { tracks, translations, active } = captions;
  const activeTrack = active ? tracks.find((t) => t.id === active.id) : undefined;
  const translatedTo = active?.translateTo
    ? translations.find((l) => l.code === active.translateTo)
    : undefined;
  /** Faixa que será traduzida: a ativa, senão a primeira manual, senão a primeira. */
  const source = activeTrack ?? tracks.find((t) => !t.auto) ?? tracks[0];
  const canTranslate = !!source && translations.length > 0;

  return (
    <View className="absolute inset-0 items-end justify-center">
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar legendas"
        className="absolute inset-0 bg-black/50"
      />
      <View className="mr-10 max-h-[88%] w-[320px] overflow-hidden rounded-[18px] border border-border bg-surface">
        <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
          {view === 'translate' ? (
            <Pressable
              onPress={() => setView('tracks')}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={8}
              className="active:opacity-70"
            >
              <Icon name="chevron-left" size={20} color={Colors.text} />
            </Pressable>
          ) : null}
          <Text accessibilityRole="header" className="flex-1 font-bold text-[15px] text-text">
            {view === 'tracks' ? 'Legendas' : 'Traduzir automaticamente'}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={8}
            className="active:opacity-70"
          >
            <Icon name="x" size={18} color={Colors.muted} />
          </Pressable>
        </View>

        {view === 'tracks' ? (
          <ScrollView contentContainerClassName="py-1.5">
            <Option label="Desativadas" selected={active === null} onPress={() => onSelect(null)} />
            {tracks.map((track) => (
              <Option
                key={track.id}
                label={track.label}
                sub={autoLabel(track)}
                selected={active?.id === track.id && !active.translateTo}
                onPress={() => onSelect({ id: track.id, translateTo: null })}
              />
            ))}
            {translatedTo && activeTrack ? (
              <Option
                label={`${translatedTo.label} (tradução automática)`}
                sub={`Traduzida de ${activeTrack.label}`}
                selected
                onPress={onClose}
              />
            ) : null}
            {canTranslate ? (
              <Pressable
                onPress={() => setView('translate')}
                accessibilityRole="button"
                accessibilityHint="Abre a lista de idiomas"
                className="mt-1 flex-row items-center gap-3 border-t border-border px-4 py-3 active:bg-white/5"
              >
                <View className="w-5">
                  <Icon name="globe" size={17} color={Colors.muted} />
                </View>
                <Text className="flex-1 font-sans text-sm text-text">Traduzir automaticamente</Text>
                <Text className="font-sans text-xs text-muted" numberOfLines={1}>
                  {translatedTo?.label ?? ''}
                </Text>
                <Icon name="chevron-right" size={18} color={Colors.muted} />
              </Pressable>
            ) : null}
            {tracks.length === 0 ? (
              <Text className="px-4 pb-3 pt-1 font-sans text-xs text-muted">
                Este vídeo não tem legendas disponíveis.
              </Text>
            ) : null}
          </ScrollView>
        ) : source ? (
          <ScrollView contentContainerClassName="pb-1.5">
            <Text className="px-4 pb-1 pt-3 font-sans text-xs text-muted" numberOfLines={2}>
              Traduz a legenda {source.label}
            </Text>
            {sortTranslations(translations).map((language) => (
              <Option
                key={language.code}
                label={language.label}
                selected={active?.id === source.id && active.translateTo === language.code}
                onPress={() => onSelect({ id: source.id, translateTo: language.code })}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function Option({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-white/5"
    >
      <View className="w-5">
        {selected ? <Icon name="check" size={18} color={Colors.accent} /> : null}
      </View>
      <View className="flex-1 gap-0.5">
        <Text
          className={`text-sm ${selected ? 'font-semibold text-text' : 'font-sans text-muted'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {sub ? (
          <Text className="font-sans text-xs text-faint" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** O YouTube costuma pôr "(gerada automaticamente)" no nome; só indica quando não pôs. */
function autoLabel(track: CaptionTrack): string | null {
  return track.auto && !/auto/i.test(track.label) ? 'Gerada automaticamente' : null;
}

/** Português primeiro; o resto na ordem do YouTube. */
function sortTranslations<T extends { code: string }>(languages: T[]): T[] {
  const isPt = (code: string) => code === 'pt' || code.startsWith('pt-');
  return [...languages.filter((l) => isPt(l.code)), ...languages.filter((l) => !isPt(l.code))];
}
