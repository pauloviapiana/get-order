import { useEffect, useState } from 'react';
import api from './services/api';
import { lerUsuario, limparSessao, salvarSessao } from './services/sessao';
import Cadastro from './components/Cadastro';
import Login from './components/Login';

function App() {
  const [usuario, setUsuario] = useState(lerUsuario);
  const [aba, setAba] = useState('login');

  // Token salvo pode ter expirado (30 min): confirma com a API ao abrir
  useEffect(() => {
    if (!sessionStorage.getItem('token')) return;

    api.get('/auth/me').catch(() => {
      limparSessao();
      setUsuario(null);
    });
  }, []);

  function entrar(dados) {
    salvarSessao(dados);
    setUsuario(dados.usuario);
  }

  function sair() {
    limparSessao();
    setUsuario(null);
    setAba('login');
  }

  if (usuario) {
    return (
      <main className="app">
        <h1>get-order — Cliente</h1>
        <section className="cartao">
          <p>
            Olá, <strong>{usuario.nome}</strong>
          </p>
          <p>
            Perfil: <strong>{usuario.perfil}</strong>
          </p>
          <button type="button" onClick={sair}>
            Sair
          </button>
        </section>
        <p className="nota">Cardápio, pedidos e reservas chegam nas próximas fases.</p>
      </main>
    );
  }

  return (
    <main className="app">
      <h1>get-order — Cliente</h1>
      <nav className="abas">
        <button type="button" className={aba === 'login' ? 'ativa' : ''} onClick={() => setAba('login')}>
          Entrar
        </button>
        <button type="button" className={aba === 'cadastro' ? 'ativa' : ''} onClick={() => setAba('cadastro')}>
          Criar conta
        </button>
      </nav>
      {aba === 'login' ? <Login onLogin={entrar} /> : <Cadastro onLogin={entrar} />}
    </main>
  );
}

export default App;
