import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatarData, formatarPreco } from '../services/formato';
import { mensagemDeErro } from '../services/sessao';

const ROTULOS_STATUS = {
  aberto: 'aberto',
  em_preparo: 'em preparo',
  pronto: 'pronto',
  entregue: 'entregue',
  pago: 'pago',
  cancelado: 'cancelado',
};

/** GET /pedidos (a API devolve só os do cliente logado) + cancelar (aberto) e pagar (entregue). */
function MeusPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);

  function carregar() {
    setCarregando(true);
    api
      .get('/pedidos')
      .then((res) => {
        setPedidos(res.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar pedidos.')))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function mudarStatus(pedido, status, pergunta, sucesso) {
    if (!window.confirm(pergunta)) return;

    setErro('');
    setMensagem('');
    setProcessandoId(pedido.id);

    try {
      await api.patch(`/pedidos/${pedido.id}/status`, { status });
      setMensagem(sucesso);
      carregar();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao atualizar o pedido.'));
    } finally {
      setProcessandoId(null);
    }
  }

  function acoes(pedido) {
    const ocupado = processandoId !== null;
    const esteProcessando = processandoId === pedido.id;

    if (pedido.status === 'aberto') {
      return (
        <button
          type="button"
          disabled={ocupado}
          onClick={() =>
            mudarStatus(pedido, 'cancelado', `Cancelar o pedido #${pedido.id}?`, `Pedido #${pedido.id} cancelado.`)
          }
        >
          {esteProcessando ? 'Cancelando…' : 'Cancelar'}
        </button>
      );
    }

    if (pedido.status === 'entregue') {
      if (!pedido.garcom) {
        return <span className="descricao">Aguardando o garçom ser registrado para liberar o pagamento.</span>;
      }
      return (
        <button
          type="button"
          disabled={ocupado}
          onClick={() =>
            mudarStatus(
              pedido,
              'pago',
              `Pagar ${formatarPreco(pedido.valor_total)} do pedido #${pedido.id}?`,
              `Pedido #${pedido.id} pago (${formatarPreco(pedido.valor_total)}). Obrigado!`,
            )
          }
        >
          {esteProcessando ? 'Pagando…' : 'Pagar'}
        </button>
      );
    }

    if (['em_preparo', 'pronto'].includes(pedido.status)) {
      return <span className="descricao">Em andamento na cozinha; cancelamento só com a equipe.</span>;
    }

    return null;
  }

  return (
    <section>
      <h2>Meus pedidos</h2>
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

      {carregando && pedidos.length === 0 ? (
        <p className="nota">Carregando pedidos…</p>
      ) : (
        !erro &&
        pedidos.length === 0 && (
          <p className="nota">
            Você ainda não fez pedidos.{' '}
            <button type="button" className="link" onClick={() => navigate('/cardapio')}>
              Ver o cardápio
            </button>
          </p>
        )
      )}

      {pedidos.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>#</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  {p.itens.map((i) => (
                    <div key={i.id}>
                      {i.quantidade}× {i.item?.nome}
                    </div>
                  ))}
                  {p.reserva && (
                    <p className="descricao">
                      Reserva {formatarData(p.reserva.data_reserva)} às {p.reserva.horario}
                      {p.reserva.mesa && ` — mesa ${p.reserva.mesa.identificacao}`}
                    </p>
                  )}
                  {p.garcom && <p className="descricao">Garçom: {p.garcom.nome}</p>}
                </td>
                <td className="preco">{formatarPreco(p.valor_total)}</td>
                <td>{ROTULOS_STATUS[p.status]}</td>
                <td>{acoes(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default MeusPedidos;
