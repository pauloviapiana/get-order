import {
  alterarAtivaSchema,
  atualizarMesaSchema,
  criarMesaSchema,
  disponibilidadeQuerySchema,
  listarMesasQuerySchema,
} from '../schemas/mesaSchemas.js';
import { idParamSchema } from '../schemas/usuarioSchemas.js';
import * as mesaService from '../services/mesaService.js';

export async function listar(req, res) {
  const filtros = listarMesasQuerySchema.parse(req.query);
  res.json(await mesaService.listar(req.usuario, filtros));
}

export async function disponibilidade(req, res) {
  const consulta = disponibilidadeQuerySchema.parse(req.query);
  res.json(await mesaService.disponibilidade(consulta));
}

export async function buscarPorId(req, res) {
  const id = idParamSchema.parse(req.params.id);
  res.json(await mesaService.buscarPorId(req.usuario, id));
}

export async function criar(req, res) {
  const dados = criarMesaSchema.parse(req.body ?? {});
  res.status(201).json(await mesaService.criar(dados));
}

export async function atualizar(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const dados = atualizarMesaSchema.parse(req.body ?? {});
  res.json(await mesaService.atualizar(id, dados));
}

export async function alterarAtiva(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { ativa } = alterarAtivaSchema.parse(req.body ?? {});
  res.json(await mesaService.alterarAtiva(id, ativa));
}
