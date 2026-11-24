import {
  alterarAtivoSchema,
  atualizarProprioSchema,
  atualizarUsuarioAdminSchema,
  criarUsuarioSchema,
  idParamSchema,
  listarUsuariosQuerySchema,
} from '../schemas/usuarioSchemas.js';
import * as usuarioService from '../services/usuarioService.js';

export async function listar(req, res) {
  const filtros = listarUsuariosQuerySchema.parse(req.query);
  res.json(await usuarioService.listar(filtros));
}

export async function buscarPorId(req, res) {
  const id = idParamSchema.parse(req.params.id);
  res.json(await usuarioService.buscarPorId(req.usuario, id));
}

export async function criar(req, res) {
  const dados = criarUsuarioSchema.parse(req.body ?? {});
  res.status(201).json(await usuarioService.criar(dados));
}

export async function atualizar(req, res) {
  const id = idParamSchema.parse(req.params.id);
  // Checa posse antes de validar o body: cliente em id alheio recebe 403, não 400
  usuarioService.garantirAcesso(req.usuario, id);

  const schema =
    req.usuario.perfil === 'admin' ? atualizarUsuarioAdminSchema : atualizarProprioSchema;
  const dados = schema.parse(req.body ?? {});

  res.json(await usuarioService.atualizar(req.usuario, id, dados));
}

export async function alterarAtivo(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const { ativo } = alterarAtivoSchema.parse(req.body ?? {});
  res.json(await usuarioService.alterarAtivo(req.usuario, id, ativo));
}

export async function remover(req, res) {
  const id = idParamSchema.parse(req.params.id);
  const usuario = await usuarioService.remover(req.usuario, id);
  res.json({ mensagem: 'Usuário desativado', usuario });
}
