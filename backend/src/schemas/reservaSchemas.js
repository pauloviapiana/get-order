import { z } from 'zod';
import { STATUS_RESERVA } from '../models/Reserva.js';

// Formato apenas; dia da semana, slot fixo e passado são regras do reservaService
function dataExiste(valor) {
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

export const dataReserva = z
  .string({ required_error: 'Data é obrigatória', invalid_type_error: 'Data deve ser texto' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .refine(dataExiste, 'Data inexistente');

export const horario = z
  .string({ required_error: 'Horário é obrigatório', invalid_type_error: 'Horário deve ser texto' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário deve estar no formato HH:MM');

const idPositivo = (rotulo) =>
  z
    .number({
      required_error: `${rotulo} é obrigatório`,
      invalid_type_error: `${rotulo} deve ser um número`,
    })
    .int(`${rotulo} inválido`)
    .positive(`${rotulo} inválido`);

const mesaId = idPositivo('mesaId');

const quantidadePessoas = z
  .number({
    required_error: 'Quantidade de pessoas é obrigatória',
    invalid_type_error: 'Quantidade de pessoas deve ser um número',
  })
  .int('Quantidade de pessoas deve ser inteira')
  .positive('Quantidade de pessoas deve ser ao menos 1');

// Vazio vira null para permitir "apagar" as observações
const observacoes = z
  .string({ invalid_type_error: 'Observações devem ser texto' })
  .trim()
  .max(500, 'Observações devem ter no máximo 500 caracteres')
  .nullable()
  .optional()
  .transform((valor) => (valor === '' ? null : valor));

const status = z.enum(STATUS_RESERVA, {
  errorMap: () => ({ message: `Status deve ser um de: ${STATUS_RESERVA.join(', ')}` }),
});

const peloMenosUmCampo = (dados) => Object.keys(dados).length > 0;

// `clienteId` só é usado quando quem cria é funcionario/admin; para cliente vale o próprio id
export const criarReservaSchema = z.object({
  mesaId,
  data_reserva: dataReserva,
  horario,
  quantidade_pessoas: quantidadePessoas,
  observacoes,
  clienteId: idPositivo('clienteId').optional(),
});

export const atualizarReservaSchema = z
  .object({
    mesaId: mesaId.optional(),
    data_reserva: dataReserva.optional(),
    horario: horario.optional(),
    quantidade_pessoas: quantidadePessoas.optional(),
    observacoes,
  })
  .strict(
    'Campo não permitido: altere mesaId, data_reserva, horario, quantidade_pessoas ou observacoes (status via PATCH /reservas/:id/status)'
  )
  .refine(peloMenosUmCampo, 'Informe ao menos um campo para atualizar');

export const alterarStatusReservaSchema = z.object({ status });

export const listarReservasQuerySchema = z.object({
  data: dataReserva.optional(),
  status: status.optional(),
  mesaId: z.coerce.number({ invalid_type_error: 'mesaId inválido' }).int().positive().optional(),
  cliente: z.string().trim().min(1).max(120).optional(),
});
