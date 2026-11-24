import { loginSchema, registerSchema } from '../schemas/usuarioSchemas.js';
import * as authService from '../services/authService.js';

export async function register(req, res) {
  const dados = registerSchema.parse(req.body ?? {});
  const usuario = await authService.registrar(dados);
  res.status(201).json(usuario);
}

export async function login(req, res) {
  const dados = loginSchema.parse(req.body ?? {});
  res.json(await authService.login(dados));
}

export async function me(req, res) {
  res.json(await authService.me(req.usuario.id));
}
