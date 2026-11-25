import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

// A API devolve `valor` como string decimal ("85.50")
const formatarPreco = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarData = (iso) => iso.split('-').reverse().join('/');

const COMPRA_VAZIA = { descricao: '', valor: '', data_compra: '', fornecedor: '' };
const FILTROS_VAZIOS = { de: '', ate: '', q: '' };

const semVazios = (filtros) => Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== ''));

/** Despesas (alimentos/insumos). Só admin: listar, filtrar, criar, editar e excluir. */
function Compras() {
  const [compras, setCompras] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [nova, setNova] = useState(COMPRA_VAZIA);
  const [editando, setEditando] = useState(null);

  function carregar(params = semVazios(filtros)) {
    setCarregando(true);
    api
      .get('/compras', { params })
      .then((res) => {
        setCompras(res.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar compras.')))
      .finally(() => setCarregando(false));
  }

  useEffect(() => carregar(), []);

  function filtrar(event) {
    event.preventDefault();
    carregar();
  }

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS);
    carregar({});
  }

  async function executar(acao, padrao) {
    setErro('');
    try {
      await acao();
      carregar();
      return true;
    } catch (error) {
      setErro(mensagemDeErro(error, padrao));
      return false;
    }
  }

  const corpo = (compra) => ({
    descricao: compra.descricao,
    valor: Number(compra.valor),
    data_compra: compra.data_compra,
    fornecedor: compra.fornecedor ?? '',
  });

  async function criar(event) {
    event.preventDefault();
    const ok = await executar(() => api.post('/compras', corpo(nova)), 'Falha ao registrar compra.');
    if (ok) setNova(COMPRA_VAZIA);
  }

  async function salvar() {
    const ok = await executar(() => api.patch(`/compras/${editando.id}`, corpo(editando)), 'Falha ao salvar compra.');
    if (ok) setEditando(null);
  }

  function excluir(compra) {
    if (!window.confirm(`Excluir a compra "${compra.descricao}"?`)) return;
    executar(() => api.delete(`/compras/${compra.id}`), 'Falha ao excluir compra.');
  }

  const totalListado = compras.reduce((soma, c) => soma + Math.round(Number(c.valor) * 100), 0) / 100;

  return (
    <div>
      <form className="filtros" onSubmit={filtrar}>
        <label>
          De{' '}
          <input type="date" value={filtros.de} onChange={(e) => setFiltros({ ...filtros, de: e.target.value })} />
        </label>
        <label>
          Até{' '}
          <input type="date" value={filtros.ate} onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })} />
        </label>
        <input
          placeholder="Descrição ou fornecedor"
          value={filtros.q}
          onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
          aria-label="Busca"
        />
        <button type="submit">Filtrar</button>
        <button type="button" onClick={limparFiltros}>
          Limpar
        </button>
      </form>

      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {carregando && <p>Carregando compras…</p>}
      {!carregando && compras.length === 0 ? (
        <p className="nota">Nenhuma compra encontrada.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Fornecedor</th>
              <th>Valor</th>
              <th>Registrada por</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) =>
              editando?.id === c.id ? (
                <tr key={c.id}>
                  <td>
                    <input
                      type="date"
                      value={editando.data_compra}
                      onChange={(e) => setEditando({ ...editando, data_compra: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={editando.descricao}
                      onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      value={editando.fornecedor ?? ''}
                      onChange={(e) => setEditando({ ...editando, fornecedor: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editando.valor}
                      onChange={(e) => setEditando({ ...editando, valor: e.target.value })}
                    />
                  </td>
                  <td>{c.registradoPor?.nome}</td>
                  <td className="acoes">
                    <button type="button" onClick={salvar}>
                      Salvar
                    </button>
                    <button type="button" onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={c.id}>
                  <td>{formatarData(c.data_compra)}</td>
                  <td>{c.descricao}</td>
                  <td>{c.fornecedor ?? '—'}</td>
                  <td>{formatarPreco(c.valor)}</td>
                  <td>{c.registradoPor?.nome}</td>
                  <td className="acoes">
                    <button type="button" onClick={() => setEditando({ ...c })}>
                      Editar
                    </button>
                    <button type="button" onClick={() => excluir(c)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={3}>Total listado ({compras.length})</th>
              <th>{formatarPreco(totalListado)}</th>
              <th colSpan={2} />
            </tr>
          </tfoot>
        </table>
      )}

      <form className="formulario" onSubmit={criar}>
        <strong>Nova compra</strong>
        <label htmlFor="compra-descricao">Descrição</label>
        <input
          id="compra-descricao"
          value={nova.descricao}
          onChange={(e) => setNova({ ...nova, descricao: e.target.value })}
          required
        />
        <label htmlFor="compra-valor">Valor (R$)</label>
        <input
          id="compra-valor"
          type="number"
          min="0"
          step="0.01"
          value={nova.valor}
          onChange={(e) => setNova({ ...nova, valor: e.target.value })}
          required
        />
        <label htmlFor="compra-data">Data da compra</label>
        <input
          id="compra-data"
          type="date"
          value={nova.data_compra}
          onChange={(e) => setNova({ ...nova, data_compra: e.target.value })}
          required
        />
        <label htmlFor="compra-fornecedor">Fornecedor (opcional)</label>
        <input
          id="compra-fornecedor"
          value={nova.fornecedor}
          onChange={(e) => setNova({ ...nova, fornecedor: e.target.value })}
        />
        <button type="submit">Registrar compra</button>
      </form>
    </div>
  );
}

export default Compras;
