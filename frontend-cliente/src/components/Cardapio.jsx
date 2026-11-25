import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

// A API devolve `preco` como string decimal ("12.50")
const formatarPreco = (preco) => Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Prévia do total em centavos (inteiros); o valor oficial é calculado pela API
const centavos = (preco) => {
  const [inteiro, fracao = ''] = String(preco).split('.');
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0').slice(0, 2));
};

const RESERVAS_VINCULAVEIS = ['pendente', 'confirmada'];

const formatarData = (iso) => iso.split('-').reverse().join('/');

/**
 * Cardápio (a API já devolve só categorias ativas e itens disponíveis) com quantidade por item
 * para montar o pedido; reserva pendente/confirmada pode ser vinculada (compra antecipada).
 */
function Cardapio({ versaoReservas, onPedidoCriado }) {
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [reservaId, setReservaId] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/categorias'), api.get('/itens-menu')])
      .then(([resCategorias, resItens]) => {
        setCategorias(resCategorias.data);
        setItens(resItens.data);
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar o cardápio.')))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    api
      .get('/reservas')
      .then((res) => setReservas(res.data.filter((r) => RESERVAS_VINCULAVEIS.includes(r.status))))
      .catch(() => setReservas([]));
  }, [versaoReservas]);

  if (carregando) return <p>Carregando cardápio…</p>;

  const secoes = categorias
    .map((categoria) => ({ categoria, itens: itens.filter((i) => i.categoriaId === categoria.id) }))
    .filter((secao) => secao.itens.length > 0);

  const escolhidos = itens.filter((item) => quantidades[item.id] > 0);
  const totalCentavos = escolhidos.reduce((soma, item) => soma + quantidades[item.id] * centavos(item.preco), 0);

  function mudarQuantidade(itemId, valor) {
    setMensagem('');
    setQuantidades({ ...quantidades, [itemId]: Math.max(0, Math.trunc(Number(valor) || 0)) });
  }

  async function fazerPedido() {
    setErro('');
    setMensagem('');
    setEnviando(true);

    try {
      const res = await api.post('/pedidos', {
        itens: escolhidos.map((item) => ({ itemMenuId: item.id, quantidade: quantidades[item.id] })),
        ...(reservaId && { reservaId: Number(reservaId) }),
      });
      setMensagem(`Pedido #${res.data.id} enviado (${formatarPreco(res.data.valor_total)}).`);
      setQuantidades({});
      setReservaId('');
      onPedidoCriado();
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao enviar o pedido.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      {!erro && secoes.length === 0 && <p className="nota">Nenhum item disponível no momento.</p>}
      {secoes.map(({ categoria, itens: itensDaCategoria }) => (
        <div key={categoria.id}>
          <h3>{categoria.nome}</h3>
          <table className="tabela">
            <tbody>
              {itensDaCategoria.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nome}</strong>
                    {item.descricao && <p className="descricao">{item.descricao}</p>}
                  </td>
                  <td className="preco">{formatarPreco(item.preco)}</td>
                  <td className="quantidade">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={quantidades[item.id] ?? 0}
                      onChange={(e) => mudarQuantidade(item.id, e.target.value)}
                      aria-label={`Quantidade de ${item.nome}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {secoes.length > 0 && (
        <div className="formulario resumo-pedido">
          <label htmlFor="pedido-reserva">Vincular a uma reserva (opcional)</label>
          <select id="pedido-reserva" value={reservaId} onChange={(e) => setReservaId(e.target.value)}>
            <option value="">Sem reserva</option>
            {reservas.map((r) => (
              <option key={r.id} value={r.id}>
                {formatarData(r.data_reserva)} às {r.horario} — mesa {r.mesa?.identificacao} ({r.status})
              </option>
            ))}
          </select>
          <p>
            Total: <strong>{formatarPreco(totalCentavos / 100)}</strong>
            {escolhidos.length > 0 && ` (${escolhidos.length} ${escolhidos.length === 1 ? 'item' : 'itens'})`}
          </p>
          <button type="button" onClick={fazerPedido} disabled={enviando || escolhidos.length === 0}>
            Fazer pedido
          </button>
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

export default Cardapio;
