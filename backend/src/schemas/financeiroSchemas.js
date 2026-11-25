import { z } from 'zod';

function dataExiste(valor) {
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

export const dataIso = (rotulo) =>
  z
    .string({ required_error: `${rotulo} é obrigatória`, invalid_type_error: `${rotulo} deve ser texto` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${rotulo} deve estar no formato AAAA-MM-DD`)
    .refine(dataExiste, `${rotulo} inexistente`);

/** Período fechado [de, ate] em datas "AAAA-MM-DD"; ambos opcionais (omitido = sem limite). */
export const periodoQuery = {
  de: dataIso('Data inicial (de)').optional(),
  ate: dataIso('Data final (ate)').optional(),
};

// Strings "AAAA-MM-DD" comparam corretamente em ordem lexicográfica
export const periodoValido = ({ de, ate }) => !de || !ate || de <= ate;

export const MENSAGEM_PERIODO = 'Período inválido: "de" deve ser anterior ou igual a "ate"';

export const periodoQuerySchema = z
  .object(periodoQuery)
  .refine(periodoValido, { message: MENSAGEM_PERIODO, path: ['de'] });
