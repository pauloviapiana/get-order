import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatarData } from '../services/formato';
import { mensagemDeErro } from '../services/sessao';

const CANCELAVEIS = ['pendente', 'confirmada'];

/** GET /reservas (a API devolve só as do cliente logado) + cancelar. */
function MinhasReservas() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);

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

  useEffect(carregar, []);

  async function cancelar(reserva) {
    const pergunta =
      `Cancelar a reserva de ${formatarData(reserva.data_reserva)} às ${reserva.horario}?\n` +
      'Pedidos vinculados a ela não são cancelados automaticamente.';
    if (!window.confirm(pergunta)) return;

    setErro('');
    setMensagem('');
    setProcessandoId(reserva.id);

    try {
      await api.patch(`/reservas/${reserva.id}/status`, { status: 'cancelada' });
      setMensagem(
        `Reserva de ${formatarData(reserva.data_reserva)} às ${reserva.horario} cancelada. ` +
          'Se houver pedido vinculado, cancele-o em "Meus pedidos" enquanto estiver aberto.',
      );
      carregar();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao cancelar.'));
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <section>
      <h2>Minhas reservas</h2>
      {mensagem && (
        <p className="mensagem-sucesso" role="status">
          {mensagem}
        </p>
      )}
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {carregando && reservas.length === 0 ? (
        <p className="nota">Carregando reservas…</p>
      ) : (
        !erro &&
        reservas.length === 0 && (
          <p className="nota">
            Você ainda não tem reservas.{' '}
            <button type="button" className="link" onClick={() => navigate('/reservar')}>
              Reservar uma mesa
            </button>
          </p>
        )
      )}

      {reservas.length > 0 && (
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
                    <button type="button" onClick={() => cancelar(r)} disabled={processandoId !== null}>
                      {processandoId === r.id ? 'Cancelando…' : 'Cancelar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default MinhasReservas;
