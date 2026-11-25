import { Op } from 'sequelize';
import { Mesa, Reserva, sequelize, Usuario } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';
import {
  STATUS_EDITAVEIS,
  STATUS_QUE_BLOQUEIAM,
  STATUS_SO_EQUIPE,
  TRANSICOES,
  validarDataHorario,
} from './regrasReserva.js';

const PERFIS_EQUIPE = ['admin', 'funcionario'];
const CAMPOS_ALOCACAO = ['mesaId', 'data_reserva', 'horario', 'quantidade_pessoas'];

const ehEquipe = (solicitante) => PERFIS_EQUIPE.includes(solicitante.perfil);

function incluirRelacoes(filtroCliente) {
  return [
    { model: Mesa, as: 'mesa', attributes: ['id', 'identificacao', 'capacidade', 'ativa'] },
    {
      model: Usuario,
      as: 'cliente',
      attributes: ['id', 'nome', 'email', 'telefone'],
      ...(filtroCliente && { where: filtroCliente }),
    },
  ];
}

function carregarCompleta(id, transaction) {
  return Reserva.findByPk(id, { include: incluirRelacoes(), transaction });
}

async function buscarOuFalhar(id, opcoes = {}) {
  const reserva = await Reserva.findByPk(id, opcoes);

  if (!reserva) {
    throw new HttpErro(404, 'Reserva não encontrada');
  }

  return reserva;
}

/** Equipe acessa qualquer reserva; cliente só as próprias. */
function garantirPosse(solicitante, reserva) {
  if (!ehEquipe(solicitante) && reserva.clienteId !== solicitante.id) {
    throw new HttpErro(403, 'Acesso negado: você só pode acessar as próprias reservas');
  }
}

/** Cliente reserva sempre para si; equipe informa um `clienteId` de perfil cliente. */
async function resolverClienteId(solicitante, clienteId, transaction) {
  if (!ehEquipe(solicitante)) {
    return solicitante.id;
  }

  if (!clienteId) {
    throw new HttpErro(400, 'Informe o clienteId do cliente da reserva');
  }

  const cliente = await Usuario.findByPk(clienteId, { transaction });

  if (!cliente) {
    throw new HttpErro(404, 'Cliente não encontrado');
  }

  if (cliente.perfil !== 'cliente') {
    throw new HttpErro(400, 'clienteId deve ser de um usuário com perfil cliente');
  }

  if (!cliente.ativo) {
    throw new HttpErro(400, 'Cliente desativado não pode receber reservas');
  }

  return cliente.id;
}

/**
 * Valida dia/horário/passado, mesa ativa, capacidade e conflito de slot.
 * Trava a linha da mesa (SELECT ... FOR UPDATE): duas reservas simultâneas na
 * mesma mesa são serializadas, então a checagem de conflito + gravação é atômica.
 */
async function validarAlocacao(alocacao, transaction, ignorarReservaId = null) {
  const { mesaId, data_reserva, horario, quantidade_pessoas } = alocacao;

  validarDataHorario(data_reserva, horario);

  const mesa = await Mesa.findByPk(mesaId, { transaction, lock: transaction.LOCK.UPDATE });

  if (!mesa) {
    throw new HttpErro(404, 'Mesa não encontrada');
  }

  if (!mesa.ativa) {
    throw new HttpErro(400, `Mesa ${mesa.identificacao} está desativada e não aceita reservas`);
  }

  if (quantidade_pessoas > mesa.capacidade) {
    throw new HttpErro(
      400,
      `Quantidade de pessoas (${quantidade_pessoas}) excede a capacidade da mesa ${mesa.identificacao} (${mesa.capacidade})`
    );
  }

  const conflito = await Reserva.findOne({
    where: {
      mesaId,
      data_reserva,
      horario,
      status: { [Op.in]: STATUS_QUE_BLOQUEIAM },
      ...(ignorarReservaId && { id: { [Op.ne]: ignorarReservaId } }),
    },
    transaction,
  });

  if (conflito) {
    throw new HttpErro(
      409,
      `Mesa ${mesa.identificacao} já está reservada em ${data_reserva} às ${horario}`
    );
  }
}

