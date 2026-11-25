# get-order

Sistema acadêmico de gestão para restaurante IOT: autenticação com RBAC, reserva de mesa (sex/sáb/dom), cardápio e pedidos (incluindo compra antecipada), controle financeiro com **10% do garçom**, e **dois frontends** (cliente e gestão).

Stack: **PERN** + **Sequelize com migrations**, JWT, bcrypt, Zod e API em camadas.

## Documentação

Contrato da API e modelo estão em [`docs/`](docs/):

- [DOCUMENTACAO.md](docs/DOCUMENTACAO.md) — inventário único (objetivo, stack, rotas, RBAC, seed)  
- [schema_referencia.sql](docs/schema_referencia.sql) — SQL didático das 8 tabelas (a fonte de verdade continua sendo `db:migrate`)  
- [FASE0_REGRAS.md](docs/FASE0_REGRAS.md) — regras e decisões fechadas  
- [DER.md](docs/DER.md) — diagrama entidade-relacionamento  
- [MODELO_DADOS.md](docs/MODELO_DADOS.md) — tabelas, campos e ordem de migrations  
- [MATRIZ_RBAC.md](docs/MATRIZ_RBAC.md) — permissões por perfil  
- [FASE0_CHECKLIST.md](docs/FASE0_CHECKLIST.md) — checklist por fase  
- [FASE2_AUTH.md](docs/FASE2_AUTH.md) … [FASE6_FINANCEIRO.md](docs/FASE6_FINANCEIRO.md) — notas de cada domínio (mantidas)  
- [FASE7_DOCS_ERROS.md](docs/FASE7_DOCS_ERROS.md) — erros de banco, CORS e onde está a doc consolidada  
- [FASE8_FRONTEND_CLIENTE.md](docs/FASE8_FRONTEND_CLIENTE.md) — consolidação do site cliente (5173): abas, gate de perfil, critérios de aceite  

**Fases 0 a 8 concluídas** (planejamento, scaffold, auth, mesas e reservas, cardápio, pedidos, financeiro, erros/CORS/docs, frontend cliente).  
A UI de gestão (5174) já existe nas Fases 2–6; a consolidação formal é a Fase 9, se necessária.  
Próximas: Fase 9 (gestão, se ainda for o caso) e Fase 10 (integração ponta a ponta e pacote de entrega). Fase 11 fica para polimento.

---

## Pré-requisitos

- Node.js (LTS) e npm  
- PostgreSQL instalado e em execução  

Comandos abaixo são para **PowerShell** no Windows.

---

## Como subir

### 1) Criar o banco

```sql
CREATE DATABASE get_order;
```

### 2) Backend

```powershell
cd backend
copy .env.example .env
```

Edite `backend/.env` e preencha `DB_PASSWORD` e `JWT_SECRET`.  
`CLIENT_ORIGINS` lista as duas origens (`http://localhost:5173,http://localhost:5174`). Se ficar vazio ou contiver `*`, o servidor encerra no boot.

```powershell
npm install
npx sequelize-cli db:migrate
npm run seed
npm run dev
```

- `db:migrate` cria as tabelas `usuarios`, `mesas`, `reservas`, `categorias_menu`, `itens_menu`, `pedidos`, `pedido_itens` e `compras`.
- `npm run seed` cria os usuários demo, 7 mesas (M1–M7, M7 inativa), 4 reservas de exemplo, o cardápio (5 categorias, 9 itens), 4 pedidos de exemplo (aberto, em preparo, entregue e pago) e 4 compras (despesas); pode ser executado de novo sem duplicar.

API em `http://localhost:3001` (rotas sob `/api`).  
Teste: `GET http://localhost:3001/api/health` → `{ "ok": true }`.

### Logins demo

