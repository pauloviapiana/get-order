import { useEffect, useState } from 'react';
import api from '../services/api';
import { formatarPreco } from '../services/formato';
import { mensagemDeErro } from '../services/sessao';

const ITEM_VAZIO = { categoriaId: '', nome: '', descricao: '', preco: '' };

/**
 * Categorias e itens do cardápio. Admin vê tudo, cria, edita, ativa/desativa categoria e
 * marca item disponível; funcionário só consulta (a API já devolve só ativas/disponíveis).
 */
function Cardapio({ ehAdmin }) {
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [novoItem, setNovoItem] = useState(ITEM_VAZIO);
  const [editandoItem, setEditandoItem] = useState(null);

  function carregar() {
    setCarregando(true);
    Promise.all([api.get('/categorias'), api.get('/itens-menu')])
      .then(([resCategorias, resItens]) => {
        setCategorias(resCategorias.data);
        setItens(resItens.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar cardápio.')))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function executar(acao, padrao) {
    setErro('');
    setEnviando(true);
    try {
      await acao();
      carregar();
      return true;
    } catch (error) {
      setErro(mensagemDeErro(error, padrao));
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function criarCategoria(event) {
    event.preventDefault();
    const ok = await executar(() => api.post('/categorias', { nome: novaCategoria }), 'Falha ao criar categoria.');
    if (ok) setNovaCategoria('');
  }

  async function salvarCategoria() {
    const ok = await executar(
      () => api.patch(`/categorias/${editandoCategoria.id}`, { nome: editandoCategoria.nome }),
      'Falha ao salvar categoria.'
    );
    if (ok) setEditandoCategoria(null);
  }

  function alternarAtiva(categoria) {
    executar(
      () => api.patch(`/categorias/${categoria.id}/ativa`, { ativa: !categoria.ativa }),
      'Falha ao alterar categoria.'
    );
  }

  const corpoItem = (item) => ({
    categoriaId: Number(item.categoriaId),
    nome: item.nome,
    descricao: item.descricao ?? '',
    preco: Number(item.preco),
  });

  async function criarItem(event) {
    event.preventDefault();
    const ok = await executar(() => api.post('/itens-menu', corpoItem(novoItem)), 'Falha ao criar item.');
    if (ok) setNovoItem(ITEM_VAZIO);
  }

  async function salvarItem() {
    const ok = await executar(
      () => api.patch(`/itens-menu/${editandoItem.id}`, corpoItem(editandoItem)),
      'Falha ao salvar item.'
    );
    if (ok) setEditandoItem(null);
  }

  function alternarDisponivel(item) {
    executar(
      () => api.patch(`/itens-menu/${item.id}/disponivel`, { disponivel: !item.disponivel }),
      'Falha ao alterar item.'
    );
  }

  const categoriasAtivas = categorias.filter((c) => c.ativa);
  const itensVisiveis = filtroCategoria ? itens.filter((i) => i.categoriaId === Number(filtroCategoria)) : itens;

  return (
    <div>
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {carregando && <p>Carregando cardápio…</p>}

      {!carregando && (
        <>
          <h2>Categorias</h2>
          {categorias.length === 0 ? (
            <p className="nota">Nenhuma categoria.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Ativa</th>
                  {ehAdmin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {categorias.map((c) =>
                  editandoCategoria?.id === c.id ? (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>
                        <input
                          value={editandoCategoria.nome}
                          onChange={(e) => setEditandoCategoria({ ...editandoCategoria, nome: e.target.value })}
                          disabled={enviando}
                        />
                      </td>
                      <td>{c.ativa ? 'sim' : 'não'}</td>
                      <td className="acoes">
                        <button type="button" onClick={salvarCategoria} disabled={enviando}>
                          Salvar
                        </button>
                        <button type="button" onClick={() => setEditandoCategoria(null)} disabled={enviando}>
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.nome}</td>
                      <td>{c.ativa ? 'sim' : 'não'}</td>
                      {ehAdmin && (
                        <td className="acoes">
                          <button type="button" onClick={() => setEditandoCategoria({ ...c })} disabled={enviando}>
                            Editar
                          </button>
                          <button type="button" onClick={() => alternarAtiva(c)} disabled={enviando}>
                            {c.ativa ? 'Desativar' : 'Ativar'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}

          {ehAdmin && (
            <form className="formulario" onSubmit={criarCategoria}>
              <strong>Nova categoria</strong>
              <label htmlFor="categoria-nome">Nome</label>
              <input
                id="categoria-nome"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                disabled={enviando}
                required
              />
              <button type="submit" disabled={enviando}>
                {enviando ? 'Salvando…' : 'Criar categoria'}
              </button>
            </form>
          )}

          <h2>Itens</h2>
          <div className="filtros">
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {itensVisiveis.length === 0 ? (
            <p className="nota">Nenhum item.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Preço</th>
                  <th>Disponível</th>
                  {ehAdmin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {itensVisiveis.map((i) =>
                  editandoItem?.id === i.id ? (
                    <tr key={i.id}>
                      <td>
                        <input
                          value={editandoItem.nome}
                          onChange={(e) => setEditandoItem({ ...editandoItem, nome: e.target.value })}
                          disabled={enviando}
                        />
                      </td>
                      <td>
                        <select
                          value={editandoItem.categoriaId}
                          onChange={(e) => setEditandoItem({ ...editandoItem, categoriaId: e.target.value })}
                          disabled={enviando}
                        >
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id} disabled={!c.ativa && c.id !== i.categoriaId}>
                              {c.nome}
                              {c.ativa ? '' : ' (inativa)'}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={editandoItem.descricao ?? ''}
                          onChange={(e) => setEditandoItem({ ...editandoItem, descricao: e.target.value })}
                          disabled={enviando}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editandoItem.preco}
                          onChange={(e) => setEditandoItem({ ...editandoItem, preco: e.target.value })}
                          disabled={enviando}
                        />
                      </td>
                      <td>{i.disponivel ? 'sim' : 'não'}</td>
                      <td className="acoes">
                        <button type="button" onClick={salvarItem} disabled={enviando}>
                          Salvar
                        </button>
                        <button type="button" onClick={() => setEditandoItem(null)} disabled={enviando}>
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i.id}>
                      <td>{i.nome}</td>
                      <td>
                        {i.categoria?.nome}
                        {i.categoria && !i.categoria.ativa && ' (inativa)'}
                      </td>
                      <td>{i.descricao}</td>
                      <td>{formatarPreco(i.preco)}</td>
                      <td>{i.disponivel ? 'sim' : 'não'}</td>
                      {ehAdmin && (
                        <td className="acoes">
                          <button type="button" onClick={() => setEditandoItem({ ...i })} disabled={enviando}>
                            Editar
                          </button>
                          <button type="button" onClick={() => alternarDisponivel(i)} disabled={enviando}>
                            {i.disponivel ? 'Indisponível' : 'Disponível'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}

          {ehAdmin && (
            <form className="formulario" onSubmit={criarItem}>
              <strong>Novo item</strong>
              <label htmlFor="item-categoria">Categoria</label>
              <select
                id="item-categoria"
                value={novoItem.categoriaId}
                onChange={(e) => setNovoItem({ ...novoItem, categoriaId: e.target.value })}
                disabled={enviando}
                required
              >
                <option value="">Selecione…</option>
                {categoriasAtivas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <label htmlFor="item-nome">Nome</label>
              <input
                id="item-nome"
                value={novoItem.nome}
                onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                disabled={enviando}
                required
              />
              <label htmlFor="item-descricao">Descrição (opcional)</label>
              <input
                id="item-descricao"
                value={novoItem.descricao}
                onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                disabled={enviando}
              />
              <label htmlFor="item-preco">Preço (R$)</label>
              <input
                id="item-preco"
                type="number"
                min="0"
                step="0.01"
                value={novoItem.preco}
                onChange={(e) => setNovoItem({ ...novoItem, preco: e.target.value })}
                disabled={enviando}
                required
              />
              <button type="submit" disabled={enviando}>
                {enviando ? 'Salvando…' : 'Criar item'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default Cardapio;
