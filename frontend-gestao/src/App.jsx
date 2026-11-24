import { useEffect, useState } from 'react';
import api from './services/api';
import { lerUsuario, limparSessao, salvarSessao } from './services/sessao';
import Login from './components/Login';
import Usuarios from './components/Usuarios';

function App() {
  const [usuario, setUsuario] = useState(lerUsuario);

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
  }

  if (!usuario) {
    return (
      <main className="app">
        <h1>get-order — Gestão</h1>
        <p className="nota">Acesso para administradores e funcionários.</p>
        <Login onLogin={entrar} />
      </main>
    );
  }

  return (
    <main className="app app-larga">
      <header className="topo">
        <h1>get-order — Gestão</h1>
        <div>
          <span>
            {usuario.nome} (<strong>{usuario.perfil}</strong>)
          </span>{' '}
          <button type="button" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      {usuario.perfil === 'admin' ? (
        <section>
          <h2>Usuários</h2>
          <Usuarios />
        </section>
      ) : (
        <p className="nota">Reservas, pedidos e mesas chegam nas próximas fases.</p>
      )}
    </main>
  );
}

export default App;
