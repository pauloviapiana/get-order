import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';
import { HttpErro } from '../utils/HttpErro.js';
import * as usuarioService from './usuarioService.js';

const JWT_EXPIRES_IN = '30m';

function gerarToken(usuario) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado no .env');
  }

  return jwt.sign(
    { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
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

  return {
    token: gerarToken(usuario),
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
  };
}

export async function me(id) {
  const usuario = await Usuario.findByPk(id);

  if (!usuario) {
    throw new HttpErro(404, 'Usuário não encontrado');
  }

  return usuario;
}
