# get-order

Sistema acadêmico de gestão para restaurante IOT: autenticação com RBAC, reserva de mesa (sex/sáb/dom), cardápio e pedidos (incluindo compra antecipada), controle financeiro com **10% do garçom**, e **dois frontends** (cliente e gestão).

Stack: **PERN** + **Sequelize com migrations**, JWT, bcrypt, Zod e API em camadas.

**Fases 0 a 11 concluídas** (planejamento → scaffold → auth → mesas/reservas → cardápio → pedidos → financeiro → erros/CORS/docs → frontend cliente → frontend gestão → integração e pacote de entrega → polimento: rate limit, refresh token, React Router, redesign, PWA).  
Detalhe da Fase 11: [`docs/FASE11_POLIMENTO.md`](docs/FASE11_POLIMENTO.md).

## Documentação

Contrato da API e modelo estão em [`docs/`](docs/):

- [DOCUMENTACAO.md](docs/DOCUMENTACAO.md) — inventário único (objetivo, stack, rotas, RBAC, seed)  
- [CHECKLIST_ENTREGA.md](docs/CHECKLIST_ENTREGA.md) — checklist de conclusão do pacote acadêmico  
- [FASE10_ENTREGA.md](docs/FASE10_ENTREGA.md) — resumo da Fase 10 (comandos, logins, critérios de aceite)  
- [FASE10_EVIDENCIAS.md](docs/FASE10_EVIDENCIAS.md) — ensaio ponta a ponta (11 cenários PASS)  
- [FASE11_POLIMENTO.md](docs/FASE11_POLIMENTO.md) — rate limit, refresh token, React Router, redesign, PWA  
- [schema_referencia.sql](docs/schema_referencia.sql) — SQL didático das tabelas de domínio (a fonte de verdade continua sendo `db:migrate`)  
- [FASE0_REGRAS.md](docs/FASE0_REGRAS.md) — regras e decisões fechadas  
- [DER.md](docs/DER.md) — diagrama entidade-relacionamento  
- [MODELO_DADOS.md](docs/MODELO_DADOS.md) — tabelas, campos e ordem de migrations  
- [MATRIZ_RBAC.md](docs/MATRIZ_RBAC.md) — permissões por perfil  
- [FASE0_CHECKLIST.md](docs/FASE0_CHECKLIST.md) — checklist por fase  
- [FASE2_AUTH.md](docs/FASE2_AUTH.md) … [FASE6_FINANCEIRO.md](docs/FASE6_FINANCEIRO.md) — notas de cada domínio (mantidas)  
- [FASE7_DOCS_ERROS.md](docs/FASE7_DOCS_ERROS.md) — erros de banco, CORS e onde está a doc consolidada  
- [FASE8_FRONTEND_CLIENTE.md](docs/FASE8_FRONTEND_CLIENTE.md) — site cliente (5173)  
- [FASE9_FRONTEND_GESTAO.md](docs/FASE9_FRONTEND_GESTAO.md) — site gestão (5174)  

Postman: [backend/postman/README.md](backend/postman/README.md).

---

## Pré-requisitos

- Node.js (LTS) e npm  
- PostgreSQL instalado e em execução  
- (Opcional) [Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-overview/) para rodar as coleções  

Comandos abaixo são para **PowerShell** no Windows. Não versione arquivos `.env` — use só os `.env.example`.

---

## Como subir (do zero)

### 1) Criar o banco

No PostgreSQL:

```sql
CREATE DATABASE get_order;
```

### 2) Backend

```powershell
cd backend
copy .env.example .env
```

Edite `backend/.env` e preencha **`DB_PASSWORD`** e **`JWT_SECRET`**.  
`CLIENT_ORIGINS` já lista as duas origens (`http://localhost:5173,http://localhost:5174`). Se ficar vazio ou contiver `*`, o servidor **encerra no boot**.

```powershell
npm install
npx sequelize-cli db:migrate
npm run seed
npm run dev
```

