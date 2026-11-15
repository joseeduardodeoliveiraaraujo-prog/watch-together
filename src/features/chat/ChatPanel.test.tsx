import { render, screen } from '@testing-library/react-native';

import { ChatPanel } from './ChatPanel';

describe('ChatPanel', () => {
  it('chat vazio mostra o aviso sem nenhuma inversão (sem scaleY)', async () => {
    await render(<ChatPanel entries={[]} userId="u1" error={null} onSend={async () => true} />);
    expect(screen.getByText(/Nenhuma mensagem ainda/)).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain('scaleY');
  });

  it('mostra mensagens com o nome de quem enviou', async () => {
    await render(
      <ChatPanel
        entries={[
          {
            kind: 'user',
            id: 'm1',
            clientId: null,
            userId: 'u2',
            displayName: 'Beto',
            text: 'oi!',
            sentAt: 0,
            pending: false,
          },
          { kind: 'system', id: 'n1', text: 'Beto entrou', sentAt: 0 },
        ]}
        userId="u1"
        error={null}
        onSend={async () => true}
      />,
    );
    expect(screen.getByText('oi!')).toBeTruthy();
    expect(screen.getByText('Beto')).toBeTruthy();
    expect(screen.getByText('Beto entrou')).toBeTruthy();
    expect(screen.queryByText(/Nenhuma mensagem ainda/)).toBeNull();
  });
});
