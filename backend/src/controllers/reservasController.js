import {
  alterarStatusReservaSchema,
  atualizarReservaSchema,
  criarReservaSchema,
  listarReservasQuerySchema,
} from '../schemas/reservaSchemas.js';
import { idParamSchema } from '../schemas/usuarioSchemas.js';
import * as reservaService from '../services/reservaService.js';

export async function listar(req, res) {
  const filtros = listarReservasQuerySchema.parse(req.query);
  res.json(await reservaService.listar(req.usuario, filtros));
}

export async function buscarPorId(req, res) {
  const id = idParamSchema.parse(req.params.id);
  res.json(await reservaService.buscarPorId(req.usuario, id));
}

export async function criar(req, res) {
  const dados = criarReservaSchema.parse(req.body ?? {});
  res.status(201).json(await reservaService.criar(req.usuario, dados));
}

export async function atualizar(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const dados = atualizarReservaSchema.parse(req.body ?? {});
  res.json(await reservaService.atualizar(req.usuario, id, dados));
}

export async function alterarStatus(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { status } = alterarStatusReservaSchema.parse(req.body ?? {});
  res.json(await reservaService.alterarStatus(req.usuario, id, status));
}
