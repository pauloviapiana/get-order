import {
  alterarDisponivelSchema,
  atualizarItemSchema,
  criarItemSchema,
  listarItensQuerySchema,
} from '../schemas/itemMenuSchemas.js';
import { idParamSchema } from '../schemas/usuarioSchemas.js';
import * as itemMenuService from '../services/itemMenuService.js';

export async function listar(req, res) {
  const filtros = listarItensQuerySchema.parse(req.query);
  res.json(await itemMenuService.listar(req.usuario, filtros));
}

export async function buscarPorId(req, res) {
  const id = idParamSchema.parse(req.params.id);
  res.json(await itemMenuService.buscarPorId(req.usuario, id));
}

export async function criar(req, res) {
  const dados = criarItemSchema.parse(req.body ?? {});
  res.status(201).json(await itemMenuService.criar(dados));
}

export async function atualizar(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const dados = atualizarItemSchema.parse(req.body ?? {});
  res.json(await itemMenuService.atualizar(id, dados));
}

export async function alterarDisponivel(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { disponivel } = alterarDisponivelSchema.parse(req.body ?? {});
  res.json(await itemMenuService.alterarDisponivel(id, disponivel));
}
