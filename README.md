# get-order

Sistema acadêmico de gestão para restaurante IOT: autenticação com RBAC, reserva de mesa (sex/sáb/dom), cardápio e pedidos (incluindo compra antecipada), controle financeiro com **10% do garçom**, e **dois frontends** (cliente e gestão).

Stack: **PERN** + **Sequelize com migrations**, JWT, bcrypt, Zod e API em camadas.

## Documentação

Planejamento e modelo de dados estão em [`docs/`](docs/):

- [FASE0_REGRAS.md](docs/FASE0_REGRAS.md) — regras e decisões fechadas  
- [DER.md](docs/DER.md) — diagrama entidade-relacionamento  
- [MODELO_DADOS.md](docs/MODELO_DADOS.md) — tabelas, campos e ordem de migrations  
- [MATRIZ_RBAC.md](docs/MATRIZ_RBAC.md) — permissões por perfil  
- [FASE0_CHECKLIST.md](docs/FASE0_CHECKLIST.md) — checklist por fase  
- [FASE2_AUTH.md](docs/FASE2_AUTH.md) — endpoints de auth/usuários, erros e usuários seed  

**Fase 0 concluída. Fase 1 (scaffold) concluída. Fase 2 (auth) concluída.**  
Mesas e reservas = **Fase 3**; cardápio, pedidos e financeiro nas fases seguintes.

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
`CLIENT_ORIGINS` já lista as duas origens dos frontends (5173 e 5174).

```powershell
npm install
npx sequelize-cli db:migrate
npm run seed
npm run dev
```

- `db:migrate` cria a tabela `usuarios` (única migration até aqui).
- `npm run seed` cria os usuários demo; pode ser executado de novo sem duplicar.

API em `http://localhost:3001` (rotas sob `/api`).  
Teste: `GET http://localhost:3001/api/health` → `{ "ok": true }`.

### Logins demo

Senha de todos: **`123456`**

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com`, `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com`, `cliente2@getorder.com`, `cliente3@getorder.com` |

Coleção Postman: `backend/postman/Get-Order-Auth.postman_collection.json` (detalhes em [FASE2_AUTH.md](docs/FASE2_AUTH.md)).

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

- **Cliente (5173):** criar conta, entrar e sair.
- **Gestão (5174):** login de admin/funcionário (cliente é recusado); admin vê a lista de usuários.

---

## Estrutura do repositório

```
get-order/
├── backend/              # Express + Sequelize + Zod (camadas)
├── frontend-cliente/     # Vite React — porta 5173
├── frontend-gestao/      # Vite React — porta 5174
├── docs/                 # Fase 0 (fonte da verdade)
├── material-complementar/
└── README.md
```
