import { CategoriaMenu, ItemMenu } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';

const ATRIBUTOS_CATEGORIA = ['id', 'nome', 'ativa'];

const podeVerTudo = (solicitante) => solicitante.perfil === 'admin';

const incluirCategoria = (where) => ({
  model: CategoriaMenu,
  as: 'categoria',
  attributes: ATRIBUTOS_CATEGORIA,
  ...(where && { where, required: true }),
});

async function buscarOuFalhar(id) {
  const item = await ItemMenu.findByPk(id, { include: [incluirCategoria()] });

  if (!item) {
    throw new HttpErro(404, 'Item do cardápio não encontrado');
  }

  return item;
}

/** Item só pode entrar (ou ser movido) para categoria existente e ativa. */
async function garantirCategoriaAtiva(categoriaId) {
  const categoria = await CategoriaMenu.findByPk(categoriaId);

  if (!categoria) {
    throw new HttpErro(404, 'Categoria não encontrada');
  }

  if (!categoria.ativa) {
    throw new HttpErro(400, `Categoria ${categoria.nome} está desativada`);
  }
}

/**
 * Admin: todos (filtros opcionais `disponivel` e `categoriaId`).
 * Funcionario/cliente: só `disponivel=true` de categoria ativa (`disponivel` da query é ignorado).
 */
export async function listar(solicitante, { disponivel, categoriaId } = {}) {
  const where = {};
  let filtroCategoria;

  if (podeVerTudo(solicitante)) {
    if (disponivel !== undefined) where.disponivel = disponivel;
  } else {
    where.disponivel = true;
    filtroCategoria = { ativa: true };
  }

  if (categoriaId) {
    where.categoriaId = categoriaId;
  }

  return ItemMenu.findAll({
    where,
    include: [incluirCategoria(filtroCategoria)],
    order: [
      ['categoriaId', 'ASC'],
      ['nome', 'ASC'],
    ],
  });
}

export async function buscarPorId(solicitante, id) {
  const item = await buscarOuFalhar(id);

  // Para funcionario/cliente, item indisponível ou de categoria desativada "não existe"
  if (!podeVerTudo(solicitante) && (!item.disponivel || !item.categoria.ativa)) {
    throw new HttpErro(404, 'Item do cardápio não encontrado');
  }

  return item;
}

export async function criar(dados) {
  await garantirCategoriaAtiva(dados.categoriaId);
  const item = await ItemMenu.create(dados);
  return buscarOuFalhar(item.id);
}

/** Trocar de categoria exige a nova ativa; manter a atual (mesmo desativada) é permitido. */
export async function atualizar(id, dados) {
  const item = await buscarOuFalhar(id);

  if (dados.categoriaId !== undefined && dados.categoriaId !== item.categoriaId) {
    await garantirCategoriaAtiva(dados.categoriaId);
  }

  await item.update(dados);
  return buscarOuFalhar(id);
}

export async function alterarDisponivel(id, disponivel) {
  const item = await buscarOuFalhar(id);
  await item.update({ disponivel });
  return item;
}
