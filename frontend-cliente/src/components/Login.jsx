import { useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const resposta = await api.post('/auth/login', { email, senha });
      onLogin(resposta.data);
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao entrar.'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={entrar}>
      <label htmlFor="login-email">E-mail</label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={carregando}
        required
      />

      <label htmlFor="login-senha">Senha</label>
      <input
        id="login-senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        disabled={carregando}
        required
      />

      <button type="submit" disabled={carregando}>
        {carregando ? 'Entrando…' : 'Entrar'}
      </button>

      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}

export default Login;
