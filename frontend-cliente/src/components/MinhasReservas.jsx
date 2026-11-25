import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

const CANCELAVEIS = ['pendente', 'confirmada'];

const formatarData = (iso) => iso.split('-').reverse().join('/');

/** GET /reservas (a API devolve só as do cliente logado) + cancelar. */
function MinhasReservas({ versao }) {
  const [reservas, setReservas] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    setCarregando(true);
    api
      .get('/reservas')
      .then((res) => {
        setReservas(res.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar reservas.')))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, [versao]);

  async function cancelar(reserva) {
    const pergunta =
      `Cancelar a reserva de ${formatarData(reserva.data_reserva)} às ${reserva.horario}?\n` +
      'Pedidos vinculados a ela não são cancelados automaticamente.';
    if (!window.confirm(pergunta)) return;

    try {
      await api.patch(`/reservas/${reserva.id}/status`, { status: 'cancelada' });
      carregar();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao cancelar.'));
    }
  }

  if (carregando && reservas.length === 0) return <p>Carregando reservas…</p>;

  return (
    <div>
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
      {reservas.length === 0 ? (
        <p className="nota">Você ainda não tem reservas.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Horário</th>
              <th>Mesa</th>
              <th>Pessoas</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td>{formatarData(r.data_reserva)}</td>
                <td>{r.horario}</td>
                <td>{r.mesa?.identificacao}</td>
                <td>{r.quantidade_pessoas}</td>
                <td>{r.status}</td>
                <td>
                  {CANCELAVEIS.includes(r.status) && (
                    <button type="button" onClick={() => cancelar(r)}>
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MinhasReservas;