/**
 * Filtros: data, status, mesaId (todos); cliente = trecho do nome (só equipe).
 * Cliente sempre recebe apenas as próprias reservas.
 */
export async function listar(solicitante, { data, status, mesaId, cliente } = {}) {
  const where = {};

  if (data) where.data_reserva = data;
  if (status) where.status = status;
  if (mesaId) where.mesaId = mesaId;

  let filtroCliente = null;

  if (!ehEquipe(solicitante)) {
    where.clienteId = solicitante.id;
  } else if (cliente) {
    filtroCliente = { nome: { [Op.iLike]: `%${cliente}%` } };
  }

  return Reserva.findAll({
    where,
    include: incluirRelacoes(filtroCliente),
    order: [
      ['data_reserva', 'ASC'],
      ['horario', 'ASC'],
      ['id', 'ASC'],
    ],
  });
}

export async function buscarPorId(solicitante, id) {
  const reserva = await buscarOuFalhar(id, { include: incluirRelacoes() });
  garantirPosse(solicitante, reserva);
  return reserva;
}

export async function criar(solicitante, dados) {
  return sequelize.transaction(async (transaction) => {
    const clienteId = await resolverClienteId(solicitante, dados.clienteId, transaction);
    await validarAlocacao(dados, transaction);

    const reserva = await Reserva.create(
      {
        clienteId,
        mesaId: dados.mesaId,
        data_reserva: dados.data_reserva,
        horario: dados.horario,
        quantidade_pessoas: dados.quantidade_pessoas,
        observacoes: dados.observacoes ?? null,
        status: 'pendente',
      },
      { transaction }
    );

    return carregarCompleta(reserva.id, transaction);
  });
}

/** Só pendente/confirmada; mudar mesa/data/horário/pessoas revalida tudo. */
export async function atualizar(solicitante, id, dados) {
  return sequelize.transaction(async (transaction) => {
    const reserva = await buscarOuFalhar(id, { transaction, lock: transaction.LOCK.UPDATE });
    garantirPosse(solicitante, reserva);

    if (!STATUS_EDITAVEIS.includes(reserva.status)) {
      throw new HttpErro(400, `Reserva ${reserva.status} não pode ser editada`);
    }

    const mudouAlocacao = CAMPOS_ALOCACAO.some(
      (campo) => dados[campo] !== undefined && dados[campo] !== reserva[campo]
    );

    if (mudouAlocacao) {
      const alocacao = Object.fromEntries(
        CAMPOS_ALOCACAO.map((campo) => [campo, dados[campo] ?? reserva[campo]])
      );
      await validarAlocacao(alocacao, transaction, reserva.id);
    }

    await reserva.update(dados, { transaction });
    return carregarCompleta(reserva.id, transaction);
  });
}

/** Transições de FASE0_REGRAS.md §3; cliente só cancela a própria. */
export async function alterarStatus(solicitante, id, novoStatus) {
  return sequelize.transaction(async (transaction) => {
    const reserva = await buscarOuFalhar(id, { transaction, lock: transaction.LOCK.UPDATE });
    garantirPosse(solicitante, reserva);

    if (STATUS_SO_EQUIPE.includes(novoStatus) && !ehEquipe(solicitante)) {
      throw new HttpErro(403, 'Apenas funcionário ou admin pode confirmar ou concluir reservas');
    }

    const permitidos = TRANSICOES[reserva.status];

    if (permitidos.length === 0) {
      throw new HttpErro(400, `Reserva ${reserva.status} é terminal e não pode mudar de status`);
    }

    if (!permitidos.includes(novoStatus)) {
      throw new HttpErro(
        400,
        `Transição inválida: ${reserva.status} → ${novoStatus} (permitido: ${permitidos.join(', ')})`
      );
    }

    await reserva.update({ status: novoStatus }, { transaction });
    return carregarCompleta(reserva.id, transaction);
  });
}
