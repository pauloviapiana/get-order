import {
  alterarAtivaCategoriaSchema,
  atualizarCategoriaSchema,
  criarCategoriaSchema,
  listarCategoriasQuerySchema,
} from '../schemas/categoriaSchemas.js';
import { listarItensQuerySchema } from '../schemas/itemMenuSchemas.js';
import { idParamSchema } from '../schemas/usuarioSchemas.js';
import * as categoriaService from '../services/categoriaService.js';

export async function listar(req, res) {
  const filtros = listarCategoriasQuerySchema.parse(req.query);
  res.json(await categoriaService.listar(req.usuario, filtros));
}

export async function buscarPorId(req, res) {
  const id = idParamSchema.parse(req.params.id);
  res.json(await categoriaService.buscarPorId(req.usuario, id));
}

export async function listarItens(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { disponivel } = listarItensQuerySchema.parse(req.query);
  res.json(await categoriaService.listarItens(req.usuario, id, { disponivel }));
}

export async function criar(req, res) {
  const dados = criarCategoriaSchema.parse(req.body ?? {});
  res.status(201).json(await categoriaService.criar(dados));
}

export async function atualizar(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const dados = atualizarCategoriaSchema.parse(req.body ?? {});
  res.json(await categoriaService.atualizar(id, dados));
}

export async function alterarAtiva(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { ativa } = alterarAtivaCategoriaSchema.parse(req.body ?? {});
  res.json(await categoriaService.alterarAtiva(id, ativa));
}
