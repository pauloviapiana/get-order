import { CategoriaMenu, sequelize } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';
import * as itemMenuService from './itemMenuService.js';

const podeVerInativas = (solicitante) => solicitante.perfil === 'admin';

async function buscarOuFalhar(id) {
  const categoria = await CategoriaMenu.findByPk(id);

  if (!categoria) {
    throw new HttpErro(404, 'Categoria não encontrada');
  }

  return categoria;
}

/** UNIQUE do banco diferencia maiúsculas; aqui "Bebidas" e "bebidas" contam como a mesma. */
async function garantirNomeLivre(nome, idAtual = null) {
  const existente = await CategoriaMenu.findOne({
    where: sequelize.where(sequelize.fn('lower', sequelize.col('nome')), nome.toLowerCase()),
  });

  if (existente && existente.id !== idAtual) {
    throw new HttpErro(409, 'Categoria já cadastrada');
  }
}

/** Admin: todas (filtro opcional `ativa`). Funcionario/cliente: só ativas. */
export async function listar(solicitante, { ativa } = {}) {
  const where = {};

  if (!podeVerInativas(solicitante)) {
    where.ativa = true;
  } else if (ativa !== undefined) {
    where.ativa = ativa;
  }

  return CategoriaMenu.findAll({ where, order: [['id', 'ASC']] });
}

export async function buscarPorId(solicitante, id) {
  const categoria = await buscarOuFalhar(id);

  // Para funcionario/cliente, categoria desativada "não existe"
  if (!categoria.ativa && !podeVerInativas(solicitante)) {
    throw new HttpErro(404, 'Categoria não encontrada');
  }

  return categoria;
}

/** Itens da categoria com as mesmas regras de visibilidade de GET /itens-menu. */
export async function listarItens(solicitante, id, filtros = {}) {
  await buscarPorId(solicitante, id);
  return itemMenuService.listar(solicitante, { ...filtros, categoriaId: id });
}

export async function criar({ nome }) {
  await garantirNomeLivre(nome);
  return CategoriaMenu.create({ nome });
}

export async function atualizar(id, { nome }) {
  const categoria = await buscarOuFalhar(id);
  await garantirNomeLivre(nome, id);
  await categoria.update({ nome });
  return categoria;
}

/**
 * Sem cascata: desativar não altera `disponivel` dos itens; eles somem para
 * funcionario/cliente pelo filtro de categoria ativa e voltam ao reativar.
 */
export async function alterarAtiva(id, ativa) {
  const categoria = await buscarOuFalhar(id);
  await categoria.update({ ativa });
  return categoria;
}
