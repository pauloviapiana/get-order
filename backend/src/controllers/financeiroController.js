import { periodoQuerySchema } from '../schemas/financeiroSchemas.js';
import * as financeiroService from '../services/financeiroService.js';

export async function resumo(req, res) {
  const periodo = periodoQuerySchema.parse(req.query);
  res.json(await financeiroService.resumo(periodo));
}

export async function comissoes(req, res) {
  const periodo = periodoQuerySchema.parse(req.query);
  res.json(await financeiroService.comissoes(req.usuario, periodo));
}
