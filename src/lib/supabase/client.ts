// Fornece o `localStorage` global (via SQLite) onde o Supabase guarda a sessão entre aberturas.
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { addPictureInPictureListener, isInPictureInPicture } from '@/modules/pip';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/constants/config';

import type { Database } from './database.types';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
      'no .env.local e reinicie com `npx expo start -c`.',
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No celular não existe URL de onde ler a sessão.
    detectSessionInUrl: false,
  },
});

// Renova o token só com o app na tela (recomendação do Supabase para mobile). A janelinha
// (picture in picture) conta como na tela: o Android a trata como segundo plano, mas a sala
// continua aberta e sincronizando.
const updateAutoRefresh = () => {
  if (AppState.currentState === 'active' || isInPictureInPicture()) {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
};
AppState.addEventListener('change', updateAutoRefresh);
addPictureInPictureListener(updateAutoRefresh);
