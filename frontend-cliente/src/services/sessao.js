export const MENSAGEM_PERFIL_GESTAO =
  'Este site é para clientes. Administradores e funcionários usam o site de gestão (http://localhost:5174).';

export function salvarSessao({ token, refreshToken, usuario }) {
  sessionStorage.setItem('token', token);
  if (refreshToken) {
    sessionStorage.setItem('refreshToken', refreshToken);
  }
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
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('usuario');
}

/** Invalida o refresh no servidor (best-effort) e limpa o sessionStorage. */
export async function encerrarSessao(apiClient) {
  const refreshToken = sessionStorage.getItem('refreshToken');
  try {
    if (refreshToken && apiClient) {
      await apiClient.post('/auth/logout', { refreshToken });
    }
  } catch {
    // Logout local mesmo se a API falhar
  }
  limparSessao();
}

/** `erro` da API + primeiro item de `detalhes` (Zod), sem expor nada além disso. */
export function mensagemDeErro(error, padrao) {
  if (!error.response) return 'Não foi possível conectar à API. Verifique se o servidor está no ar.';

  const data = error.response.data;
  const detalhe = data?.detalhes?.[0]?.mensagem;
  if (data?.erro && detalhe) return `${data.erro}: ${detalhe}`;
  return detalhe || data?.erro || padrao;
}
