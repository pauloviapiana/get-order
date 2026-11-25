export const MENSAGEM_PERFIL_GESTAO =
  'Este site é para clientes. Administradores e funcionários usam o site de gestão (http://localhost:5174).';

export function salvarSessao({ token, usuario }) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('usuario', JSON.stringify(usuario));
}

export function lerUsuario() {
  try {
    return JSON.parse(sessionStorage.getItem('usuario'));
  } catch {
    return null;
  }
}

export function limparSessao() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('usuario');
}

/** `erro` da API + primeiro item de `detalhes` (Zod), sem expor nada além disso. */
export function mensagemDeErro(error, padrao) {
  if (!error.response) return 'Não foi possível conectar à API. Verifique se o servidor está no ar.';

  const data = error.response.data;
  const detalhe = data?.detalhes?.[0]?.mensagem;
  if (data?.erro && detalhe) return `${data.erro}: ${detalhe}`;
  return detalhe || data?.erro || padrao;
}
