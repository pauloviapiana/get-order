import jwt from 'jsonwebtoken';
import { Usuario } from '../models/index.js';

/**
 * Exige `Authorization: Bearer <token>`.
 * Recarrega o usuário do banco: conta desativada ou removida perde o acesso
 * mesmo com token ainda dentro dos 30 minutos, e o perfil usado é sempre o atual.
 * Preenche req.usuario = { id, nome, email, perfil }.
 */
export async function autenticar(req, res, next) {
  const authorization = req.headers.authorization || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não informado' });
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticação não informado' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const usuario = await Usuario.findByPk(payload.id);

  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: 'Usuário inválido ou desativado' });
  }

  req.usuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
  };

  return next();
}
