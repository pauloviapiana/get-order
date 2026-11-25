import {
  adicionarItemSchema,
  alterarQuantidadeSchema,
  alterarStatusPedidoSchema,
  atribuirGarcomSchema,
  criarPedidoSchema,
  listarPedidosQuerySchema,
} from '../schemas/pedidoSchemas.js';
import { idParamSchema } from '../schemas/usuarioSchemas.js';
import * as pedidoService from '../services/pedidoService.js';

export async function listar(req, res) {
  const filtros = listarPedidosQuerySchema.parse(req.query);
  res.json(await pedidoService.listar(req.usuario, filtros));
}

export async function listarGarcons(req, res) {
  res.json(await pedidoService.listarGarcons());
}

export async function buscarPorId(req, res) {
  const id = idParamSchema.parse(req.params.id);
  res.json(await pedidoService.buscarPorId(req.usuario, id));
}

export async function criar(req, res) {
  const dados = criarPedidoSchema.parse(req.body ?? {});
  res.status(201).json(await pedidoService.criar(req.usuario, dados));
}

export async function adicionarItem(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const dados = adicionarItemSchema.parse(req.body ?? {});
  res.json(await pedidoService.adicionarItem(req.usuario, id, dados));
}

export async function alterarQuantidadeItem(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const pedidoItemId = idParamSchema.parse(req.params.pedidoItemId);
  const { quantidade } = alterarQuantidadeSchema.parse(req.body ?? {});
  res.json(await pedidoService.alterarQuantidadeItem(req.usuario, id, pedidoItemId, quantidade));
}

export async function removerItem(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const pedidoItemId = idParamSchema.parse(req.params.pedidoItemId);
  res.json(await pedidoService.removerItem(req.usuario, id, pedidoItemId));
}

export async function atribuirGarcom(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { garcomId } = atribuirGarcomSchema.parse(req.body ?? {});
  res.json(await pedidoService.atribuirGarcom(id, garcomId));
}

export async function alterarStatus(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { status } = alterarStatusPedidoSchema.parse(req.body ?? {});
  res.json(await pedidoService.alterarStatus(req.usuario, id, status));
}
