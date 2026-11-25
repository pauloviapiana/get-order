import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

// A API devolve `preco` como string decimal ("12.50")
const formatarPreco = (preco) => Number(preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Leitura do cardápio: a API já devolve só categorias ativas e itens disponíveis para o cliente. */
function Cardapio() {
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/categorias'), api.get('/itens-menu')])
      .then(([resCategorias, resItens]) => {
        setCategorias(resCategorias.data);
        setItens(resItens.data);
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar o cardápio.')))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p>Carregando cardápio…</p>;

  const secoes = categorias
    .map((categoria) => ({ categoria, itens: itens.filter((i) => i.categoriaId === categoria.id) }))
    .filter((secao) => secao.itens.length > 0);

  return (
    <div>
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default Cardapio;
