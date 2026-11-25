import {
  CategoriaMenu,
  ItemMenu,
  Mesa,
  Pedido,
  PedidoItem,
  Reserva,
  sequelize,
  Usuario,
} from '../models/index.js';
import { comissaoCentavos, deCentavos, LIMITE_CENTAVOS, paraCentavos } from '../utils/dinheiro.js';
import { HttpErro } from '../utils/HttpErro.js';
import {
  QUANTIDADE_MAXIMA,
  STATUS_EDITAVEL,
  STATUS_RESERVA_VINCULAVEL,
  STATUS_SO_EQUIPE,
  STATUS_TERMINAIS,
  TRANSICOES,
} from './regrasPedido.js';

const PERFIS_EQUIPE = ['admin', 'funcionario'];

const ehEquipe = (solicitante) => PERFIS_EQUIPE.includes(solicitante.perfil);

function incluirRelacoes() {
  return [
    {
      model: PedidoItem,
      as: 'itens',
      include: [{ model: ItemMenu, as: 'item', attributes: ['id', 'nome', 'categoriaId'] }],
    },
    { model: Usuario, as: 'cliente', attributes: ['id', 'nome', 'email', 'telefone'] },
    { model: Usuario, as: 'garcom', attributes: ['id', 'nome'] },
    {
      model: Reserva,
      as: 'reserva',
      attributes: ['id', 'data_reserva', 'horario', 'status', 'mesaId'],
      include: [{ model: Mesa, as: 'mesa', attributes: ['id', 'identificacao'] }],
    },
  ];
}

const ORDEM_ITENS = [{ model: PedidoItem, as: 'itens' }, 'id', 'ASC'];

function carregarCompleto(id, transaction) {
  return Pedido.findByPk(id, { include: incluirRelacoes(), order: [ORDEM_ITENS], transaction });
}

// Sem include: SELECT ... FOR UPDATE não pode ser aplicado ao lado opcional de um LEFT JOIN
async function buscarOuFalhar(id, opcoes = {}) {
  const pedido = await Pedido.findByPk(id, opcoes);

  if (!pedido) {
    throw new HttpErro(404, 'Pedido não encontrado');
  }

  return pedido;
}

/** Equipe acessa qualquer pedido; cliente só os próprios. */
function garantirPosse(solicitante, pedido) {
  if (!ehEquipe(solicitante) && pedido.clienteId !== solicitante.id) {
    throw new HttpErro(403, 'Acesso negado: você só pode acessar os próprios pedidos');
  }
}

function garantirEditavel(pedido) {
  if (pedido.status !== STATUS_EDITAVEL) {
    throw new HttpErro(400, `Itens só podem ser alterados com o pedido aberto (status atual: ${pedido.status})`);
  }
}

function garantirQuantidade(quantidade, nomeItem) {
  if (quantidade > QUANTIDADE_MAXIMA) {
    throw new HttpErro(400, `Quantidade de ${nomeItem} excede o máximo de ${QUANTIDADE_MAXIMA} por pedido`);
  }
}

function garantirLimite(centavos) {
  if (centavos > LIMITE_CENTAVOS) {
    throw new HttpErro(400, 'Valor do pedido excede o limite permitido');
  }
}

/** Cliente pede sempre para si; equipe informa um `clienteId` ativo de perfil cliente. */
async function resolverClienteId(solicitante, clienteId, transaction) {
  if (!ehEquipe(solicitante)) {
    return solicitante.id;
  }

  if (!clienteId) {
    throw new HttpErro(400, 'Informe o clienteId do cliente do pedido');
  }

  const cliente = await Usuario.findByPk(clienteId, { transaction });

  if (!cliente) {
    throw new HttpErro(404, 'Cliente não encontrado');
  }

  if (cliente.perfil !== 'cliente') {
    throw new HttpErro(400, 'clienteId deve ser de um usuário com perfil cliente');
  }

  if (!cliente.ativo) {
    throw new HttpErro(400, 'Cliente desativado não pode receber pedidos');
  }

  return cliente.id;
}

