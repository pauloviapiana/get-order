import { useEffect, useState } from 'react';
import api from './services/api';

function App() {
  const [health, setHealth] = useState('carregando…');

  useEffect(() => {
    let ativo = true;

    api
      .get('/health')
      .then((res) => {
        if (!ativo) return;
        setHealth(res.data?.ok ? 'ok' : JSON.stringify(res.data));
      })
      .catch((err) => {
        if (!ativo) return;
        setHealth(`erro: ${err.message}`);
      });

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <main className="app">
      <h1>get-order — Gestão</h1>
      <p>
        API health: <strong>{health}</strong>
      </p>
    </main>
  );
}

export default App;
