import { describeRpcError, RPC_GENERIC_ERROR, RPC_NETWORK_ERROR } from './rpcErrors';

describe('describeRpcError', () => {
  it('traduz os erros das funções de sala', () => {
    expect(describeRpcError({ message: 'room_full', code: 'P0001' })).toMatch(/cheia/);
    expect(describeRpcError({ message: 'room_not_found', code: 'P0001' })).toMatch(
      /não encontrada/,
    );
    expect(describeRpcError({ message: 'too_many_rooms', code: 'P0001' })).toMatch(/20 salas/);
  });

  it('reconhece falha de rede', () => {
    expect(describeRpcError(new TypeError('Network request failed'))).toBe(RPC_NETWORK_ERROR);
    expect(describeRpcError({ message: 'TypeError: fetch failed' })).toBe(RPC_NETWORK_ERROR);
  });

  it('usa mensagem genérica para o resto', () => {
    expect(describeRpcError({ message: 'duplicate key', code: '23505' })).toBe(RPC_GENERIC_ERROR);
    expect(describeRpcError(null)).toBe(RPC_GENERIC_ERROR);
  });
});
