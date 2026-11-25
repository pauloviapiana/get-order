import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatarData, formatarPreco } from '../services/formato';
import { mensagemDeErro } from '../services/sessao';

// Prévia do total em centavos (inteiros); o valor oficial é calculado pela API
const centavos = (preco) => {
  const [inteiro, fracao = ''] = String(preco).split('.');
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0').slice(0, 2));
};

const RESERVAS_VINCULAVEIS = ['pendente', 'confirmada'];

/**
 * Cardápio (a API já devolve só categorias ativas e itens disponíveis) com quantidade por item
 * para montar o pedido; reserva pendente/confirmada pode ser vinculada (compra antecipada).
 */
function Cardapio() {
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [erroReservas, setErroReservas] = useState('');
  const [quantidades, setQuantidades] = useState({});
  const [reservaId, setReservaId] = useState('');
  const [erroCardapio, setErroCardapio] = useState('');
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
      .catch((error) => setErroCardapio(mensagemDeErro(error, 'Falha ao carregar o cardápio.')))
      .finally(() => setCarregando(false));

    api
      .get('/reservas')
      .then((res) => setReservas(res.data.filter((r) => RESERVAS_VINCULAVEIS.includes(r.status))))
      .catch((error) => setErroReservas(mensagemDeErro(error, 'Falha ao carregar suas reservas.')));
  }, []);

  const secoes = categorias
    .map((categoria) => ({ categoria, itens: itens.filter((i) => i.categoriaId === categoria.id) }))
    .filter((secao) => secao.itens.length > 0);

  const escolhidos = itens.filter((item) => quantidades[item.id] > 0);
  const totalCentavos = escolhidos.reduce((soma, item) => soma + quantidades[item.id] * centavos(item.preco), 0);
  const unidades = escolhidos.reduce((soma, item) => soma + quantidades[item.id], 0);

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
    } catch (error) {
      setErro(mensagemDeErro(error, 'Falha ao enviar o pedido.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <h2>Cardápio e pedido</h2>
      {carregando && <p className="nota">Carregando cardápio…</p>}
      {erroCardapio && (
        <p className="mensagem-erro" role="alert">
          {erroCardapio}
        </p>
      )}
      {!carregando && !erroCardapio && secoes.length === 0 && (
        <p className="nota">Nenhum item disponível no momento.</p>
      )}

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
                      disabled={enviando}
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
          <label htmlFor="pedido-reserva">Vincular a uma reserva (opcional — compra antecipada)</label>
          <select
            id="pedido-reserva"
            value={reservaId}
            onChange={(e) => setReservaId(e.target.value)}
            disabled={enviando}
          >
            <option value="">Sem reserva</option>
            {reservas.map((r) => (
              <option key={r.id} value={r.id}>
                {formatarData(r.data_reserva)} às {r.horario} — mesa {r.mesa?.identificacao} ({r.status})
              </option>
            ))}
          </select>
          {erroReservas && <p className="mensagem-erro">{erroReservas}</p>}
          {!erroReservas && reservas.length === 0 && (
            <p className="descricao">Você não tem reserva pendente ou confirmada para vincular.</p>
          )}
          <p>
            Total: <strong>{formatarPreco(totalCentavos / 100)}</strong>
            {unidades > 0 && ` (${unidades} ${unidades === 1 ? 'item' : 'itens'})`}
          </p>
          <button type="button" onClick={fazerPedido} disabled={enviando || escolhidos.length === 0}>
            {enviando ? 'Enviando…' : 'Fazer pedido'}
          </button>
          {escolhidos.length === 0 && <p className="descricao">Informe a quantidade de ao menos um item.</p>}
        </div>
      )}

      {mensagem && (
        <p className="mensagem-sucesso" role="status">
          {mensagem}{' '}
          <button type="button" className="link" onClick={() => navigate('/meus-pedidos')}>
            Ver meus pedidos
          </button>
        </p>
      )}
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}

export default Cardapio;