/** Compra antecipada: reserva do mesmo cliente, ainda pendente ou confirmada. */
async function validarReserva(solicitante, reservaId, clienteId, transaction) {
  const reserva = await Reserva.findByPk(reservaId, { transaction });

  if (!reserva) {
    throw new HttpErro(404, 'Reserva não encontrada');
  }

  if (reserva.clienteId !== clienteId) {
    if (!ehEquipe(solicitante)) {
      throw new HttpErro(403, 'Acesso negado: você só pode vincular as próprias reservas');
    }
    throw new HttpErro(400, 'A reserva pertence a outro cliente');
  }

  if (!STATUS_RESERVA_VINCULAVEL.includes(reserva.status)) {
    throw new HttpErro(
      400,
      `Reserva ${reserva.status} não aceita compra antecipada (só ${STATUS_RESERVA_VINCULAVEL.join(' ou ')})`
    );
  }
}

/** Pedível = existe, `disponivel = true` e categoria ativa (FASE4_CARDAPIO.md, "Para a Fase 5"). */
async function buscarItemPedivel(itemMenuId, transaction) {
  const item = await ItemMenu.findByPk(itemMenuId, {
    include: [{ model: CategoriaMenu, as: 'categoria', attributes: ['id', 'nome', 'ativa'] }],
    transaction,
  });

  if (!item) {
    throw new HttpErro(404, `Item do cardápio ${itemMenuId} não encontrado`);
  }

  if (!item.disponivel) {
    throw new HttpErro(400, `Item ${item.nome} está indisponível`);
  }

  if (!item.categoria.ativa) {
    throw new HttpErro(400, `Item ${item.nome} pertence à categoria ${item.categoria.nome}, que está desativada`);
  }

  return item;
}

function subtotalCentavos(quantidade, precoUnitario) {
  const subtotal = quantidade * paraCentavos(precoUnitario);
  garantirLimite(subtotal);
  return subtotal;
}

/** Soma os subtotais gravados e atualiza `valor_total`; devolve o total em centavos. */
async function recalcularTotal(pedido, transaction) {
  const linhas = await PedidoItem.findAll({ where: { pedidoId: pedido.id }, transaction });
  const total = linhas.reduce((soma, linha) => soma + paraCentavos(linha.subtotal), 0);
  garantirLimite(total);
  await pedido.update({ valor_total: deCentavos(total) }, { transaction });
  return { total, quantidadeLinhas: linhas.length };
}

async function buscarLinhaOuFalhar(pedido, pedidoItemId, transaction) {
  const linha = await PedidoItem.findOne({
    where: { id: pedidoItemId, pedidoId: pedido.id },
    include: [{ model: ItemMenu, as: 'item', attributes: ['id', 'nome'] }],
    transaction,
  });

  if (!linha) {
    throw new HttpErro(404, 'Item não encontrado neste pedido');
  }

  return linha;
}

/** Pedido travado (FOR UPDATE), com posse checada e status `aberto`. */
async function travarPedidoEditavel(solicitante, id, transaction) {
  const pedido = await buscarOuFalhar(id, { transaction, lock: transaction.LOCK.UPDATE });
  garantirPosse(solicitante, pedido);
  garantirEditavel(pedido);
  return pedido;
}

/** Garçom = usuário ativo com perfil funcionario. */
async function validarGarcom(garcomId, transaction) {
  const garcom = await Usuario.findByPk(garcomId, { transaction });

  if (!garcom) {
    throw new HttpErro(404, 'Garçom não encontrado');
  }

  if (garcom.perfil !== 'funcionario') {
    throw new HttpErro(400, 'Garçom deve ser um usuário com perfil funcionario');
  }

  if (!garcom.ativo) {
    throw new HttpErro(400, `Garçom ${garcom.nome} está desativado`);
  }

  return garcom;
}

/**
 * Filtros: status, reservaId (todos); clienteId (só equipe).
 * Cliente sempre recebe apenas os próprios pedidos. Mais recentes primeiro.
 */
export async function listar(solicitante, { status, clienteId, reservaId } = {}) {
  const where = {};

  if (status) where.status = status;
  if (reservaId) where.reservaId = reservaId;

  if (!ehEquipe(solicitante)) {
    where.clienteId = solicitante.id;
  } else if (clienteId) {
    where.clienteId = clienteId;
  }

  return Pedido.findAll({
    where,
    include: incluirRelacoes(),
    order: [['id', 'DESC'], ORDEM_ITENS],
  });
}