- `db:migrate` cria as tabelas de domínio + `refresh_tokens` (Fase 11): `usuarios`, `mesas`, `reservas`, `categorias_menu`, `itens_menu`, `pedidos`, `pedido_itens`, `compras`, `refresh_tokens`.
- `npm run seed` cria usuários demo, 7 mesas (M1–M7, M7 inativa), 4 reservas, cardápio (5 categorias, 9 itens), 4 pedidos e 4 compras. É **reexecutável** (não duplica).

API: `http://localhost:3001/api`.  
Smoke: `GET http://localhost:3001/api/health` → `{ "ok": true }`.  
Auth: login devolve `{ token, refreshToken, usuario }`; `POST /auth/refresh` e `POST /auth/logout` (ver Fase 11).

### Logins demo

Senha de todos: **`123456`**

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com`, `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com`, `cliente2@getorder.com`, `cliente3@getorder.com` |

### 3) Frontend cliente (porta 5173)

Em **outro** terminal:

```powershell
cd frontend-cliente
copy .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173`. Só perfil `cliente` entra (admin/funcionário são recusados e apontados ao 5174). Rotas: `/login`, `/cadastro`, `/reservar`, `/minhas-reservas`, `/cardapio`, `/meus-pedidos`. Detalhe: [FASE8_FRONTEND_CLIENTE.md](docs/FASE8_FRONTEND_CLIENTE.md) + [FASE11_POLIMENTO.md](docs/FASE11_POLIMENTO.md).

### 4) Frontend gestão (porta 5174)

Em **outro** terminal:

```powershell
cd frontend-gestao
copy .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5174`. Só `admin` / `funcionario` entram (cliente é recusado e apontado ao 5173). Rotas: `/login`, `/reservas`, `/pedidos`, `/mesas`, `/cardapio`, `/compras`, `/financeiro`, `/usuarios` (guards por perfil). Detalhe: [FASE9_FRONTEND_GESTAO.md](docs/FASE9_FRONTEND_GESTAO.md) + [FASE11_POLIMENTO.md](docs/FASE11_POLIMENTO.md).

---

## Testes Postman

Com a API no ar e o seed aplicado, rode **cada coleção inteira, nesta ordem** ([backend/postman/README.md](backend/postman/README.md)):

| Ordem | Arquivo |
|------:|---------|
| 1 | `Get-Order-Auth.postman_collection.json` |
| 2 | `Get-Order-Mesas-Reservas.postman_collection.json` |
| 3 | `Get-Order-Cardapio.postman_collection.json` |
| 4 | `Get-Order-Pedidos.postman_collection.json` |
| 5 | `Get-Order-Financeiro.postman_collection.json` |
| — | `Get-Order-API.postman_collection.json` (índice + contrato de erro) |

```powershell
postman collection run backend/postman/Get-Order-Auth.postman_collection.json
postman collection run backend/postman/Get-Order-Mesas-Reservas.postman_collection.json
postman collection run backend/postman/Get-Order-Cardapio.postman_collection.json
postman collection run backend/postman/Get-Order-Pedidos.postman_collection.json
postman collection run backend/postman/Get-Order-Financeiro.postman_collection.json
postman collection run backend/postman/Get-Order-API.postman_collection.json
```

Evidências do ensaio da Fase 10: [FASE10_EVIDENCIAS.md](docs/FASE10_EVIDENCIAS.md).

Smoke rápido de erro (sem stack/SQL no client):

```powershell
curl.exe -s -w "`nHTTP %{http_code}`n" -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d "{\"nome\":\"Admin Demo\",\"email\":\"admin@getorder.com\",\"senha\":\"123456\"}"

curl.exe -s -w "`nHTTP %{http_code}`n" -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{"
```

Esperado: **409** `{ "erro": "E-mail já cadastrado" }` e **400** `{ "erro": "JSON inválido no corpo da requisição" }`.

O catálogo de rotas está em [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md). O SQL de referência **não** substitui a migration.

---

## Estrutura do repositório

```
get-order/
├── backend/              # Express + Sequelize + Zod (camadas)
├── frontend-cliente/     # Vite React — porta 5173
├── frontend-gestao/      # Vite React — porta 5174
├── docs/                 # regras, DER, documentação da API, SQL de referência
├── material-complementar/
└── README.md
```
