import { useState } from 'react';
import api from '../services/api';
import { MENSAGEM_PERFIL_GESTAO, mensagemDeErro } from '../services/sessao';

/** Auto-cadastro público (perfil `cliente` definido pela API). Entra logo em seguida. */
function Cadastro({ onLogin }) {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  function alterar(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function cadastrar(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await api.post('/auth/register', form);
      const resposta = await api.post('/auth/login', { email: form.email, senha: form.senha });

      // A API força `cliente`; gate defensivo igual ao Login
      if (resposta.data.usuario.perfil !== 'cliente') {
        setErro(MENSAGEM_PERFIL_GESTAO);
        return;
      }

      onLogin(resposta.data);
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao cadastrar.'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={cadastrar}>
      <label htmlFor="cad-nome">Nome</label>
      <input id="cad-nome" name="nome" value={form.nome} onChange={alterar} disabled={carregando} required />

      <label htmlFor="cad-email">E-mail</label>
      <input
        id="cad-email"
        name="email"
        type="email"
        value={form.email}
        onChange={alterar}
        disabled={carregando}
        required
      />

      <label htmlFor="cad-telefone">Telefone (opcional)</label>
      <input id="cad-telefone" name="telefone" value={form.telefone} onChange={alterar} disabled={carregando} />

      <label htmlFor="cad-senha">Senha (mín. 6 caracteres)</label>
      <input
        id="cad-senha"
        name="senha"
        type="password"
        minLength={6}
        value={form.senha}
        onChange={alterar}
        disabled={carregando}
        required
      />

      <button type="submit" disabled={carregando}>
        {carregando ? 'Cadastrando…' : 'Criar conta'}
      </button>

      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}

export default Cadastro;