export async function buscarPorId(solicitante, id) {
  const pedido = await buscarOuFalhar(id, { include: incluirRelacoes(), order: [ORDEM_ITENS] });
  garantirPosse(solicitante, pedido);
  return pedido;
}

/** Funcionários ativos, para a equipe escolher o garçom do pedido. */
export async function listarGarcons() {
  return Usuario.findAll({
    where: { perfil: 'funcionario', ativo: true },
    attributes: ['id', 'nome'],
    order: [['nome', 'ASC']],
  });
}

/** Itens repetidos no corpo viram uma linha só (quantidades somadas). */
export async function criar(solicitante, dados) {
  return sequelize.transaction(async (transaction) => {
    const clienteId = await resolverClienteId(solicitante, dados.clienteId, transaction);

    if (dados.reservaId) {
      await validarReserva(solicitante, dados.reservaId, clienteId, transaction);
    }

    const quantidades = new Map();
    for (const { itemMenuId, quantidade } of dados.itens) {
      quantidades.set(itemMenuId, (quantidades.get(itemMenuId) ?? 0) + quantidade);
    }

    const linhas = [];
    for (const [itemMenuId, quantidade] of quantidades) {
      const item = await buscarItemPedivel(itemMenuId, transaction);
      garantirQuantidade(quantidade, item.nome);
      linhas.push({
        itemMenuId,
        quantidade,
        preco_unitario: item.preco,
        subtotal: subtotalCentavos(quantidade, item.preco),
      });
    }

    const total = linhas.reduce((soma, linha) => soma + linha.subtotal, 0);
    garantirLimite(total);

    const pedido = await Pedido.create(
      {
        clienteId,
        reservaId: dados.reservaId ?? null,
        status: 'aberto',
        valor_total: deCentavos(total),
      },
      { transaction }
    );

    await PedidoItem.bulkCreate(
      linhas.map((linha) => ({ ...linha, pedidoId: pedido.id, subtotal: deCentavos(linha.subtotal) })),
      { transaction }
    );

    return carregarCompleto(pedido.id, transaction);
  });
}

/**
 * Adiciona um item ao pedido aberto. Se o item já estiver no pedido, soma a quantidade
 * na linha existente, que mantém o preço do snapshot original.
 */
export async function adicionarItem(solicitante, id, { itemMenuId, quantidade }) {
  return sequelize.transaction(async (transaction) => {
    const pedido = await travarPedidoEditavel(solicitante, id, transaction);
    const item = await buscarItemPedivel(itemMenuId, transaction);

    const existente = await PedidoItem.findOne({ where: { pedidoId: pedido.id, itemMenuId }, transaction });

    if (existente) {
      const novaQuantidade = existente.quantidade + quantidade;
      garantirQuantidade(novaQuantidade, item.nome);
      await existente.update(
        {
          quantidade: novaQuantidade,
          subtotal: deCentavos(subtotalCentavos(novaQuantidade, existente.preco_unitario)),
        },
        { transaction }
      );
    } else {
      garantirQuantidade(quantidade, item.nome);
      await PedidoItem.create(
        {
          pedidoId: pedido.id,
          itemMenuId,
          quantidade,
          preco_unitario: item.preco,
          subtotal: deCentavos(subtotalCentavos(quantidade, item.preco)),
        },
        { transaction }
      );
    }

    await recalcularTotal(pedido, transaction);
    return carregarCompleto(pedido.id, transaction);
  });
}

/** Aumentar a quantidade exige o item ainda pedível; diminuir é sempre permitido. */
export async function alterarQuantidadeItem(solicitante, id, pedidoItemId, quantidade) {
  return sequelize.transaction(async (transaction) => {
    const pedido = await travarPedidoEditavel(solicitante, id, transaction);
    const linha = await buscarLinhaOuFalhar(pedido, pedidoItemId, transaction);

    if (quantidade > linha.quantidade) {
      await buscarItemPedivel(linha.itemMenuId, transaction);
    }

    garantirQuantidade(quantidade, linha.item.nome);
    await linha.update(
      { quantidade, subtotal: deCentavos(subtotalCentavos(quantidade, linha.preco_unitario)) },
      { transaction }
    );

    await recalcularTotal(pedido, transaction);
    return carregarCompleto(pedido.id, transaction);
  });
}