Senha de todos: **`123456`**

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com`, `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com`, `cliente2@getorder.com`, `cliente3@getorder.com` |

Coleções Postman (rodar cada uma inteira, em ordem — ver [backend/postman/README.md](backend/postman/README.md)):

- `backend/postman/Get-Order-Auth.postman_collection.json` — auth e usuários ([FASE2_AUTH.md](docs/FASE2_AUTH.md))
- `backend/postman/Get-Order-Mesas-Reservas.postman_collection.json` — mesas e reservas ([FASE3_MESAS_RESERVAS.md](docs/FASE3_MESAS_RESERVAS.md))
- `backend/postman/Get-Order-Cardapio.postman_collection.json` — categorias e itens do cardápio ([FASE4_CARDAPIO.md](docs/FASE4_CARDAPIO.md))
- `backend/postman/Get-Order-Pedidos.postman_collection.json` — pedidos, garçom, pagamento e 10% ([FASE5_PEDIDOS.md](docs/FASE5_PEDIDOS.md))
- `backend/postman/Get-Order-Financeiro.postman_collection.json` — compras, resumo e comissões ([FASE6_FINANCEIRO.md](docs/FASE6_FINANCEIRO.md))
- `backend/postman/Get-Order-API.postman_collection.json` — índice + contrato de erro (não substitui as cinco)

```powershell
postman collection run backend/postman/Get-Order-Mesas-Reservas.postman_collection.json
postman collection run backend/postman/Get-Order-Cardapio.postman_collection.json
postman collection run backend/postman/Get-Order-Pedidos.postman_collection.json
postman collection run backend/postman/Get-Order-Financeiro.postman_collection.json
```

### 3) Frontend cliente (porta 5173)

Em outro terminal:

```powershell
cd frontend-cliente
copy .env.example .env
npm install
npm run dev
```

### 4) Frontend gestão (porta 5174)

Em outro terminal:

```powershell
cd frontend-gestao
copy .env.example .env
npm install
npm run dev
```

- **Cliente (5173):** só perfil `cliente` (admin/funcionário são recusados e apontados ao 5174); abas Reservar / Minhas reservas / Cardápio e pedido / Meus pedidos; criar conta, entrar e sair; consultar mesas livres, reservar (sex/sáb/dom, 18:00–22:30), cancelar as próprias; montar pedido (reserva opcional), cancelar `aberto` e pagar `entregue` com garçom. Detalhe: [FASE8_FRONTEND_CLIENTE.md](docs/FASE8_FRONTEND_CLIENTE.md).
- **Gestão (5174):** login de admin/funcionário (cliente é recusado); aba Reservas (filtros, confirmar/concluir/cancelar), aba Pedidos (garçom, fluxo de preparo, pagamento, cancelamento), aba Mesas e aba Cardápio (admin cria/edita/desativa; funcionário consulta); admin vê também Compras (despesas), Financeiro (resumo + comissões) e a lista de usuários; funcionário vê "Minhas comissões".

### Erros e docs (Fase 7)

Com a API no ar e o seed aplicado, o e-mail do admin já existe e o JSON quebrado não pode virar 500:

```powershell
curl.exe -s -w "`nHTTP %{http_code}`n" -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d "{\"nome\":\"Admin Demo\",\"email\":\"admin@getorder.com\",\"senha\":\"123456\"}"

curl.exe -s -w "`nHTTP %{http_code}`n" -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{"
```

Esperado: **409** `{ "erro": "E-mail já cadastrado" }` e **400** `{ "erro": "JSON inválido no corpo da requisição" }`. Nenhum dos dois traz stack nem SQL.

A coleção-índice cobre também mesa `M1` e categoria `Entradas` duplicadas:

```powershell
postman collection run backend/postman/Get-Order-API.postman_collection.json
```

FK (categoria inexistente no `INSERT`) e CHECK (`capacidade = 0` com a validação do model desligada) são traduzidos em `backend/src/utils/errosSequelize.js`. A service normalmente responde antes do banco; o mapeamento é a rede de segurança e foi exercido em transação com rollback (nada fica gravado).

O catálogo de rotas está em [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md). O SQL de referência não substitui a migration.

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
