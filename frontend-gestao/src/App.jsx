import { useEffect, useState } from 'react';
import api from './services/api';
import { lerUsuario, limparSessao, salvarSessao } from './services/sessao';
import Cardapio from './components/Cardapio';
import Compras from './components/Compras';
import Financeiro from './components/Financeiro';
import Login from './components/Login';
import Mesas from './components/Mesas';
import Pedidos from './components/Pedidos';
import Reservas from './components/Reservas';
import Usuarios from './components/Usuarios';

function App() {
  const [usuario, setUsuario] = useState(lerUsuario);
  const [aba, setAba] = useState('reservas');

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
    setAba('reservas');
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

  const ehAdmin = usuario.perfil === 'admin';

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

      <nav className="abas">
        {abasDoPerfil(ehAdmin).map(({ id, rotulo }) => (
          <button key={id} type="button" className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>
            {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'reservas' && <Reservas />}
      {aba === 'pedidos' && <Pedidos ehAdmin={ehAdmin} />}
      {aba === 'mesas' && <Mesas ehAdmin={ehAdmin} />}
      {aba === 'cardapio' && <Cardapio ehAdmin={ehAdmin} />}
      {aba === 'compras' && ehAdmin && <Compras />}
      {aba === 'financeiro' && <Financeiro ehAdmin={ehAdmin} />}
      {aba === 'usuarios' && ehAdmin && <Usuarios />}
    </main>
  );
}

function abasDoPerfil(ehAdmin) {
  const abas = [
    { id: 'reservas', rotulo: 'Reservas' },
    { id: 'pedidos', rotulo: 'Pedidos' },
    { id: 'mesas', rotulo: 'Mesas' },
    { id: 'cardapio', rotulo: 'Cardápio' },
  ];
  if (!ehAdmin) return [...abas, { id: 'financeiro', rotulo: 'Minhas comissões' }];
  return [
    ...abas,
    { id: 'compras', rotulo: 'Compras' },
    { id: 'financeiro', rotulo: 'Financeiro' },
    { id: 'usuarios', rotulo: 'Usuários' },
  ];
}

export default App;
