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
- [FASE3_MESAS_RESERVAS.md](docs/FASE3_MESAS_RESERVAS.md) — mesas, reservas, disponibilidade, status e seed  

**Fases 0 a 3 concluídas** (planejamento, scaffold, auth, mesas e reservas).  
Cardápio, pedidos e financeiro nas fases seguintes.

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

- `db:migrate` cria as tabelas `usuarios`, `mesas` e `reservas`.
- `npm run seed` cria os usuários demo, 7 mesas (M1–M7, M7 inativa) e 4 reservas de exemplo; pode ser executado de novo sem duplicar.

API em `http://localhost:3001` (rotas sob `/api`).  
Teste: `GET http://localhost:3001/api/health` → `{ "ok": true }`.

### Logins demo

Senha de todos: **`123456`**

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com`, `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com`, `cliente2@getorder.com`, `cliente3@getorder.com` |

Coleções Postman (rodar cada uma inteira, em ordem):

- `backend/postman/Get-Order-Auth.postman_collection.json` — auth e usuários ([FASE2_AUTH.md](docs/FASE2_AUTH.md))
- `backend/postman/Get-Order-Mesas-Reservas.postman_collection.json` — mesas e reservas ([FASE3_MESAS_RESERVAS.md](docs/FASE3_MESAS_RESERVAS.md))

```powershell
postman collection run backend/postman/Get-Order-Mesas-Reservas.postman_collection.json
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

- **Cliente (5173):** criar conta, entrar e sair; consultar mesas livres, reservar (sex/sáb/dom, 18:00–22:30), ver e cancelar as próprias reservas.
- **Gestão (5174):** login de admin/funcionário (cliente é recusado); aba Reservas (filtros, confirmar/concluir/cancelar) e aba Mesas (admin cria/edita/desativa; funcionário consulta); admin vê também a lista de usuários.

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
