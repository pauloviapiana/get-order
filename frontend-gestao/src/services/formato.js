// A API devolve valores monetários como string decimal ("12.50"; resultado pode ser negativo)
export const formatarPreco = (valor) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarData = (iso) => iso.split('-').reverse().join('/');
