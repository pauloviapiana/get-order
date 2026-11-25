import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import api, { EVENTO_SESSAO_EXPIRADA } from './services/api';
import {
  MENSAGEM_PERFIL_CLIENTE,
  PERFIS_GESTAO,
  encerrarSessao,
  lerUsuario,
  limparSessao,
  salvarSessao,
} from './services/sessao';
import Cardapio from './components/Cardapio';
import Compras from './components/Compras';
import Financeiro from './components/Financeiro';
import Login from './components/Login';
import Mesas from './components/Mesas';
import Pedidos from './components/Pedidos';
import Reservas from './components/Reservas';
import Usuarios from './components/Usuarios';

function usuarioInicial() {
  const usuario = lerUsuario();
  if (usuario && !PERFIS_GESTAO.includes(usuario.perfil)) {
    limparSessao();
    return null;
  }
  return usuario;
}

function navDoPerfil(ehAdmin) {
  const base = [
    { to: '/reservas', rotulo: 'Reservas' },
    { to: '/pedidos', rotulo: 'Pedidos' },
    { to: '/mesas', rotulo: 'Mesas' },
    { to: '/cardapio', rotulo: 'Cardápio' },
  ];
  if (!ehAdmin) return [...base, { to: '/financeiro', rotulo: 'Minhas comissões' }];
  return [
    ...base,
    { to: '/compras', rotulo: 'Compras' },
    { to: '/financeiro', rotulo: 'Financeiro' },
    { to: '/usuarios', rotulo: 'Usuários' },
  ];
}

function ShellLogin({ aviso, children }) {
  return (
    <div className="page page-auth">
      <div className="auth-panel">
        <p className="brand-mark">Get Order</p>
        <h1 className="brand-title">Gestão</h1>
        <p className="lede">Acesso para administradores e funcionários.</p>
        {aviso && (
          <p className="mensagem-erro" role="alert">
            {aviso}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function ShellApp({ usuario, onSair, children }) {
  const ehAdmin = usuario.perfil === 'admin';

  return (
    <div className="page page-app">
      <header className="topo">
        <div className="topo-brand">
          <Link to="/reservas" className="brand-mark">
            Get Order
          </Link>
          <span className="topo-sub">Gestão</span>
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

      <nav className="abas" aria-label="Módulos">
        {navDoPerfil(ehAdmin).map(({ to, rotulo }) => (
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

function RotaAdmin({ usuario, children }) {
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.perfil !== 'admin') return <Navigate to="/reservas" replace />;
  return children;
}

function RotaPublica({ usuario, children }) {
  if (usuario) return <Navigate to="/reservas" replace />;
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
        if (!PERFIS_GESTAO.includes(res.data.perfil)) {
          limparSessao();
          setUsuario(null);
          setAviso(MENSAGEM_PERFIL_CLIENTE);
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
    navigate('/reservas', { replace: true });
  }

  async function sair() {
    await encerrarSessao(api);
    setUsuario(null);
    setAviso('');
    navigate('/login', { replace: true });
  }

  const ehAdmin = usuario?.perfil === 'admin';

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RotaPublica usuario={usuario}>
            <ShellLogin aviso={aviso}>
              <Login onLogin={entrar} />
            </ShellLogin>
          </RotaPublica>
        }
      />
      <Route
        path="/reservas"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Reservas />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/pedidos"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Pedidos ehAdmin={ehAdmin} />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/mesas"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Mesas ehAdmin={ehAdmin} />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/cardapio"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Cardapio ehAdmin={ehAdmin} />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/compras"
        element={
          <RotaAdmin usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Compras />
            </ShellApp>
          </RotaAdmin>
        }
      />
      <Route
        path="/financeiro"
        element={
          <RotaPrivada usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Financeiro ehAdmin={ehAdmin} />
            </ShellApp>
          </RotaPrivada>
        }
      />
      <Route
        path="/usuarios"
        element={
          <RotaAdmin usuario={usuario}>
            <ShellApp usuario={usuario} onSair={sair}>
              <Usuarios />
            </ShellApp>
          </RotaAdmin>
        }
      />
      <Route path="/" element={<Navigate to={usuario ? '/reservas' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={usuario ? '/reservas' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
