# Fase 2 — Autenticação JWT e usuários (RBAC)

Escopo: tabela `usuarios`, login/cadastro, JWT e gestão de usuários.  
Regras de origem: `FASE0_REGRAS.md` §§7 e 9, `MODELO_DADOS.md` §1, `MATRIZ_RBAC.md` (Auth e Usuários).

Mesas, reservas, cardápio, pedidos e financeiro **não** fazem parte desta fase.

---

## Decisões

| Item | Decisão |
|------|---------|
| JWT | `expiresIn: '30m'`; payload `{ id, email, perfil }`; header `Authorization: Bearer <token>` |
| Senha | bcrypt (10 rounds) no `usuarioService`; hash nunca sai na resposta (`defaultScope` + `toJSON`) |
| Auto-cadastro | `POST /auth/register` sempre cria `cliente` (campo `perfil` do body é descartado) |
| Login com falha | `401 { "erro": "Credenciais inválidas" }` para e-mail inexistente **e** senha errada |
| Usuário desativado | Senha correta + `ativo=false` → `403` "Usuário desativado" |
| Token de conta desativada | `autenticar` recarrega o usuário do banco a cada request: desativado perde acesso na hora (401), e o perfil usado é sempre o atual |
| `DELETE /usuarios/:id` | **Desativa** (`ativo=false`), não apaga a linha. Preserva histórico para as FKs das próximas fases (reservas, pedidos, compras) |
| Autoproteção do admin | Admin não pode desativar/excluir a si mesmo nem rebaixar o próprio perfil (`400`) |
| Cliente editando a si | Só `nome`, `telefone`, `senha`. Qualquer outro campo (`perfil`, `ativo`, `email`) → `400` |
| Funcionário | Usa `GET /auth/me`; não acessa `/usuarios/*` (`403`), conforme a matriz |

---

## Endpoints

Base: `http://localhost:3001/api`

| Método | Rota | Acesso | Sucesso |
|--------|------|--------|---------|
| GET | `/health` | público | 200 `{ ok: true }` |
| POST | `/auth/register` | público | 201 usuário (`cliente`) |
| POST | `/auth/login` | público | 200 `{ token, usuario: { id, nome, email, perfil } }` |
| GET | `/auth/me` | JWT | 200 usuário logado |
| GET | `/usuarios` | admin | 200 lista (filtro opcional `?perfil=`) |
| GET | `/usuarios/:id` | admin · cliente (próprio) | 200 usuário |
| POST | `/usuarios` | admin | 201 usuário (qualquer perfil) |
| PUT/PATCH | `/usuarios/:id` | admin · cliente (próprio) | 200 usuário |
| PATCH | `/usuarios/:id/ativo` | admin | 200 usuário |
| DELETE | `/usuarios/:id` | admin | 200 `{ mensagem, usuario }` (desativado) |

### Erros

Formato único: `{ "erro": "mensagem" }`. Em validação Zod, também `detalhes`:

```json
{
  "erro": "Dados inválidos",
  "detalhes": [{ "campo": "email", "mensagem": "E-mail inválido" }]
}
```

| HTTP | Quando |
|------|--------|
| 400 | Body/params inválidos (Zod), JSON malformado, autoproteção do admin |
| 401 | Sem token, token inválido/expirado, credenciais inválidas, conta desativada com token antigo |
| 403 | Perfil sem permissão, cliente acessando outro id, login de conta desativada |
| 404 | Usuário não encontrado |
| 409 | E-mail já cadastrado |

---

## Exemplos

```http
POST /api/auth/register
Content-Type: application/json

{ "nome": "Maria", "email": "maria@teste.com", "senha": "123456", "telefone": "(11) 99999-0000" }
```

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@getorder.com", "senha": "123456" }
```

```json
{
  "token": "eyJhbGciOi...",
  "usuario": { "id": 1, "nome": "Admin Demo", "email": "admin@getorder.com", "perfil": "admin" }
}
```

```http
POST /api/usuarios
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "nome": "Novo Garçom", "email": "garcom@getorder.com", "senha": "123456", "perfil": "funcionario" }
```

```http
PATCH /api/usuarios/5/ativo
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "ativo": false }
```

---

## Usuários seed (`npm run seed`)

Senha de todos: **`123456`**

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com` |
| funcionario | `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com` |
| cliente | `cliente2@getorder.com` |
| cliente | `cliente3@getorder.com` |

O seed é reexecutável (`findOrCreate` por e-mail): não duplica nem sobrescreve.

---

## Postman

`backend/postman/Get-Order-Auth.postman_collection.json` — 40 requests com asserções (register, login, me, CRUD de usuários, 400/401/403/404/409, expiração de 30 min no payload).

Rodar a coleção inteira, em ordem (Runner do Postman ou CLI):

```powershell
postman collection run backend/postman/Get-Order-Auth.postman_collection.json
```

Cada execução cadastra um cliente e um funcionário novos (e-mail com timestamp), então pode ser repetida.

---

## Frontends

- **frontend-cliente (5173):** abas Entrar / Criar conta; após entrar mostra nome, perfil e botão Sair.
- **frontend-gestao (5174):** login só para `admin`/`funcionario` (cliente recebe mensagem e a sessão não é gravada); admin vê a tabela de usuários.
- Ambos guardam `token` e `usuario` no `sessionStorage` e validam o token com `GET /auth/me` ao abrir.
