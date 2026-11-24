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

export function mensagemDeErro(error, padrao) {
  const data = error.response?.data;
  const detalhe = data?.detalhes?.[0]?.mensagem;
  return detalhe || data?.erro || padrao;
}
