/**
 * Relatórios financeiros (FASE0_REGRAS.md §5). Só leitura: a comissão de 10% já foi
 * gravada em `pedidos.valor_comissao` no pagamento (Fase 5).
 *
 * Período [de, ate] inclusivo, em datas "AAAA-MM-DD":
 * - pedidos `pago` filtrados pela data local (America/Sao_Paulo) de `pago_em`;
 * - compras filtradas por `data_compra`.
 */
import { QueryTypes } from 'sequelize';
import { sequelize } from '../models/index.js';
import { deCentavos, paraCentavos } from '../utils/dinheiro.js';
import { FUSO } from './regrasReserva.js';

const DATA_PAGAMENTO_LOCAL = `(p.pago_em AT TIME ZONE '${FUSO}')::date`;

function condicoesPeriodo(coluna, { de, ate }) {
  return [de && `${coluna} >= :de`, ate && `${coluna} <= :ate`].filter(Boolean);
}

function clausulaWhere(condicoes) {
  return condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
}

/** SUM de DECIMAL no Postgres é exato; só normaliza a string para 2 casas ("0" → "0.00"). */
const normalizar = (valor) => deCentavos(paraCentavos(valor));

function consultar(sql, { de, ate }, extras = {}) {
  return sequelize.query(sql, {
    replacements: { de: de ?? null, ate: ate ?? null, ...extras },
    type: QueryTypes.SELECT,
  });
}

/** Resultado = vendas − despesas. Comissões ficam à parte (informativo), sem subtrair de novo. */
export async function resumo(periodo) {
  const filtroPedidos = ["p.status = 'pago'", ...condicoesPeriodo(DATA_PAGAMENTO_LOCAL, periodo)];
  const filtroCompras = condicoesPeriodo('c.data_compra', periodo);

  const [[vendas], [despesas]] = await Promise.all([
    consultar(
      `SELECT COUNT(*) AS quantidade,
              COALESCE(SUM(p.valor_total), 0) AS total,
              COALESCE(SUM(p.valor_comissao), 0) AS comissao
         FROM pedidos p
         ${clausulaWhere(filtroPedidos)}`,
      periodo
    ),
    consultar(
      `SELECT COUNT(*) AS quantidade, COALESCE(SUM(c.valor), 0) AS total
         FROM compras c
         ${clausulaWhere(filtroCompras)}`,
      periodo
    ),
  ]);

  const vendasCentavos = paraCentavos(vendas.total);
  const despesasCentavos = paraCentavos(despesas.total);

  return {
    periodo: { de: periodo.de ?? null, ate: periodo.ate ?? null },
    vendas: { quantidade_pedidos: Number(vendas.quantidade), valor_total: deCentavos(vendasCentavos) },
    despesas: { quantidade_compras: Number(despesas.quantidade), valor_total: deCentavos(despesasCentavos) },
    comissao_total: normalizar(vendas.comissao),
    resultado: deCentavos(vendasCentavos - despesasCentavos),
  };
}

/**
 * Comissões por garçom (pedidos `pago`). Admin vê todos; funcionário só as próprias
 * (`garcomId = solicitante.id`). Garçom sem pedido pago no período não aparece.
 */
export async function comissoes(solicitante, periodo) {
  const filtro = ["p.status = 'pago'", ...condicoesPeriodo(DATA_PAGAMENTO_LOCAL, periodo)];

  if (solicitante.perfil !== 'admin') {
    filtro.push('p."garcomId" = :garcomId');
  }

  const linhas = await consultar(
    `SELECT p."garcomId" AS "garcomId",
            u.nome,
            COUNT(*) AS quantidade_pedidos,
            COALESCE(SUM(p.valor_total), 0) AS valor_vendas,
            COALESCE(SUM(p.valor_comissao), 0) AS comissao_total
       FROM pedidos p
       JOIN usuarios u ON u.id = p."garcomId"
       ${clausulaWhere(filtro)}
      GROUP BY p."garcomId", u.nome
      ORDER BY SUM(p.valor_comissao) DESC, u.nome ASC`,
    periodo,
    { garcomId: solicitante.id }
  );

  const itens = linhas.map((linha) => ({
    garcomId: linha.garcomId,
    nome: linha.nome,
    quantidade_pedidos: Number(linha.quantidade_pedidos),
    valor_vendas: normalizar(linha.valor_vendas),
    comissao_total: normalizar(linha.comissao_total),
  }));

  return {
    periodo: { de: periodo.de ?? null, ate: periodo.ate ?? null },
    itens,
    total: {
      quantidade_pedidos: itens.reduce((soma, item) => soma + item.quantidade_pedidos, 0),
      comissao_total: deCentavos(itens.reduce((soma, item) => soma + paraCentavos(item.comissao_total), 0)),
    },
  };
}
