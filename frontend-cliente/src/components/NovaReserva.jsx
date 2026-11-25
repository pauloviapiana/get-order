import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

// Mesma lista fixa do backend (services/regrasReserva.js); a API é quem valida
const HORARIOS = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];

/** Consulta mesas livres no slot e cria a reserva (POST /reservas). */
function NovaReserva({ onCriada }) {
  const [mesasAtivas, setMesasAtivas] = useState([]);
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('19:00');
  const [pessoas, setPessoas] = useState(2);
  const [observacoes, setObservacoes] = useState('');
  const [livres, setLivres] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api
      .get('/mesas')
      .then((res) => setMesasAtivas(res.data))
      .catch(() => setMesasAtivas([]));
  }, []);

  async function consultar(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setLivres(null);
    setCarregando(true);

    try {
      const res = await api.get('/mesas/disponibilidade', { params: { data, horario, pessoas } });
      setLivres(res.data.mesas);
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao consultar disponibilidade.'));
    } finally {
      setCarregando(false);
    }
  }

  async function reservar(mesa) {
    setErro('');
    setCarregando(true);

    try {
      await api.post('/reservas', {
        mesaId: mesa.id,
        data_reserva: data,
        horario,
        quantidade_pessoas: Number(pessoas),
        observacoes,
      });
      setMensagem(`Reserva da mesa ${mesa.identificacao} enviada (pendente de confirmação).`);
      setLivres(null);
      setObservacoes('');
      onCriada();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao reservar.'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <p className="nota">
        Reservas às sextas, sábados e domingos, das 18:00 às 22:30.
        {mesasAtivas.length > 0 &&
          ` Mesas: ${mesasAtivas.map((m) => `${m.identificacao} (${m.capacidade})`).join(', ')}.`}
      </p>

      <form className="formulario" onSubmit={consultar}>
        <label htmlFor="reserva-data">Data</label>
        <input id="reserva-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />

        <label htmlFor="reserva-horario">Horário</label>
        <select id="reserva-horario" value={horario} onChange={(e) => setHorario(e.target.value)}>
          {HORARIOS.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>

        <label htmlFor="reserva-pessoas">Pessoas</label>
        <input
          id="reserva-pessoas"
          type="number"
          min="1"
          value={pessoas}
          onChange={(e) => setPessoas(e.target.value)}
          required
        />

        <label htmlFor="reserva-obs">Observações (opcional)</label>
        <input id="reserva-obs" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />

        <button type="submit" disabled={carregando}>
          Ver mesas livres
        </button>
      </form>

      {livres && livres.length === 0 && <p className="nota">Nenhuma mesa livre nesse horário.</p>}
      {livres && livres.length > 0 && (
        <div className="lista-acoes">
          {livres.map((mesa) => (
            <button key={mesa.id} type="button" onClick={() => reservar(mesa)} disabled={carregando}>
              Reservar {mesa.identificacao} ({mesa.capacidade} lugares)
            </button>
          ))}
        </div>
      )}

      {mensagem && <p className="nota">{mensagem}</p>}
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

export default NovaReserva;
