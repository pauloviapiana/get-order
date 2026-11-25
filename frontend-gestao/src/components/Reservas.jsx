import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

const STATUS = ['pendente', 'confirmada', 'cancelada', 'concluida'];

// Ações por status atual (FASE0_REGRAS.md §3); admin e funcionario podem todas
const ACOES = {
  pendente: [
    { status: 'confirmada', rotulo: 'Confirmar' },
    { status: 'cancelada', rotulo: 'Cancelar' },
  ],
  confirmada: [
    { status: 'concluida', rotulo: 'Concluir' },
    { status: 'cancelada', rotulo: 'Cancelar' },
  ],
  cancelada: [],
  concluida: [],
};

const formatarData = (iso) => iso.split('-').reverse().join('/');

/** Todas as reservas (admin/funcionario) com filtros simples e mudança de status. */
function Reservas() {
  const [reservas, setReservas] = useState([]);
  const [filtros, setFiltros] = useState({ data: '', status: '', cliente: '' });
  const [erro, setErro] = useState('');

  function carregar() {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));

    api
      .get('/reservas', { params })
      .then((res) => {
        setReservas(res.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar reservas.')));
  }

  useEffect(carregar, []);

  function filtrar(event) {
    event.preventDefault();
    carregar();
  }

  async function mudarStatus(reserva, status) {
    try {
      await api.patch(`/reservas/${reserva.id}/status`, { status });
      carregar();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao alterar status.'));
    }
  }

  return (
    <div>
      <form className="filtros" onSubmit={filtrar}>
        <input
          type="date"
          value={filtros.data}
          onChange={(e) => setFiltros({ ...filtros, data: e.target.value })}
          aria-label="Data"
        />
        <select
          value={filtros.status}
          onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
          aria-label="Status"
        >
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          placeholder="Nome do cliente"
          value={filtros.cliente}
          onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
        />
        <button type="submit">Filtrar</button>
      </form>

      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {reservas.length === 0 ? (
        <p className="nota">Nenhuma reserva encontrada.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Mesa</th>
              <th>Pessoas</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Observações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{formatarData(r.data_reserva)}</td>
                <td>{r.horario}</td>
                <td>{r.mesa?.identificacao}</td>
                <td>{r.quantidade_pessoas}</td>
                <td>{r.cliente?.nome}</td>
                <td>{r.status}</td>
                <td>{r.observacoes || '—'}</td>
                <td className="acoes">
                  {ACOES[r.status].map((acao) => (
                    <button key={acao.status} type="button" onClick={() => mudarStatus(r, acao.status)}>
                      {acao.rotulo}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Reservas;
