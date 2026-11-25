import { z } from 'zod';
import { dataReserva, horario } from './reservaSchemas.js';

const identificacao = z
  .string({
    required_error: 'Identificação é obrigatória',
    invalid_type_error: 'Identificação deve ser texto',
  })
  .trim()
  .min(1, 'Identificação é obrigatória')
  .max(40, 'Identificação deve ter no máximo 40 caracteres');

const capacidade = z
  .number({
    required_error: 'Capacidade é obrigatória',
    invalid_type_error: 'Capacidade deve ser um número',
  })
  .int('Capacidade deve ser inteira')
  .positive('Capacidade deve ser maior que zero');

const ativa = z.boolean({
  required_error: 'Campo ativa é obrigatório',
  invalid_type_error: 'Campo ativa deve ser true ou false',
});

const peloMenosUmCampo = (dados) => Object.keys(dados).length > 0;

export const criarMesaSchema = z.object({ identificacao, capacidade });

export const atualizarMesaSchema = z
  .object({
    identificacao: identificacao.optional(),
    capacidade: capacidade.optional(),
  })
  .strict('Campo não permitido: altere identificacao ou capacidade (ativa via PATCH /mesas/:id/ativa)')
  .refine(peloMenosUmCampo, 'Informe ao menos um campo para atualizar');

export const alterarAtivaSchema = z.object({ ativa });

export const listarMesasQuerySchema = z.object({
  ativa: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'Filtro ativa deve ser true ou false' }) })
    .transform((valor) => valor === 'true')
    .optional(),
});

export const disponibilidadeQuerySchema = z.object({
  data: dataReserva,
  horario,
  pessoas: z.coerce
    .number({ invalid_type_error: 'Pessoas deve ser um número' })
    .int('Pessoas deve ser inteiro')
    .positive('Pessoas deve ser ao menos 1')
    .optional(),
});
