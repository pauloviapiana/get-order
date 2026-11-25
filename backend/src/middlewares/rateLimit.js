import rateLimit from 'express-rate-limit';

function inteiroEnv(nome, padrao) {
  const bruto = process.env[nome];
  if (bruto === undefined || bruto === '') return padrao;
  const n = Number(bruto);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : padrao;
}

function handler429(req, res) {
  res.status(429).json({
    erro: 'Muitas requisições. Aguarde um momento e tente novamente.',
  });
}

/** Limite geral em `/api` (default: 200 req / 15 min por IP). */
export const limiteGeral = rateLimit({
  windowMs: inteiroEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  max: inteiroEnv('RATE_LIMIT_MAX', 200),
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler429,
});

/** Limite restrito em login/cadastro (default: 20 req / 15 min por IP). */
export const limiteAuth = rateLimit({
  windowMs: inteiroEnv('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000),
  max: inteiroEnv('RATE_LIMIT_AUTH_MAX', 20),
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler429,
});
