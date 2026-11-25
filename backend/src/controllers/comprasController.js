import { atualizarCompraSchema, criarCompraSchema, listarComprasQuerySchema } from '../schemas/compraSchemas.js';
import { idParamSchema } from '../schemas/usuarioSchemas.js';
import * as compraService from '../services/compraService.js';

export async function listar(req, res) {
  const filtros = listarComprasQuerySchema.parse(req.query);
  res.json(await compraService.listar(filtros));
}

export async function buscarPorId(req, res) {
  const id = idParamSchema.parse(req.params.id);
  res.json(await compraService.buscarPorId(id));
}

export async function criar(req, res) {
  const dados = criarCompraSchema.parse(req.body ?? {});
  res.status(201).json(await compraService.criar(req.usuario, dados));
}

export async function atualizar(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const dados = atualizarCompraSchema.parse(req.body ?? {});
  res.json(await compraService.atualizar(id, dados));
}

export async function remover(req, res) {
  const id = idParamSchema.parse(req.params.id);
  await compraService.remover(id);
  res.status(204).end();
}
