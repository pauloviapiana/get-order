# get-order

Sistema acadêmico de gestão para restaurante IOT: autenticação com RBAC, reserva de mesa (sex/sáb/dom), cardápio e pedidos (incluindo compra antecipada), controle financeiro com **10% do garçom**, e **dois frontends** (cliente e gestão).

Stack: **PERN** + **Sequelize com migrations**, JWT, bcrypt, Zod e API em camadas.

## Documentação

Planejamento e modelo de dados estão em [`docs/`](docs/):

- [FASE0_REGRAS.md](docs/FASE0_REGRAS.md) — regras e decisões fechadas  
- [DER.md](docs/DER.md) — diagrama entidade-relacionamento  
- [MODELO_DADOS.md](docs/MODELO_DADOS.md) — tabelas, campos e ordem de migrations  
- [MATRIZ_RBAC.md](docs/MATRIZ_RBAC.md) — permissões por perfil  
- [FASE0_CHECKLIST.md](docs/FASE0_CHECKLIST.md) — checklist Fase 0 / Fase 1  

**Fase 0 concluída. Fase 1 (scaffold) concluída.**  
Migrations de domínio = **Fase 2**. Auth/RBAC = **Fase 2**.

---

## Pré-requisitos

- Node.js (LTS) e npm  
- PostgreSQL instalado e em execução  

Comandos abaixo são para **PowerShell** no Windows.

---

## Como subir o scaffold

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
npm run dev
```

API em `http://localhost:3001` (rotas sob `/api`).  
Teste: `GET http://localhost:3001/api/health` → `{ "ok": true }`.

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

Cada app mostra o título e o resultado do ping em `/api/health`.

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
