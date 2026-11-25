import { Op } from 'sequelize';
import { Compra, Usuario } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';
import { agoraNoRestaurante } from './regrasReserva.js';

const incluirRegistradoPor = () => [{ model: Usuario, as: 'registradoPor', attributes: ['id', 'nome'] }];

async function buscarOuFalhar(id) {
  const compra = await Compra.findByPk(id, { include: incluirRegistradoPor() });

  if (!compra) {
    throw new HttpErro(404, 'Compra não encontrada');
  }

  return compra;
}

/** Despesa registrada é algo que já aconteceu: data no futuro (fuso do restaurante) → 400. */
function garantirDataNaoFutura(dataCompra) {
  if (dataCompra > agoraNoRestaurante().data) {
    throw new HttpErro(400, 'Data da compra não pode ser futura');
  }
}

// `%` e `_` digitados na busca são literais, não curingas do ILIKE
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

/** Filtros: período em `data_compra` (inclusivo) e `q` em descrição/fornecedor. Mais recentes primeiro. */
export async function listar({ de, ate, q } = {}) {
  const where = {};

  if (de || ate) {
    where.data_compra = {
      ...(de && { [Op.gte]: de }),
      ...(ate && { [Op.lte]: ate }),
    };
  }

  if (q) {
    const termo = `%${escaparLike(q)}%`;
    where[Op.or] = [{ descricao: { [Op.iLike]: termo } }, { fornecedor: { [Op.iLike]: termo } }];
  }

  return Compra.findAll({
    where,
    include: incluirRegistradoPor(),
    order: [
      ['data_compra', 'DESC'],
      ['id', 'DESC'],
    ],
  });
}

export async function buscarPorId(id) {
  return buscarOuFalhar(id);
}

export async function criar(solicitante, dados) {
  garantirDataNaoFutura(dados.data_compra);
  const compra = await Compra.create({ ...dados, registradoPorId: solicitante.id });
  return buscarOuFalhar(compra.id);
}

/** `registradoPorId` não muda na edição: continua sendo quem registrou a compra. */
export async function atualizar(id, dados) {
  const compra = await buscarOuFalhar(id);

  if (dados.data_compra !== undefined) {
    garantirDataNaoFutura(dados.data_compra);
  }

  await compra.update(dados);
  return buscarOuFalhar(id);
}

/** Exclusão física (MVP): nenhuma outra tabela referencia `compras`. */
export async function remover(id) {
  const compra = await buscarOuFalhar(id);
  await compra.destroy();
}
