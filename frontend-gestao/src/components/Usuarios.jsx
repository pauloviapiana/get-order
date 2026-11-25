import { useEffect, useState } from 'react';
import api from '../services/api';
import { mensagemDeErro } from '../services/sessao';

/** Listagem simples de usuários (GET /usuarios — só admin). */
function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get('/usuarios')
      .then((res) => {
        setUsuarios(res.data);
        setErro('');
      })
      .catch((error) => setErro(mensagemDeErro(error, 'Falha ao carregar usuários.')))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <p>Carregando usuários…</p>;

  return (
    <div>
      {erro && (
        <p className="mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {!erro && usuarios.length === 0 ? (
        <p className="nota">Nenhum usuário encontrado.</p>
      ) : (
        !erro && (
          <table className="tabela">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Perfil</th>
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.telefone || '—'}</td>
                  <td>{u.perfil}</td>
                  <td>{u.ativo ? 'sim' : 'não'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

export default Usuarios;
