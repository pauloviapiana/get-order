import axios from 'axios';
import { limparSessao } from './sessao';

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

// 401 em requisição autenticada = token expirado (30 min) ou conta desativada.
// 401 do login (senha errada) não leva token e não derruba nada.
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && error.config?.headers?.Authorization) {
    limparSessao();
    window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
  }

  return Promise.reject(error);
});

export default api;
