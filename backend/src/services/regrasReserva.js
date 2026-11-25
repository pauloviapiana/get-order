/**
 * Regras fixas de agenda (FASE0_REGRAS.md §§1–3), compartilhadas por
 * reservaService (criar/editar) e mesaService (disponibilidade).
 */
import { HttpErro } from '../utils/HttpErro.js';

export const FUSO = 'America/Sao_Paulo';

export const HORARIOS_RESERVA = [
  '18:00', '18:30', '19:00', '19:30', '20:00',
  '20:30', '21:00', '21:30', '22:00', '22:30',
];

// getUTCDay(): 0 = domingo, 5 = sexta, 6 = sábado
const DIAS_COM_RESERVA = [5, 6, 0];

/** Status que ocupam a mesa no slot; cancelada/concluida liberam. */
export const STATUS_QUE_BLOQUEIAM = ['pendente', 'confirmada'];

export const STATUS_EDITAVEIS = ['pendente', 'confirmada'];

/** Transições permitidas (§3). Terminais têm lista vazia. */
export const TRANSICOES = {
  pendente: ['confirmada', 'cancelada'],
  confirmada: ['cancelada', 'concluida'],
  cancelada: [],
  concluida: [],
};

/** Destinos que só funcionario/admin podem aplicar. */
export const STATUS_SO_EQUIPE = ['confirmada', 'concluida'];

/** Data ("AAAA-MM-DD") e hora ("HH:MM") atuais no fuso do restaurante. */
export function agoraNoRestaurante() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value])
  );

  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    horario: `${partes.hour}:${partes.minute}`,
  };
}

// Data sem hora: o dia da semana não depende de fuso
function diaDaSemana(data) {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

/** Lança 400 se o slot não for sex/sáb/dom, fora da lista fixa ou já passado. */
export function validarDataHorario(data, horario) {
  if (!DIAS_COM_RESERVA.includes(diaDaSemana(data))) {
    throw new HttpErro(400, 'Reservas só são aceitas às sextas, sábados e domingos');
  }

  if (!HORARIOS_RESERVA.includes(horario)) {
    throw new HttpErro(400, `Horário inválido. Use um destes: ${HORARIOS_RESERVA.join(', ')}`);
  }

  const agora = agoraNoRestaurante();

  // Strings no formato "AAAA-MM-DD HH:MM" comparam corretamente em ordem lexicográfica
  if (`${data} ${horario}` <= `${agora.data} ${agora.horario}`) {
    throw new HttpErro(400, 'Não é possível reservar data/horário que já passou');
  }
}
