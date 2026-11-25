import { z } from 'zod';
import { PERFIS } from '../models/Usuario.js';

const nome = z
  .string({ required_error: 'Nome é obrigatório', invalid_type_error: 'Nome deve ser texto' })
  .trim()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(120, 'Nome deve ter no máximo 120 caracteres');

const email = z
  .string({ required_error: 'E-mail é obrigatório', invalid_type_error: 'E-mail deve ser texto' })
  .trim()
  .toLowerCase()
  .email('E-mail inválido')
  .max(160, 'E-mail deve ter no máximo 160 caracteres');

const senha = z
  .string({ required_error: 'Senha é obrigatória', invalid_type_error: 'Senha deve ser texto' })
  .min(6, 'Senha deve ter ao menos 6 caracteres')
  .max(72, 'Senha deve ter no máximo 72 caracteres');

// Vazio vira null para permitir "apagar" o telefone
const telefone = z
  .string({ invalid_type_error: 'Telefone deve ser texto' })
  .trim()
  .max(30, 'Telefone deve ter no máximo 30 caracteres')
  .nullable()
  .optional()
  .transform((valor) => (valor === '' ? null : valor));

const perfil = z.enum(PERFIS, {
  errorMap: () => ({ message: `Perfil deve ser um de: ${PERFIS.join(', ')}` }),
});

const ativo = z.boolean({
  required_error: 'Campo ativo é obrigatório',
  invalid_type_error: 'Campo ativo deve ser true ou false',
});

const peloMenosUmCampo = (dados) => Object.keys(dados).length > 0;
const MSG_CORPO_VAZIO = 'Informe ao menos um campo para atualizar';

export const idParamSchema = z.coerce
  .number({ invalid_type_error: 'ID inválido' })
  .int('ID inválido')
  .positive('ID inválido');

// Campos extras (ex.: perfil) são descartados: auto-cadastro sempre gera `cliente`
export const registerSchema = z.object({ nome, email, senha, telefone });

export const loginSchema = z.object({
  email,
  senha: z
    .string({ required_error: 'Senha é obrigatória', invalid_type_error: 'Senha deve ser texto' })
    .min(1, 'Senha é obrigatória'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token é obrigatório', invalid_type_error: 'Refresh token deve ser texto' })
    .trim()
    .min(1, 'Refresh token é obrigatório'),
});

/** Logout aceita body vazio ou sem refresh (idempotente). */
export const logoutSchema = z.object({
  refreshToken: z
    .string({ invalid_type_error: 'Refresh token deve ser texto' })
    .trim()
    .min(1, 'Refresh token inválido')
    .optional(),
});

export const criarUsuarioSchema = z.object({ nome, email, senha, telefone, perfil });

export const atualizarUsuarioAdminSchema = z
  .object({
    nome: nome.optional(),
    email: email.optional(),
    senha: senha.optional(),
    telefone,
    perfil: perfil.optional(),
    ativo: ativo.optional(),
  })
  .strict('Campo não permitido')
  .refine(peloMenosUmCampo, MSG_CORPO_VAZIO);

// Próprio cliente: não altera email, perfil nem ativo
export const atualizarProprioSchema = z
  .object({
    nome: nome.optional(),
    senha: senha.optional(),
    telefone,
  })
  .strict('Campo não permitido: altere apenas nome, telefone ou senha')
  .refine(peloMenosUmCampo, MSG_CORPO_VAZIO);

export const alterarAtivoSchema = z.object({ ativo });

export const listarUsuariosQuerySchema = z.object({
  perfil: perfil.optional(),
});
