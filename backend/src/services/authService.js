import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RefreshToken, Usuario } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';
import * as usuarioService from './usuarioService.js';

const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '30m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function exigirJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado no .env');
  }
}

function gerarAccessToken(usuario) {
  exigirJwtSecret();
  return jwt.sign(
    { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDuracaoMs(valor) {
  const match = String(valor).trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    // Fallback acadêmico: 7 dias se o formato for inválido
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = Number(match[1]);
  const unidade = match[2].toLowerCase();
  const fatores = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * fatores[unidade];
}

async function emitirParDeTokens(usuario, { transaction } = {}) {
  const accessToken = gerarAccessToken(usuario);
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDuracaoMs(JWT_REFRESH_EXPIRES_IN));

  await RefreshToken.create(
    {
      usuarioId: usuario.id,
      tokenHash,
      expiresAt,
      revokedAt: null,
    },
    { transaction }
  );

  return {
    token: accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
  };
}

/** Auto-cadastro público: perfil é sempre `cliente`, independente do body. */
export async function registrar(dados) {
  return usuarioService.criar({ ...dados, perfil: 'cliente' });
}

export async function login({ email, senha }) {
  const usuario = await Usuario.scope('comSenha').findOne({ where: { email } });

  // Mesma mensagem para email inexistente e senha errada
  const senhaOk = usuario ? await bcrypt.compare(senha, usuario.senha) : false;

  if (!senhaOk) {
    throw new HttpErro(401, 'Credenciais inválidas');
  }

  // Só revelado a quem acertou a senha
  if (!usuario.ativo) {
    throw new HttpErro(403, 'Usuário desativado. Procure o administrador.');
  }

  return emitirParDeTokens(usuario);
}

/**
 * Rotação: invalida o refresh apresentado e emite um novo par.
 * Token reutilizado após rotação (já revogado) → 401.
 */
export async function refresh({ refreshToken }) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new HttpErro(401, 'Refresh token inválido ou expirado');
  }

  const tokenHash = hashRefreshToken(refreshToken.trim());
  const registro = await RefreshToken.findOne({ where: { tokenHash } });

  if (!registro || registro.revokedAt || registro.expiresAt <= new Date()) {
    throw new HttpErro(401, 'Refresh token inválido ou expirado');
  }

  const usuario = await Usuario.findByPk(registro.usuarioId);

  if (!usuario || !usuario.ativo) {
    registro.revokedAt = new Date();
    await registro.save();
    throw new HttpErro(401, 'Usuário inválido ou desativado');
  }

  return RefreshToken.sequelize.transaction(async (transaction) => {
    registro.revokedAt = new Date();
    await registro.save({ transaction });
    return emitirParDeTokens(usuario, { transaction });
  });
}

/** Invalida o refresh informado (logout). Idempotente se já estiver inválido. */
export async function logout({ refreshToken }) {
  if (!refreshToken || typeof refreshToken !== 'string') {
    return { ok: true };
  }

  const tokenHash = hashRefreshToken(refreshToken.trim());
  const registro = await RefreshToken.findOne({ where: { tokenHash } });

  if (registro && !registro.revokedAt) {
    registro.revokedAt = new Date();
    await registro.save();
  }

  return { ok: true };
}

export async function me(id) {
  const usuario = await Usuario.findByPk(id);

  if (!usuario) {
    throw new HttpErro(404, 'Usuário não encontrado');
  }

  return usuario;
}
