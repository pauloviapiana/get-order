import { Op } from 'sequelize';
import { Mesa, Reserva, sequelize } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';
import { agoraNoRestaurante, STATUS_QUE_BLOQUEIAM, validarDataHorario } from './regrasReserva.js';

const PERFIS_VEEM_INATIVAS = ['admin', 'funcionario'];

const podeVerInativas = (solicitante) => PERFIS_VEEM_INATIVAS.includes(solicitante.perfil);

async function buscarOuFalhar(id, opcoes = {}) {
  const mesa = await Mesa.findByPk(id, opcoes);

  if (!mesa) {
    throw new HttpErro(404, 'Mesa não encontrada');
  }

  return mesa;
}

async function garantirIdentificacaoLivre(identificacao, idAtual = null) {
  const existente = await Mesa.findOne({ where: { identificacao } });

  if (existente && existente.id !== idAtual) {
    throw new HttpErro(409, 'Identificação de mesa já cadastrada');
  }
}

/** Reservas pendentes/confirmadas da mesa de hoje em diante. */
function reservasAtivasFuturas(mesaId, transaction, filtroExtra = {}) {
  return Reserva.findAll({
    where: {
      mesaId,
      status: { [Op.in]: STATUS_QUE_BLOQUEIAM },
      data_reserva: { [Op.gte]: agoraNoRestaurante().data },
      ...filtroExtra,
    },
    transaction,
  });
}

/** Admin/funcionario: todas (filtro opcional `ativa`). Cliente: só ativas. */
export async function listar(solicitante, { ativa } = {}) {
  const where = {};

  if (!podeVerInativas(solicitante)) {
    where.ativa = true;
  } else if (ativa !== undefined) {
    where.ativa = ativa;
  }

  return Mesa.findAll({ where, order: [['id', 'ASC']] });
}

export async function buscarPorId(solicitante, id) {
  const mesa = await buscarOuFalhar(id);

  // Para o cliente, mesa desativada "não existe"
  if (!mesa.ativa && !podeVerInativas(solicitante)) {
    throw new HttpErro(404, 'Mesa não encontrada');
  }

  return mesa;
}

export async function criar({ identificacao, capacidade }) {
  await garantirIdentificacaoLivre(identificacao);
  return Mesa.create({ identificacao, capacidade });
}

/**
 * Reduzir capacidade abaixo de uma reserva ativa futura deixaria essa reserva
 * inválida: bloqueia com 409 (reatribua ou cancele a reserva antes).
 */
export async function atualizar(id, dados) {
  return sequelize.transaction(async (transaction) => {
    const mesa = await buscarOuFalhar(id, { transaction, lock: transaction.LOCK.UPDATE });

    if (dados.identificacao) {
      await garantirIdentificacaoLivre(dados.identificacao, id);
    }

    if (dados.capacidade !== undefined && dados.capacidade < mesa.capacidade) {
      const excedentes = await reservasAtivasFuturas(id, transaction, {
        quantidade_pessoas: { [Op.gt]: dados.capacidade },
      });

      if (excedentes.length > 0) {
        throw new HttpErro(
          409,
          `Há ${excedentes.length} reserva(s) ativa(s) com mais de ${dados.capacidade} pessoas nesta mesa`
        );
      }
    }

    await mesa.update(dados, { transaction });
    return mesa;
  });
}

/** Desativar com reservas pendentes/confirmadas futuras → 409 (cancele antes). */
export async function alterarAtiva(id, ativa) {
  return sequelize.transaction(async (transaction) => {
    const mesa = await buscarOuFalhar(id, { transaction, lock: transaction.LOCK.UPDATE });

    if (!ativa) {
      const pendentes = await reservasAtivasFuturas(id, transaction);

      if (pendentes.length > 0) {
        throw new HttpErro(
          409,
          `Mesa possui ${pendentes.length} reserva(s) pendente(s)/confirmada(s) futura(s); cancele-as antes de desativar`
        );
      }
    }

    await mesa.update({ ativa }, { transaction });
    return mesa;
  });
}

/** Mesas ativas sem reserva pendente/confirmada no slot (e com lugares suficientes, se `pessoas`). */
export async function disponibilidade({ data, horario, pessoas }) {
  validarDataHorario(data, horario);

  const ocupadas = await Reserva.findAll({
    attributes: ['mesaId'],
    where: { data_reserva: data, horario, status: { [Op.in]: STATUS_QUE_BLOQUEIAM } },
  });

  const where = {
    ativa: true,
    id: { [Op.notIn]: ocupadas.map((r) => r.mesaId) },
  };

  if (pessoas) {
    where.capacidade = { [Op.gte]: pessoas };
  }

  const mesas = await Mesa.findAll({ where, order: [['id', 'ASC']] });
  return { data, horario, mesas };
}
