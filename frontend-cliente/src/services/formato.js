// A API devolve valores monetários como string decimal ("12.50")
export const formatarPreco = (preco) =>
  Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarData = (iso) => iso.split('-').reverse().join('/');
