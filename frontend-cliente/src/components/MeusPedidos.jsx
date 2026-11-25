import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

const ROTULOS_STATUS = {
  aberto: 'aberto',
  em_preparo: 'em preparo',
  pronto: 'pronto',
  entregue: 'entregue',
  pago: 'pago',
  cancelado: 'cancelado',
};

// A API devolve valores como string decimal ("12.50")
const formatarPreco = (preco) => Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarData = (iso) => iso.split('-').reverse().join('/');

/** GET /pedidos (a API devolve só os do cliente logado) + cancelar (aberto) e pagar (entregue). */
function MeusPedidos({ versao }) {
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

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

  useEffect(carregar, [versao]);

  async function mudarStatus(pedido, status, pergunta) {
    if (!window.confirm(pergunta)) return;

    try {
      await api.patch(`/pedidos/${pedido.id}/status`, { status });
      carregar();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao atualizar o pedido.'));
    }
  }

  function acoes(pedido) {
    if (pedido.status === 'aberto') {
      return (
        <button type="button" onClick={() => mudarStatus(pedido, 'cancelado', `Cancelar o pedido #${pedido.id}?`)}>
          Cancelar
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
          onClick={() =>
            mudarStatus(pedido, 'pago', `Pagar ${formatarPreco(pedido.valor_total)} do pedido #${pedido.id}?`)
          }
        >
          Pagar
        </button>
      );
    }

    return null;
  }

  if (carregando && pedidos.length === 0) return <p>Carregando pedidos…</p>;

  return (
    <div>
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
      {pedidos.length === 0 ? (
        <p className="nota">Você ainda não fez pedidos.</p>
      ) : (
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
    </div>
  );
}

export default MeusPedidos;
