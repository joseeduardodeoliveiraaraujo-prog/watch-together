import {
  addEntry,
  MAX_MESSAGES_KEPT,
  parseChatPayload,
  recentSends,
  removeEntry,
  validateMessage,
  type ChatEntry,
  type UserMessage,
} from './chatMessages';

const ID = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const CLIENT = '33333333-3333-4333-8333-333333333333';

const payload = {
  id: ID,
  client_id: CLIENT,
  user_id: USER,
  display_name: 'Ana',
  text: 'oi!',
  sent_at: '2026-11-15T12:00:00Z',
};

describe('parseChatPayload', () => {
  it('lê uma mensagem válida', () => {
    expect(parseChatPayload(payload)).toEqual({
      kind: 'user',
      id: ID,
      clientId: CLIENT,
      userId: USER,
      displayName: 'Ana',
      text: 'oi!',
      sentAt: Date.parse('2026-11-15T12:00:00Z'),
      pending: false,
    });
  });

  it('recusa mensagens malformadas', () => {
    expect(parseChatPayload(null)).toBeNull();
    expect(parseChatPayload({ ...payload, id: 'x' })).toBeNull();
    expect(parseChatPayload({ ...payload, user_id: 1 })).toBeNull();
    expect(parseChatPayload({ ...payload, text: '   ' })).toBeNull();
  });

  it('nome ausente vira "Participante"', () => {
    expect(parseChatPayload({ ...payload, display_name: '' })?.displayName).toBe('Participante');
  });
});

describe('addEntry', () => {
  const msg = parseChatPayload(payload) as UserMessage;
  const pending: UserMessage = { ...msg, id: CLIENT, pending: true };

  it('coloca a mais nova primeiro e ignora duplicadas', () => {
    const notice: ChatEntry = { kind: 'system', id: 'n1', text: 'Ana entrou', sentAt: 1 };
    const list = addEntry([notice], msg);
    expect(list.map((e) => e.id)).toEqual([ID, 'n1']);
    expect(addEntry(list, msg)).toHaveLength(2);
  });

  it('a confirmação do servidor substitui a mensagem "enviando"', () => {
    const list = addEntry([], pending);
    const confirmed = addEntry(list, msg);
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]).toMatchObject({ id: ID, pending: false });
  });

  it(`guarda no máximo ${MAX_MESSAGES_KEPT}`, () => {
    let list: ChatEntry[] = [];
    for (let i = 0; i < MAX_MESSAGES_KEPT + 10; i++) {
      list = addEntry(list, { kind: 'system', id: `n${i}`, text: 'x', sentAt: i });
    }
    expect(list).toHaveLength(MAX_MESSAGES_KEPT);
    expect(list[0].id).toBe(`n${MAX_MESSAGES_KEPT + 9}`);
  });

  it('remove por id', () => {
    expect(removeEntry(addEntry([], pending), CLIENT)).toEqual([]);
  });
});

describe('anti-spam e validação', () => {
  it('conta só os envios dos últimos 5 s', () => {
    expect(recentSends([0, 1000, 4000, 6000], 6500)).toEqual([4000, 6000]);
  });

  it('valida a mensagem', () => {
    expect(validateMessage('  ')).toBe('Digite uma mensagem.');
    expect(validateMessage('a'.repeat(501))).toMatch(/500/);
    expect(validateMessage(' oi ')).toBeNull();
  });
});
