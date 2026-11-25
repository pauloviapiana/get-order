import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatarData, formatarPreco } from '../services/formato';
import { mensagemDeErro } from '../services/sessao';

const STATUS = ['aberto', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado'];
const TERMINAIS = ['pago', 'cancelado'];

// Ações por status atual (FASE0_REGRAS.md §4); cancelar `entregue` é exclusivo do admin
const ACOES = {
  aberto: [
    { status: 'em_preparo', rotulo: 'Iniciar preparo' },
    { status: 'cancelado', rotulo: 'Cancelar' },
  ],
  em_preparo: [
    { status: 'pronto', rotulo: 'Pronto' },
    { status: 'cancelado', rotulo: 'Cancelar' },
  ],
  pronto: [
    { status: 'entregue', rotulo: 'Entregue' },
    { status: 'cancelado', rotulo: 'Cancelar' },
  ],
  entregue: [
    { status: 'pago', rotulo: 'Registrar pagamento' },
    { status: 'cancelado', rotulo: 'Cancelar (excepcional)', soAdmin: true },
  ],
  pago: [],
  cancelado: [],
};

/** Todos os pedidos (admin/funcionario): filtro por status, garçom e fluxo de status. */
function Pedidos({ ehAdmin }) {
  const [pedidos, setPedidos] = useState([]);
  const [garcons, setGarcons] = useState([]);
  const [status, setStatus] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    setCarregando(true);
    api
      .get('/pedidos', { params: status ? { status } : {} })
      .then((res) => {
        setPedidos(res.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar pedidos.')))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  useEffect(() => {
    api
      .get('/pedidos/garcons')
      .then((res) => setGarcons(res.data))
      .catch(() => setGarcons([]));
  }, []);

  function filtrar(event) {
    event.preventDefault();
    carregar();
  }

  async function atribuirGarcom(pedido, garcomId) {
    if (!garcomId) return;

    try {
      await api.patch(`/pedidos/${pedido.id}/garcom`, { garcomId: Number(garcomId) });
      carregar();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao atribuir garçom.'));
    }
  }

  async function mudarStatus(pedido, acao) {
    if (acao.status === 'cancelado' && !window.confirm(`Cancelar o pedido #${pedido.id}?`)) return;

    try {
      await api.patch(`/pedidos/${pedido.id}/status`, { status: acao.status });
      carregar();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao alterar status.'));
    }
  }

  return (
    <div>
      <form className="filtros" onSubmit={filtrar}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button type="submit" disabled={carregando}>
          Filtrar
        </button>
      </form>

      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {carregando && <p>Carregando pedidos…</p>}
      {!carregando && pedidos.length === 0 ? (
        <p className="nota">Nenhum pedido encontrado.</p>
      ) : (
        !carregando && (
          <table className="tabela">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Itens</th>
                <th>Total</th>
                <th>Comissão</th>
                <th>Reserva</th>
                <th>Garçom</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.cliente?.nome}</td>
                  <td>
                    {p.itens.map((i) => (
                      <div key={i.id}>
                        {i.quantidade}× {i.item?.nome}
                      </div>
                    ))}
                  </td>
                  <td>{formatarPreco(p.valor_total)}</td>
                  <td>{p.valor_comissao ? formatarPreco(p.valor_comissao) : '—'}</td>
                  <td>
                    {p.reserva
                      ? `${formatarData(p.reserva.data_reserva)} ${p.reserva.horario} ${p.reserva.mesa?.identificacao ?? ''}`
                      : '—'}
                  </td>
                  <td>
                    {TERMINAIS.includes(p.status) ? (
                      p.garcom?.nome ?? '—'
                    ) : (
                      <select
                        className="select-garcom"
                        value={p.garcomId ?? ''}
                        onChange={(e) => atribuirGarcom(p, e.target.value)}
                        aria-label={`Garçom do pedido ${p.id}`}
                      >
                        <option value="">Sem garçom</option>
                        {garcons.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>{p.status}</td>
                  <td className="acoes">
                    {ACOES[p.status]
                      .filter((acao) => !acao.soAdmin || ehAdmin)
                      .map((acao) => (
                        <button key={acao.status} type="button" onClick={() => mudarStatus(p, acao)}>
                          {acao.rotulo}
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

export default Pedidos;
