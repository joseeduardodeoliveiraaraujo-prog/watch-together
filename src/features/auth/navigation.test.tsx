import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

// Sessão simulada: cada teste define se há usuário logado.
let mockSession: { user: { id: string; email: string } } | null = null;

jest.mock('@/lib/supabase/client', () => {
  const profileQuery = {
    select: () => profileQuery,
    eq: () => profileQuery,
    maybeSingle: () =>
      Promise.resolve({
        data: { id: 'u1', display_name: 'Ana', created_at: '', updated_at: '' },
        error: null,
      }),
  };
  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: mockSession } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      },
      from: () => profileQuery,
    },
  };
});

describe('rotas protegidas', () => {
  it('sem login, abre a tela de entrar (e não "page could not be found")', async () => {
    mockSession = null;
    await renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByText('Ainda não tem conta?')).toBeTruthy();
    expect(screen).toHavePathname('/sign-in');
  });

  it('sem login, o botão "Criar conta" abre o cadastro', async () => {
    mockSession = null;
    await renderRouter('./app', { initialUrl: '/' });
    await fireEvent.press(await screen.findByText('Criar conta'));
    expect(await screen.findByText('Apelido')).toBeTruthy();
    expect(screen).toHavePathname('/sign-up');
  });

  it('sem login, link de convite também vai para entrar', async () => {
    mockSession = null;
    await renderRouter('./app', { initialUrl: '/join/ABCDEF' });
    expect(await screen.findByText('Ainda não tem conta?')).toBeTruthy();
  });

  it('com login, abre a home com o apelido', async () => {
    mockSession = { user: { id: 'u1', email: 'ana@exemplo.com' } };
    await renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByText('Olá, Ana!')).toBeTruthy();
    expect(screen).toHavePathname('/');
  });

  it('com login, a tela de entrar redireciona para a home', async () => {
    mockSession = { user: { id: 'u1', email: 'ana@exemplo.com' } };
    await renderRouter('./app', { initialUrl: '/sign-in' });
    expect(await screen.findByText('Olá, Ana!')).toBeTruthy();
  });
});
