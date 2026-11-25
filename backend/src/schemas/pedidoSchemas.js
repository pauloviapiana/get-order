import { z } from 'zod';
import { STATUS_PEDIDO } from '../models/Pedido.js';
import { QUANTIDADE_MAXIMA } from '../services/regrasPedido.js';

const idPositivo = (rotulo) =>
  z
    .number({
      required_error: `${rotulo} é obrigatório`,
      invalid_type_error: `${rotulo} deve ser um número`,
    })
    .int(`${rotulo} inválido`)
    .positive(`${rotulo} inválido`);

const filtroId = (rotulo) =>
  z.coerce
    .number({ invalid_type_error: `Filtro ${rotulo} inválido` })
    .int(`Filtro ${rotulo} inválido`)
    .positive(`Filtro ${rotulo} inválido`)
    .optional();

const quantidade = z
  .number({ required_error: 'Quantidade é obrigatória', invalid_type_error: 'Quantidade deve ser um número' })
  .int('Quantidade deve ser inteira')
  .positive('Quantidade deve ser ao menos 1')
  .max(QUANTIDADE_MAXIMA, `Quantidade deve ser no máximo ${QUANTIDADE_MAXIMA}`);

const itemDoPedido = z.object({
  itemMenuId: idPositivo('itemMenuId'),
  quantidade,
});

const status = z.enum(STATUS_PEDIDO, {
  errorMap: () => ({ message: `Status deve ser um de: ${STATUS_PEDIDO.join(', ')}` }),
});

// `clienteId` só é usado quando quem cria é funcionario/admin; para cliente vale o próprio id
export const criarPedidoSchema = z.object({
  clienteId: idPositivo('clienteId').optional(),
  reservaId: idPositivo('reservaId').nullable().optional(),
  itens: z
    .array(itemDoPedido, {
      required_error: 'Informe os itens do pedido',
      invalid_type_error: 'itens deve ser uma lista',
    })
    .min(1, 'O pedido precisa de ao menos 1 item')
    .max(50, 'O pedido aceita no máximo 50 itens por vez'),
});

export const adicionarItemSchema = itemDoPedido.strict('Campo não permitido: informe itemMenuId e quantidade');

export const alterarQuantidadeSchema = z
  .object({ quantidade })
  .strict('Campo não permitido: informe apenas quantidade (para remover, use DELETE)');

export const atribuirGarcomSchema = z.object({ garcomId: idPositivo('garcomId') });

export const alterarStatusPedidoSchema = z.object({ status });

export const listarPedidosQuerySchema = z.object({
  status: status.optional(),
  clienteId: filtroId('clienteId'),
  reservaId: filtroId('reservaId'),
});
