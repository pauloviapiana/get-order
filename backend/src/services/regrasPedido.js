/**
 * Fluxo de status do pedido (FASE0_REGRAS.md §4) e quem pode aplicar cada transição.
 */

/** Só nesse status os itens do pedido podem mudar. */
export const STATUS_EDITAVEL = 'aberto';

/** Garçom só pode ser (re)atribuído antes do status terminal. */
export const STATUS_TERMINAIS = ['pago', 'cancelado'];

/** Transições permitidas e os perfis autorizados em cada uma. Terminais não aparecem. */
export const TRANSICOES = {
  aberto: {
    em_preparo: ['admin', 'funcionario'],
    cancelado: ['admin', 'funcionario', 'cliente'],
  },
  em_preparo: {
    pronto: ['admin', 'funcionario'],
    cancelado: ['admin', 'funcionario'],
  },
  pronto: {
    entregue: ['admin', 'funcionario'],
    cancelado: ['admin', 'funcionario'],
  },
  entregue: {
    pago: ['admin', 'funcionario', 'cliente'],
    // Cancelamento excepcional (já consumido): só admin, sem comissão
    cancelado: ['admin'],
  },
  pago: {},
  cancelado: {},
};

/** Destinos que o cliente nunca aplica (fluxo cozinha/salão). */
export const STATUS_SO_EQUIPE = ['em_preparo', 'pronto', 'entregue'];

/** Reserva só aceita compra antecipada enquanto ainda vai acontecer. */
export const STATUS_RESERVA_VINCULAVEL = ['pendente', 'confirmada'];

/** Teto por linha do pedido (também após somar repetições do mesmo item). */
export const QUANTIDADE_MAXIMA = 100;
