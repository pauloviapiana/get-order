import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

/** Lista de mesas (admin/funcionario). Só admin cria, edita e ativa/desativa. */
function Mesas({ ehAdmin }) {
  const [mesas, setMesas] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [nova, setNova] = useState({ identificacao: '', capacidade: 2 });
  const [editando, setEditando] = useState(null);

  function carregar() {
    setCarregando(true);
    api
      .get('/mesas')
      .then((res) => {
        setMesas(res.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar mesas.')))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function executar(acao, padrao) {
    setErro('');
    setEnviando(true);
    try {
      await acao();
      carregar();
      return true;
    } catch (error) {
      setErro(mensagemDeErro(error, padrao));
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function criar(event) {
    event.preventDefault();
    const ok = await executar(
      () => api.post('/mesas', { identificacao: nova.identificacao, capacidade: Number(nova.capacidade) }),
      'Falha ao criar mesa.'
    );
    if (ok) setNova({ identificacao: '', capacidade: 2 });
  }

  async function salvarEdicao() {
    const ok = await executar(
      () =>
        api.patch(`/mesas/${editando.id}`, {
          identificacao: editando.identificacao,
          capacidade: Number(editando.capacidade),
        }),
      'Falha ao salvar mesa.'
    );
    if (ok) setEditando(null);
  }

  function alternarAtiva(mesa) {
    executar(
      () => api.patch(`/mesas/${mesa.id}/ativa`, { ativa: !mesa.ativa }),
      'Falha ao alterar mesa.'
    );
  }

  return (
    <div>
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {carregando && <p>Carregando mesas…</p>}
      {!carregando && mesas.length === 0 ? (
        <p className="nota">Nenhuma mesa cadastrada.</p>
      ) : (
        !carregando && (
          <table className="tabela">
            <thead>
              <tr>
                <th>ID</th>
                <th>Identificação</th>
                <th>Capacidade</th>
                <th>Ativa</th>
                {ehAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) =>
                editando?.id === m.id ? (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>
                      <input
                        value={editando.identificacao}
                        onChange={(e) => setEditando({ ...editando, identificacao: e.target.value })}
                        disabled={enviando}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={editando.capacidade}
                        onChange={(e) => setEditando({ ...editando, capacidade: e.target.value })}
                        disabled={enviando}
                      />
                    </td>
                    <td>{m.ativa ? 'sim' : 'não'}</td>
                    <td className="acoes">
                      <button type="button" onClick={salvarEdicao} disabled={enviando}>
                        Salvar
                      </button>
                      <button type="button" onClick={() => setEditando(null)} disabled={enviando}>
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={m.id}>
                    <td>{m.id}</td>
                    <td>{m.identificacao}</td>
                    <td>{m.capacidade}</td>
                    <td>{m.ativa ? 'sim' : 'não'}</td>
                    {ehAdmin && (
                      <td className="acoes">
                        <button type="button" onClick={() => setEditando({ ...m })} disabled={enviando}>
                          Editar
                        </button>
                        <button type="button" onClick={() => alternarAtiva(m)} disabled={enviando}>
                          {m.ativa ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        )
      )}

      {ehAdmin && (
        <form className="formulario" onSubmit={criar}>
          <strong>Nova mesa</strong>
          <label htmlFor="mesa-ident">Identificação</label>
          <input
            id="mesa-ident"
            value={nova.identificacao}
            onChange={(e) => setNova({ ...nova, identificacao: e.target.value })}
            disabled={enviando}
            required
          />
          <label htmlFor="mesa-cap">Capacidade</label>
          <input
            id="mesa-cap"
            type="number"
            min="1"
            value={nova.capacidade}
            onChange={(e) => setNova({ ...nova, capacidade: e.target.value })}
            disabled={enviando}
            required
          />
          <button type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Criar mesa'}
          </button>
        </form>
      )}
    </div>
  );
}

export default Mesas;
