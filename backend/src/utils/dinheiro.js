/**
 * Valores monetários em centavos (inteiros) para não depender de ponto flutuante.
 * O pg devolve DECIMAL(10,2) como string ("24.90"); a API responde no mesmo formato.
 */

/** Maior valor que cabe em DECIMAL(10,2): 99.999.999,99. */
export const LIMITE_CENTAVOS = 9_999_999_999;

/** "24.90" | "24.9" | "24" | 24.9 → 2490. */
export function paraCentavos(valor) {
  const texto = typeof valor === 'number' ? valor.toFixed(2) : String(valor);
  const [inteiro, fracao = ''] = texto.split('.');
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0').slice(0, 2));
}

/** 2490 → "24.90". */
export function deCentavos(centavos) {
  const inteiro = Math.floor(centavos / 100);
  const fracao = String(centavos % 100).padStart(2, '0');
  return `${inteiro}.${fracao}`;
}

/** 10% arredondado em 2 casas, meio para cima (igual ao ROUND do Postgres): 8655 → 866. */
export function comissaoCentavos(totalCentavos) {
  return Math.floor((totalCentavos + 5) / 10);
}
