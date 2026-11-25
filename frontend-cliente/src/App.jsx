import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import api, { EVENTO_SESSAO_EXPIRADA } from './services/api';
import { MENSAGEM_PERFIL_GESTAO, encerrarSessao, lerUsuario, limparSessao, salvarSessao } from './services/sessao';
import Cadastro from './components/Cadastro';
import Cardapio from './components/Cardapio';
import Login from './components/Login';
import MeusPedidos from './components/MeusPedidos';
import MinhasReservas from './components/MinhasReservas';
import NovaReserva from './components/NovaReserva';

const NAV = [
  { to: '/reservar', rotulo: 'Reservar' },
  { to: '/minhas-reservas', rotulo: 'Minhas reservas' },
  { to: '/cardapio', rotulo: 'Cardápio e pedido' },
  { to: '/meus-pedidos', rotulo: 'Meus pedidos' },
];

function usuarioInicial() {
  const usuario = lerUsuario();
  if (usuario && usuario.perfil !== 'cliente') {
    limparSessao();
    return null;
  }
  return usuario;
}

function ShellPublico({ aviso, children }) {
  return (
    <div className="page page-auth">
      <div className="auth-panel">
        <p className="brand-mark">Get Order</p>
        <h1 className="brand-title">Cliente</h1>
        <p className="lede">Reserve sua mesa, veja o cardápio e acompanhe seus pedidos.</p>
        {aviso && (
          <p className="mensagem-erro" role="alert">
            {aviso}
          </p>
        )}
        <nav className="abas" aria-label="Acesso">
          <NavLink to="/login" className={({ isActive }) => (isActive ? 'ativa' : undefined)}>
            Entrar
          </NavLink>
          <NavLink to="/cadastro" className={({ isActive }) => (isActive ? 'ativa' : undefined)}>
            Criar conta
          </NavLink>
        </nav>
        {children}
      </div>
    </div>
  );
}

function ShellApp({ usuario, onSair, children }) {
  return (
    <div className="page page-app">
      <header className="topo">
        <div className="topo-brand">
          <Link to="/reservar" className="brand-mark">
            Get Order
          </Link>
          <span className="topo-sub">Cliente</span>
        </div>
        <div className="topo-user">
          <span>
            {usuario.nome} (<strong>{usuario.perfil}</strong>)
          </span>
          <button type="button" className="btn-ghost" onClick={onSair}>
            Sair
          </button>
        </div>
      </header>

      <nav className="abas" aria-label="Seções">
        {NAV.map(({ to, rotulo }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'ativa' : undefined)}>
            {rotulo}
          </NavLink>
        ))}
      </nav>

      <div className="conteudo">{children}</div>
    </div>
  );
}

function RotaPrivada({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function RotaPublica({ usuario, children }) {
  if (usuario) return <Navigate to="/reservar" replace />;
  return children;
}

function App() {
  const [usuario, setUsuario] = useState(usuarioInicial);
  const [aviso, setAviso] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionStorage.getItem('token')) return;

    api
      .get('/auth/me')
      .then((res) => {
        if (res.data.perfil !== 'cliente') {
          limparSessao();
          setUsuario(null);
          setAviso(MENSAGEM_PERFIL_GESTAO);
        } else {
          setUsuario(res.data);
        }
      })
      .catch(() => {
        limparSessao();
        setUsuario(null);
      });
  }, []);

  useEffect(() => {
    function expirou() {
      setUsuario(null);
      setAviso('Sua sessão expirou. Entre novamente.');
      navigate('/login', { replace: true });
    }

    window.addEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, expirou);
  }, [navigate]);

  function entrar(dados) {
    salvarSessao(dados);
    setUsuario(dados.usuario);
    setAviso('');
    navigate('/reservar', { replace: true });
  }

  async function sair() {
    await encerrarSessao(api);
    setUsuario(null);
    setAviso('');
    navigate('/login', { replace: true });
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RotaPublica usuario={usuario}>
            <ShellPublico aviso={aviso}>
              <Login onLogin={entrar} />
            </ShellPublico>
          </RotaPublica>
        }
      />
      <Route
        path="/cadastro"
        element={
          <RotaPublica usuario={usuario}>
            <ShellPublico aviso={aviso}>
              <Cadastro onLogin={entrar} />
            </ShellPublico>
          </RotaPublica>
        }
      />
      <Route
        path="/reservar"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <NovaReserva />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/minhas-reservas"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <MinhasReservas />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/cardapio"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Cardapio />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/meus-pedidos"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <MeusPedidos />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route path="/" element={<Navigate to={usuario ? '/reservar' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={usuario ? '/reservar' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
