import { describeRoomError, ROOM_GENERIC_ERROR, ROOM_NETWORK_ERROR } from './roomErrors';

describe('describeRoomError', () => {
  it('traduz os erros das funções de sala', () => {
    expect(describeRoomError({ message: 'room_full', code: 'P0001' })).toMatch(/cheia/);
    expect(describeRoomError({ message: 'room_not_found', code: 'P0001' })).toMatch(
      /não encontrada/,
    );
    expect(describeRoomError({ message: 'too_many_rooms', code: 'P0001' })).toMatch(/20 salas/);
  });

  it('reconhece falha de rede', () => {
    expect(describeRoomError(new TypeError('Network request failed'))).toBe(ROOM_NETWORK_ERROR);
    expect(describeRoomError({ message: 'TypeError: fetch failed' })).toBe(ROOM_NETWORK_ERROR);
  });

  it('usa mensagem genérica para o resto', () => {
    expect(describeRoomError({ message: 'duplicate key', code: '23505' })).toBe(ROOM_GENERIC_ERROR);
    expect(describeRoomError(null)).toBe(ROOM_GENERIC_ERROR);
  });
});
