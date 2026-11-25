import axios from 'axios';
import { limparSessao, salvarSessao } from './sessao';

export const EVENTO_SESSAO_EXPIRADA = 'sessao-expirada';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshEmAndamento = null;

async function tentarRefresh() {
  const refreshToken = sessionStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('Sem refresh token');
  }

  // Cliente sem interceptors para não reentrar no fluxo de 401
  const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
    refreshToken,
  });

  salvarSessao(data);
  return data.token;
}

// 401 em requisição autenticada: tenta refresh uma vez; se falhar, encerra a sessão.
// 401 do login (senha errada) não leva token e não derruba nada.
api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  const status = error.response?.status;
  const tinhaAuth = Boolean(original?.headers?.Authorization);
  const eRefresh = original?.url?.includes('/auth/refresh');

  if (status !== 401 || !tinhaAuth || original?._retry || eRefresh) {
    if (status === 401 && tinhaAuth && !eRefresh) {
      // Já tentou refresh ou não há como recuperar
    }
    if (status === 401 && tinhaAuth && (original?._retry || eRefresh)) {
      limparSessao();
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    }
    return Promise.reject(error);
  }

  original._retry = true;

  try {
    if (!refreshEmAndamento) {
      refreshEmAndamento = tentarRefresh().finally(() => {
        refreshEmAndamento = null;
      });
    }
    const novoToken = await refreshEmAndamento;
    original.headers.Authorization = `Bearer ${novoToken}`;
    return api(original);
  } catch {
    limparSessao();
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
    return Promise.reject(error);
  }
});

export default api;
