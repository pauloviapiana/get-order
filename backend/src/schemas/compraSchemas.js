import { z } from 'zod';
import { dataIso, MENSAGEM_PERIODO, periodoQuery, periodoValido } from './financeiroSchemas.js';

const descricao = z
  .string({ required_error: 'Descrição é obrigatória', invalid_type_error: 'Descrição deve ser texto' })
  .trim()
  .min(2, 'Descrição deve ter ao menos 2 caracteres')
  .max(255, 'Descrição deve ter no máximo 255 caracteres');

// DECIMAL(10,2): até 99.999.999,99 e no máximo 2 casas decimais
const valor = z
  .number({ required_error: 'Valor é obrigatório', invalid_type_error: 'Valor deve ser um número' })
  .nonnegative('Valor não pode ser negativo')
  .max(99999999.99, 'Valor muito alto')
  .refine((numero) => /^\d+(\.\d{1,2})?$/.test(String(numero)), 'Valor deve ter no máximo 2 casas decimais');

const dataCompra = dataIso('Data da compra');

// Vazio vira null para permitir "apagar" o fornecedor
const fornecedor = z
  .string({ invalid_type_error: 'Fornecedor deve ser texto' })
  .trim()
  .max(120, 'Fornecedor deve ter no máximo 120 caracteres')
  .nullable()
  .optional()
  .transform((texto) => (texto === '' ? null : texto));

const peloMenosUmCampo = (dados) => Object.keys(dados).length > 0;

// `registradoPorId` do corpo é descartado: vale sempre o admin autenticado
export const criarCompraSchema = z.object({
  descricao,
  valor,
  data_compra: dataCompra,
  fornecedor,
});

export const atualizarCompraSchema = z
  .object({
    descricao: descricao.optional(),
    valor: valor.optional(),
    data_compra: dataCompra.optional(),
    fornecedor,
  })
  .strict('Campo não permitido: altere descricao, valor, data_compra ou fornecedor')
  .refine(peloMenosUmCampo, 'Informe ao menos um campo para atualizar');

export const listarComprasQuerySchema = z
  .object({
    ...periodoQuery,
    q: z.string().trim().min(1, 'Busca vazia').max(120, 'Busca deve ter no máximo 120 caracteres').optional(),
  })
  .refine(periodoValido, { message: MENSAGEM_PERIODO, path: ['de'] });
