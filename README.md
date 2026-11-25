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
- [FASE4_CARDAPIO.md](docs/FASE4_CARDAPIO.md) — categorias e itens do cardápio, visibilidade por perfil e seed  
- [FASE5_PEDIDOS.md](docs/FASE5_PEDIDOS.md) — pedidos, itens com preço snapshot, status, garçom, comissão de 10% e compra antecipada  
- [FASE6_FINANCEIRO.md](docs/FASE6_FINANCEIRO.md) — compras (despesas), resumo vendas − compras e comissões por garçom  

**Fases 0 a 6 concluídas** (planejamento, scaffold, auth, mesas e reservas, cardápio, pedidos, financeiro).  
Próxima: Fase 7 (erros, CORS e documentação de API consolidados).

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

Coleções Postman (rodar cada uma inteira, em ordem):

- `backend/postman/Get-Order-Auth.postman_collection.json` — auth e usuários ([FASE2_AUTH.md](docs/FASE2_AUTH.md))
- `backend/postman/Get-Order-Mesas-Reservas.postman_collection.json` — mesas e reservas ([FASE3_MESAS_RESERVAS.md](docs/FASE3_MESAS_RESERVAS.md))
- `backend/postman/Get-Order-Cardapio.postman_collection.json` — categorias e itens do cardápio ([FASE4_CARDAPIO.md](docs/FASE4_CARDAPIO.md))
- `backend/postman/Get-Order-Pedidos.postman_collection.json` — pedidos, garçom, pagamento e 10% ([FASE5_PEDIDOS.md](docs/FASE5_PEDIDOS.md))
- `backend/postman/Get-Order-Financeiro.postman_collection.json` — compras, resumo e comissões ([FASE6_FINANCEIRO.md](docs/FASE6_FINANCEIRO.md))

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

- **Cliente (5173):** criar conta, entrar e sair; consultar mesas livres, reservar (sex/sáb/dom, 18:00–22:30), ver e cancelar as próprias reservas; montar pedido a partir do cardápio (com reserva opcional), ver os próprios pedidos, cancelar (aberto) e pagar (entregue).
- **Gestão (5174):** login de admin/funcionário (cliente é recusado); aba Reservas (filtros, confirmar/concluir/cancelar), aba Pedidos (garçom, fluxo de preparo, pagamento, cancelamento), aba Mesas e aba Cardápio (admin cria/edita/desativa; funcionário consulta); admin vê também Compras (despesas), Financeiro (resumo + comissões) e a lista de usuários; funcionário vê "Minhas comissões".

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