/** Pedido não fica vazio: para desistir de tudo, cancelar o pedido. */
export async function removerItem(solicitante, id, pedidoItemId) {
  return sequelize.transaction(async (transaction) => {
    const pedido = await travarPedidoEditavel(solicitante, id, transaction);
    const linha = await buscarLinhaOuFalhar(pedido, pedidoItemId, transaction);

    const quantidadeLinhas = await PedidoItem.count({ where: { pedidoId: pedido.id }, transaction });

    if (quantidadeLinhas <= 1) {
      throw new HttpErro(400, 'O pedido precisa de ao menos 1 item; para desistir, cancele o pedido');
    }

    await linha.destroy({ transaction });
    await recalcularTotal(pedido, transaction);
    return carregarCompleto(pedido.id, transaction);
  });
}

/** Só equipe (RBAC na rota). Permitido até `entregue`; pago/cancelado são terminais. */
export async function atribuirGarcom(id, garcomId) {
  return sequelize.transaction(async (transaction) => {
    const pedido = await buscarOuFalhar(id, { transaction, lock: transaction.LOCK.UPDATE });

    if (STATUS_TERMINAIS.includes(pedido.status)) {
      throw new HttpErro(400, `Pedido ${pedido.status} não pode ter o garçom alterado`);
    }

    await validarGarcom(garcomId, transaction);
    await pedido.update({ garcomId }, { transaction });
    return carregarCompleto(pedido.id, transaction);
  });
}

function mensagemPerfilSemPermissao(origem, destino) {
  if (origem === 'entregue' && destino === 'cancelado') {
    return 'Apenas admin pode cancelar pedido já entregue (cancelamento excepcional)';
  }
  if (destino === 'cancelado') {
    return 'Cliente só pode cancelar o pedido enquanto ele está aberto';
  }
  return 'Acesso negado para esta transição de status';
}

/**
 * Transições de FASE0_REGRAS.md §4. Ordem das checagens:
 * 404 → posse (403) → perfil (403) → transição inválida/terminal (400) → regras de negócio (400).
 */
export async function alterarStatus(solicitante, id, novoStatus) {
  return sequelize.transaction(async (transaction) => {
    const pedido = await buscarOuFalhar(id, { transaction, lock: transaction.LOCK.UPDATE });
    garantirPosse(solicitante, pedido);

    if (STATUS_SO_EQUIPE.includes(novoStatus) && !ehEquipe(solicitante)) {
      throw new HttpErro(403, 'Apenas funcionário ou admin pode avançar o preparo do pedido');
    }

    const permitidos = TRANSICOES[pedido.status];
    const perfisAutorizados = permitidos[novoStatus];

    if (perfisAutorizados && !perfisAutorizados.includes(solicitante.perfil)) {
      throw new HttpErro(403, mensagemPerfilSemPermissao(pedido.status, novoStatus));
    }

    const destinos = Object.keys(permitidos);

    if (destinos.length === 0) {
      throw new HttpErro(400, `Pedido ${pedido.status} é terminal e não pode mudar de status`);
    }

    if (!perfisAutorizados) {
      throw new HttpErro(
        400,
        `Transição inválida: ${pedido.status} → ${novoStatus} (permitido: ${destinos.join(', ')})`
      );
    }

    if (novoStatus === 'pago') {
      if (!pedido.garcomId) {
        throw new HttpErro(400, 'Atribua um garçom ao pedido antes do pagamento');
      }

      await validarGarcom(pedido.garcomId, transaction);
      const { total, quantidadeLinhas } = await recalcularTotal(pedido, transaction);

      if (quantidadeLinhas === 0) {
        throw new HttpErro(400, 'Pedido sem itens não pode ser pago');
      }

      await pedido.update(
        { status: 'pago', valor_comissao: deCentavos(comissaoCentavos(total)), pago_em: new Date() },
        { transaction }
      );
    } else if (novoStatus === 'cancelado') {
      await pedido.update({ status: 'cancelado', valor_comissao: null }, { transaction });
    } else {
      await pedido.update({ status: novoStatus }, { transaction });
    }

    return carregarCompleto(pedido.id, transaction);
  });
}
