import bcrypt from 'bcrypt';
import { Usuario } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';

const SALT_ROUNDS = 10;

export function gerarHash(senha) {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

/** Admin acessa qualquer id; demais perfis só o próprio. */
export function garantirAcesso(solicitante, id) {
  if (solicitante.perfil !== 'admin' && solicitante.id !== id) {
    throw new HttpErro(403, 'Acesso negado: você só pode acessar o próprio usuário');
  }
}

async function buscarOuFalhar(id) {
  const usuario = await Usuario.findByPk(id);

  if (!usuario) {
    throw new HttpErro(404, 'Usuário não encontrado');
  }

  return usuario;
}

async function garantirEmailLivre(email, idAtual = null) {
  const existente = await Usuario.findOne({ where: { email } });

  if (existente && existente.id !== idAtual) {
    throw new HttpErro(409, 'E-mail já cadastrado');
  }
}

/** Impede o admin de se trancar fora do sistema. */
function protegerProprioAdmin(solicitante, id, dados) {
  if (solicitante.id !== id) return;

  if (dados.ativo === false) {
    throw new HttpErro(400, 'Não é possível desativar o próprio usuário');
  }

  if (dados.perfil && dados.perfil !== 'admin') {
    throw new HttpErro(400, 'Não é possível alterar o próprio perfil de admin');
  }
}

export async function listar({ perfil } = {}) {
  return Usuario.findAll({
    where: perfil ? { perfil } : {},
    order: [['id', 'ASC']],
  });
}

export async function buscarPorId(solicitante, id) {
  garantirAcesso(solicitante, id);
  return buscarOuFalhar(id);
}

export async function criar({ nome, email, senha, telefone, perfil }) {
  await garantirEmailLivre(email);

  return Usuario.create({
    nome,
    email,
    senha: await gerarHash(senha),
    telefone: telefone ?? null,
    perfil,
  });
}

/**
 * `dados` já validado pelo schema do perfil do solicitante
 * (admin: campos amplos; cliente: nome/telefone/senha).
 */
export async function atualizar(solicitante, id, dados) {
  garantirAcesso(solicitante, id);
  const usuario = await buscarOuFalhar(id);

  if (solicitante.perfil === 'admin') {
    protegerProprioAdmin(solicitante, id, dados);
  }

  if (dados.email) {
    await garantirEmailLivre(dados.email, id);
  }

  const alteracoes = { ...dados };

  if (dados.senha) {
    alteracoes.senha = await gerarHash(dados.senha);
  }

  await usuario.update(alteracoes);
  return usuario;
}

export async function alterarAtivo(solicitante, id, ativo) {
  const usuario = await buscarOuFalhar(id);
  protegerProprioAdmin(solicitante, id, { ativo });

  await usuario.update({ ativo });
  return usuario;
}

/**
 * DELETE = desativação (soft delete). Mantém o histórico para as FKs das próximas
 * fases (reservas, pedidos, compras) e segue "preferir desativar" da MATRIZ_RBAC.
 */
export async function remover(solicitante, id) {
  return alterarAtivo(solicitante, id, false);
}
