import { z } from 'zod';

const categoriaId = z
  .number({
    required_error: 'Categoria é obrigatória',
    invalid_type_error: 'categoriaId deve ser um número',
  })
  .int('categoriaId inválido')
  .positive('categoriaId inválido');

const nome = z
  .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser texto' })
  .trim()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(120, 'Nome deve ter no máximo 120 caracteres');

// Vazio vira null para permitir "apagar" a descrição
const descricao = z
  .string({ invalid_type_error: 'Descrição deve ser texto' })
  .trim()
  .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
  .nullable()
  .optional()
  .transform((valor) => (valor === '' ? null : valor));

// DECIMAL(10,2): até 99.999.999,99 e no máximo 2 casas decimais
const preco = z
  .number({ required_error: 'Preço é obrigatório', invalid_type_error: 'Preço deve ser um número' })
  .nonnegative('Preço não pode ser negativo')
  .max(99999999.99, 'Preço muito alto')
  .refine((valor) => /^\d+(\.\d{1,2})?$/.test(String(valor)), 'Preço deve ter no máximo 2 casas decimais');

const disponivel = z.boolean({
  required_error: 'Campo disponivel é obrigatório',
  invalid_type_error: 'Campo disponivel deve ser true ou false',
});

const filtroBooleano = (mensagem) =>
  z
    .enum(['true', 'false'], { errorMap: () => ({ message: mensagem }) })
    .transform((valor) => valor === 'true')
    .optional();

const peloMenosUmCampo = (dados) => Object.keys(dados).length > 0;

export const criarItemSchema = z.object({
  categoriaId,
  nome,
  descricao,
  preco,
  disponivel: disponivel.optional(),
});

export const atualizarItemSchema = z
  .object({
    categoriaId: categoriaId.optional(),
    nome: nome.optional(),
    descricao,
    preco: preco.optional(),
  })
  .strict(
    'Campo não permitido: altere categoriaId, nome, descricao ou preco (disponivel via PATCH /itens-menu/:id/disponivel)'
  )
  .refine(peloMenosUmCampo, 'Informe ao menos um campo para atualizar');

export const alterarDisponivelSchema = z.object({ disponivel });

export const listarItensQuerySchema = z.object({
  disponivel: filtroBooleano('Filtro disponivel deve ser true ou false'),
  categoriaId: z.coerce
    .number({ invalid_type_error: 'Filtro categoriaId inválido' })
    .int('Filtro categoriaId inválido')
    .positive('Filtro categoriaId inválido')
    .optional(),
});
