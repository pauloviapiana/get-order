import { useEffect, useState } from 'react';
import api, { EVENTO_SESSAO_EXPIRADA } from './services/api';
import { MENSAGEM_PERFIL_GESTAO, lerUsuario, limparSessao, salvarSessao } from './services/sessao';
import Cadastro from './components/Cadastro';
import Cardapio from './components/Cardapio';
import Login from './components/Login';
import MeusPedidos from './components/MeusPedidos';
import MinhasReservas from './components/MinhasReservas';
import NovaReserva from './components/NovaReserva';

const ABAS = [
  { id: 'reservar', rotulo: 'Reservar' },
  { id: 'reservas', rotulo: 'Minhas reservas' },
  { id: 'cardapio', rotulo: 'Cardápio e pedido' },
  { id: 'pedidos', rotulo: 'Meus pedidos' },
];

// Sessão gravada antes do gate de perfil (ou adulterada) não entra
function usuarioInicial() {
  const usuario = lerUsuario();
  if (usuario && usuario.perfil !== 'cliente') {
    limparSessao();
    return null;
  }
  return usuario;
}

function App() {
  const [usuario, setUsuario] = useState(usuarioInicial);
  const [acesso, setAcesso] = useState('login');
  const [aba, setAba] = useState('reservar');
  const [aviso, setAviso] = useState('');

  // Token salvo pode ter expirado (30 min): confirma com a API ao abrir
  useEffect(() => {
    if (!sessionStorage.getItem('token')) return;

    api
      .get('/auth/me')
      .then((res) => {
        if (res.data.perfil !== 'cliente') {
          limparSessao();
          setUsuario(null);
          setAviso(MENSAGEM_PERFIL_GESTAO);
        }
      })
      .catch(() => {
        limparSessao();
        setUsuario(null);
      });
  }, []);

  // Qualquer 401 em requisição autenticada (ver services/api.js) volta para o login
  useEffect(() => {
    function expirou() {
      setUsuario(null);
      setAcesso('login');
      setAviso('Sua sessão expirou. Entre novamente.');
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, []);

  function entrar(dados) {
    salvarSessao(dados);
    setUsuario(dados.usuario);
    setAba('reservar');
    setAviso('');
  }

  function sair() {
    limparSessao();
    setUsuario(null);
    setAcesso('login');
  }

  function trocarAcesso(destino) {
    setAcesso(destino);
    setAviso('');
  }

  if (!usuario) {
    return (
      <main className="app">
        <h1>get-order — Cliente</h1>
        <p className="nota">Reserve sua mesa, veja o cardápio e acompanhe seus pedidos.</p>
        {aviso && (
          <p className="mensagem-erro" role="alert">
            {aviso}
          </p>
        )}
        <nav className="abas">
          <button type="button" className={acesso === 'login' ? 'ativa' : ''} onClick={() => trocarAcesso('login')}>
            Entrar
          </button>
          <button
            type="button"
            className={acesso === 'cadastro' ? 'ativa' : ''}
            onClick={() => trocarAcesso('cadastro')}
          >
            Criar conta
          </button>
        </nav>
        {acesso === 'login' ? <Login onLogin={entrar} /> : <Cadastro onLogin={entrar} />}
      </main>
    );
  }

  return (
    <main className="app app-larga">
      <header className="topo">
        <h1>get-order — Cliente</h1>
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
        {ABAS.map(({ id, rotulo }) => (
          <button key={id} type="button" className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>
            {rotulo}
          </button>
        ))}
      </nav>

      {aba === 'reservar' && <NovaReserva onVerReservas={() => setAba('reservas')} />}
      {aba === 'reservas' && <MinhasReservas onReservar={() => setAba('reservar')} />}
      {aba === 'cardapio' && <Cardapio onVerPedidos={() => setAba('pedidos')} />}
      {aba === 'pedidos' && <MeusPedidos onPedir={() => setAba('cardapio')} />}
    </main>
  );
}

export default App;
