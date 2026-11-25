import { ZodError } from 'zod';
import { mapearErroSequelize } from '../utils/errosSequelize.js';
import { HttpErro } from '../utils/HttpErro.js';

export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada' });
}

/**
 * Tratador central (Express 5 encaminha rejeições de handlers async para cá).
 * Formato: { "erro": "..." } e, em validação Zod, "detalhes": [{ campo, mensagem }].
 * Express só reconhece tratador de erro com 4 parâmetros (inclusive `next`).
 */
export function tratarErros(error, req, res, next) {
  if (error instanceof HttpErro) {
    return res.status(error.status).json({ erro: error.message });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      detalhes: error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message,
      })),
    });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }

  // UNIQUE/FK/CHECK e validação do model. A checagem nos services continua
  // lançando HttpErro; isto cobre a corrida com o banco e o que escapar da service.
  const mapeado = mapearErroSequelize(error);
  if (mapeado) {
    if (mapeado.logar) console.error(error);
    return res.status(mapeado.status).json(mapeado.body);
  }

  console.error(error);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}
