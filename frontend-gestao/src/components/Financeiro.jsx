import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatarData, formatarPreco } from '../services/formato';
import { mensagemDeErro } from '../services/sessao';

const PERIODO_VAZIO = { de: '', ate: '' };

const semVazios = (periodo) => Object.fromEntries(Object.entries(periodo).filter(([, valor]) => valor !== ''));

/**
 * Admin: resumo (vendas pagas − compras) + comissões de todos os garçons.
 * Funcionário: só as próprias comissões (a API já filtra por garcomId = self).
 */
function Financeiro({ ehAdmin }) {
  const [periodo, setPeriodo] = useState(PERIODO_VAZIO);
  const [resumo, setResumo] = useState(null);
  const [comissoes, setComissoes] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  function carregar(params = semVazios(periodo)) {
    setCarregando(true);
    const requisicoes = [api.get('/financeiro/comissoes', { params })];
    if (ehAdmin) requisicoes.push(api.get('/financeiro/resumo', { params }));

    Promise.all(requisicoes)
      .then(([resComissoes, resResumo]) => {
        setComissoes(resComissoes.data);
        setResumo(resResumo?.data ?? null);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar o financeiro.')))
      .finally(() => setCarregando(false));
  }

  useEffect(() => carregar(), []);

  function filtrar(event) {
    event.preventDefault();
    carregar();
  }

  function todoHistorico() {
    setPeriodo(PERIODO_VAZIO);
    carregar({});
  }

  const descricaoPeriodo = (p) => {
    if (!p.de && !p.ate) return 'todo o histórico';
    if (p.de && p.ate) return `${formatarData(p.de)} a ${formatarData(p.ate)}`;
    return p.de ? `a partir de ${formatarData(p.de)}` : `até ${formatarData(p.ate)}`;
  };

  return (
    <div>
      <form className="filtros" onSubmit={filtrar}>
        <label>
          De{' '}
          <input
            type="date"
            value={periodo.de}
            onChange={(e) => setPeriodo({ ...periodo, de: e.target.value })}
            disabled={carregando}
          />
        </label>
        <label>
          Até{' '}
          <input
            type="date"
            value={periodo.ate}
            onChange={(e) => setPeriodo({ ...periodo, ate: e.target.value })}
            disabled={carregando}
          />
        </label>
        <button type="submit" disabled={carregando}>
          Aplicar período
        </button>
        <button type="button" onClick={todoHistorico} disabled={carregando}>
          Todo o histórico
        </button>
      </form>

      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {carregando && <p>Carregando financeiro…</p>}

      {!carregando && ehAdmin && resumo && (
        <>
          <h2>Resumo ({descricaoPeriodo(resumo.periodo)})</h2>
          <div className="cartoes">
            <div className="cartao">
              <span>Vendas (pedidos pagos)</span>
              <strong>{formatarPreco(resumo.vendas.valor_total)}</strong>
              <small>{resumo.vendas.quantidade_pedidos} pedido(s)</small>
            </div>
            <div className="cartao">
              <span>Despesas (compras)</span>
              <strong>{formatarPreco(resumo.despesas.valor_total)}</strong>
              <small>{resumo.despesas.quantidade_compras} compra(s)</small>
            </div>
            <div className="cartao">
              <span>Resultado (vendas − despesas)</span>
              <strong className={Number(resumo.resultado) < 0 ? 'negativo' : ''}>{formatarPreco(resumo.resultado)}</strong>
            </div>
            <div className="cartao">
              <span>Comissões (10%, informativo)</span>
              <strong>{formatarPreco(resumo.comissao_total)}</strong>
              <small>não descontadas do resultado</small>
            </div>
          </div>
        </>
      )}

      {!carregando && comissoes && (
        <>
          <h2>
            {ehAdmin ? 'Comissões por garçom' : 'Minhas comissões'} ({descricaoPeriodo(comissoes.periodo)})
          </h2>
          {comissoes.itens.length === 0 ? (
            <p className="nota">Nenhuma comissão no período (só pedidos pagos geram comissão).</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Garçom</th>
                  <th>Pedidos pagos</th>
                  <th>Vendas atendidas</th>
                  <th>Comissão (10%)</th>
                </tr>
              </thead>
              <tbody>
                {comissoes.itens.map((i) => (
                  <tr key={i.garcomId}>
                    <td>{i.nome}</td>
                    <td>{i.quantidade_pedidos}</td>
                    <td>{formatarPreco(i.valor_vendas)}</td>
                    <td>{formatarPreco(i.comissao_total)}</td>
                  </tr>
                ))}
              </tbody>
              {ehAdmin && (
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th>{comissoes.total.quantidade_pedidos}</th>
                    <th />
                    <th>{formatarPreco(comissoes.total.comissao_total)}</th>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default Financeiro;
