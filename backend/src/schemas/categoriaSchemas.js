import { z } from 'zod';

const nome = z
  .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser texto' })
  .trim()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(80, 'Nome deve ter no máximo 80 caracteres');

const ativa = z.boolean({
  required_error: 'Campo ativa é obrigatório',
  invalid_type_error: 'Campo ativa deve ser true ou false',
});

export const criarCategoriaSchema = z.object({ nome });

export const atualizarCategoriaSchema = z
  .object({ nome })
  .strict('Campo não permitido: altere apenas nome (ativa via PATCH /categorias/:id/ativa)');

export const alterarAtivaCategoriaSchema = z.object({ ativa });

export const listarCategoriasQuerySchema = z.object({
  ativa: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'Filtro ativa deve ser true ou false' }) })
    .transform((valor) => valor === 'true')
    .optional(),
});
