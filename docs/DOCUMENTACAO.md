# Documentação — get-order

Fonte única do sistema acadêmico **get-order** (restaurante IOT).  
Fases 0–11 concluídas: MVP + polimento (rate limit, refresh token, React Router, redesign, PWA).

Setup e comandos: [`../README.md`](../README.md).  
DER: [`DER.md`](DER.md) · SQL didático: [`schema_referencia.sql`](schema_referencia.sql) · Checklist: [`CHECKLIST_ENTREGA.md`](CHECKLIST_ENTREGA.md) · Postman: [`../backend/postman/README.md`](../backend/postman/README.md).

---

## 1. Objetivo

Aplicação web para o restaurante IOT: o cliente reserva mesa (sexta, sábado e domingo), consulta o cardápio e faz pedidos — inclusive compra antecipada ligada a uma reserva. A gestão opera mesas, reservas, cardápio, preparo e o financeiro, com **10% do garçom** gravados no pagamento.

Há **dois sites** (cliente e gestão) e uma API REST. A autorização real fica no backend.

---

## 2. Stack

| Camada | Tecnologia |
|--------|------------|
| Banco | PostgreSQL |
| Backend | Node.js + Express 5 |
| Persistência | **Sequelize** (models, migrations, seed) |
| Validação | **Zod** |
| Auth | bcrypt + JWT access (**30m**) + refresh com rotação |
| Proteção | helmet, CORS explícito, rate limit |
| Frontends | Vite + React + Axios + React Router + PWA (dois apps) |
| Testes de API | Coleções Postman em `backend/postman/` |

Base da API: `http://localhost:3001/api`.

---

## 3. Estrutura de pastas

```
get-order/
├── backend/
│   ├── .env.example
│   ├── postman/              # 5 coleções por domínio + índice
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middlewares/      # autenticar, autorizarPerfil, rateLimit, tratarErros
│       ├── migrations/       # 9 tabelas — fonte de verdade do schema
│       ├── models/
│       ├── routes/
│       ├── schemas/          # Zod
│       ├── seeders/
│       ├── services/
│       ├── utils/
│       └── server.js         # porta 3001
├── frontend-cliente/         # Vite — porta 5173
├── frontend-gestao/          # Vite — porta 5174
├── docs/                     # este arquivo, DER, SQL, checklist
└── README.md
```

Camadas da API: **routes → controllers → services → models**. O service lança `HttpErro`; o middleware central formata a resposta.

---

## 4. Modelo de dados

Nove tabelas (8 de domínio + `refresh_tokens`). Diagrama: [`DER.md`](DER.md). SQL didático: [`schema_referencia.sql`](schema_referencia.sql).

| Tabela | Papel | Destaques |
|--------|-------|-----------|
| `usuarios` | Login dos três perfis | `email` UNIQUE; `senha` = bcrypt; `perfil` ENUM; `ativo` |
| `mesas` | Capacidade física | `identificacao` UNIQUE; CHECK `capacidade > 0`; `ativa` |
| `reservas` | Slot sex/sáb/dom | FK `clienteId`, `mesaId` (`RESTRICT`); ENUM de status |
| `categorias_menu` | Grupos do cardápio | `nome` UNIQUE; `ativa` |
| `itens_menu` | Pratos e bebidas | FK `categoriaId` (`RESTRICT`); CHECK `preco >= 0`; `disponivel` |
| `pedidos` | Comanda | FK cliente, garçom e reserva opcional; ENUM; CHECK do pagamento |
| `pedido_itens` | Linhas da comanda | Preço snapshot; CHECK quantidade e valores |
| `compras` | Despesas de insumos | FK `registradoPorId` (`RESTRICT`); CHECK `valor >= 0` |
| `refresh_tokens` | Sessão renovável | FK `usuarioId` (`CASCADE`); `tokenHash` UNIQUE (SHA-256); `expiresAt` / `revokedAt` |

**1:N:** cliente → reservas/pedidos; mesa → reservas; reserva → pedidos (opcional); categoria → itens; pedido → pedido_itens; item → linhas; usuário → compras; usuário → refresh_tokens.

Conflito de mesa **não** é UNIQUE no banco: `cancelada`/`concluida` liberam o slot. A service bloqueia outra `pendente`/`confirmada` na mesma mesa+data+horário, em transação.

Ordem das migrations: `usuarios` → `mesas` → `reservas` → `categorias_menu` → `itens_menu` → `pedidos` → `pedido_itens` → `compras` → `refresh_tokens`.

**Persistência:** schema operacional = `npx sequelize-cli db:migrate`. O SQL em `docs/` é só referência de entrega.

---

## 5. Regras de negócio

### Agenda de reservas

| Item | Regra |
|------|-------|
| Dias | Só **sexta, sábado e domingo** |
| Janela | **18:00–22:30**, slots de 30 min |
| Fuso | `America/Sao_Paulo` |
| Passado | Rejeitado |
| Capacidade | `quantidade_pessoas` ≤ capacidade da mesa; mesa precisa estar `ativa` |
| Conflito | Outra `pendente`/`confirmada` no mesmo slot → **409** |

Slots: `18:00, 18:30, …, 22:30`.

### Status de reserva

`pendente` → `confirmada` \| `cancelada`; `confirmada` → `cancelada` \| `concluida`.  
`confirmada`/`concluida` só equipe. Cliente cancela a própria. `cancelada`/`concluida` são terminais.

### Status de pedido

| De | Para | Quem |
|----|------|------|
| `aberto` | `em_preparo` | admin, funcionario |
| `aberto` | `cancelado` | os 3 (cliente: o próprio) |
| `em_preparo` | `pronto` ou `cancelado` | admin, funcionario |
| `pronto` | `entregue` ou `cancelado` | admin, funcionario |
| `entregue` | `pago` | os 3 (cliente: o próprio); exige garçom e ≥ 1 item |
| `entregue` | `cancelado` | só admin |
| `pago`, `cancelado` | — | terminais |

### Comissão 10% e financeiro

- `valor_comissao = round(valor_total * 0.10, 2)` gravado na ida para `pago`.
- Exige `garcomId` (funcionário ativo).
- Compras **não** entram na base dos 10%.
- Resumo: `resultado = vendas − despesas` (comissões só informativas).

### Compra antecipada

- `pedidos.reservaId` opcional; pedido sem reserva permitido.
- Reserva e pedido da mesma pessoa; reserva `pendente` ou `confirmada`.
- Cancelar a reserva **não** cancela o pedido vinculado.

---

## 6. Segurança

| Regra | Como está |
|-------|-----------|
| Senha | Hash **bcrypt**; nunca na resposta |
| Access | JWT (`JWT_SECRET`), validade **30m** |
| Refresh | Token opaco; hash SHA-256 em `refresh_tokens`; rotação em `/auth/refresh` |
| Client | `sessionStorage` (`token`, `refreshToken`, `usuario`); Axios `Authorization: Bearer …` |
| Conta desativada | `autenticar` relê o usuário; `ativo=false` → 401 |
| Rate limit | Geral `/api` (default 200/15 min); auth login/register/refresh (default 20/15 min) → **429** `{ erro }` |
| Helmet | Ativo; CSP desligado (não quebra CORS) |
| CORS | `CLIENT_ORIGINS` CSV (5173 e 5174). Vazio ou `*` encerra o boot |
| Segredos | Só `.env` (não versionar) |

### Formato de erro

`{ "erro": "mensagem" }`. Zod acrescenta `detalhes`.

| Origem | HTTP |
|--------|------|
| `HttpErro` | status do erro |
| Zod / JSON inválido / validação model | 400 |
| Sem token / inválido | 401 |
| Perfil sem permissão | 403 |
| Não encontrado / rota inexistente | 404 |
| UNIQUE / FK / vínculo RESTRICT / slot ocupado | 409 |
| Rate limit | 429 |
| Demais | 500 `{ erro: "Erro interno do servidor" }` |

O client não recebe stack, SQL nem caminho interno.

---

## 7. RBAC

Perfis: `admin` \| `funcionario` \| `cliente`.  
Middlewares: `autenticar` → `autorizarPerfil(...)`. Posse (recurso próprio) é checada na **service**.

| Área | admin | funcionario | cliente |
|------|:-----:|:-----------:|:-------:|
| Login / `GET /auth/me` / refresh / logout | sim | sim | sim |
| `POST /auth/register` | — | — | público; força `cliente` |
| CRUD usuários | sim | não | só o próprio (sem mudar perfil) |
| Mesas: leitura / disponibilidade | sim | sim | sim (só ativas) |
| Mesas: criar, editar, ativar | sim | não | não |
| Reservas | todas | todas | só as próprias |
| Confirmar / concluir reserva | sim | sim | não |
| Cardápio: leitura | todos (admin vê inativos) | só ativos/disponíveis | só ativos/disponíveis |
| Cardápio: escrita | sim | não | não |
| Pedidos | todos | todos | só os próprios |
| Preparo / atribuir garçom | sim | sim | não |
| Pagar `entregue` | sim | sim | o próprio |
| Cancelar `entregue` | sim | não | não |
| Compras e resumo financeiro | sim | não | não |
| Comissões | todas | só as próprias | não |

Bloqueio no frontend é só UX. A API responde **403** quando o perfil não pode.

---

## 8. Endpoints

Base: `http://localhost:3001/api`.  
`:id` numérico inválido → **400**. Recurso ausente → **404**.

Sem `DELETE` de mesa, categoria, item, reserva ou pedido (desativar/cancelar). `DELETE /usuarios/:id` desativa. `DELETE /compras/:id` é exclusão física.

### Públicos / auth

| Método | Rota | Auth | Notas |
|--------|------|------|--------|
| GET | `/health` | não | `{ ok: true }` |
| POST | `/auth/register` | não | `{ nome, email, senha, telefone? }` → perfil `cliente`. 201 |
| POST | `/auth/login` | não | `{ email, senha }` → `{ token, refreshToken, usuario }` |
| POST | `/auth/refresh` | não | `{ refreshToken }` → rotação; mesmo formato do login |
| POST | `/auth/logout` | não | `{ refreshToken? }` → `{ ok: true }` (idempotente) |
| GET | `/auth/me` | JWT | Usuário logado (os 3 perfis), sem senha |

### Usuários

| Método | Rota | Perfis | Notas |
|--------|------|--------|--------|
| GET | `/usuarios` | admin | `?perfil=` |
| POST | `/usuarios` | admin | Qualquer perfil. 201 |
| GET | `/usuarios/:id` | admin; cliente próprio | |
| PUT/PATCH | `/usuarios/:id` | admin; cliente próprio | Cliente não muda `perfil` |
| PATCH | `/usuarios/:id/ativo` | admin | Admin não se desativa |
| DELETE | `/usuarios/:id` | admin | Soft: `ativo=false` |

### Mesas

`GET /mesas/disponibilidade` **antes** de `GET /mesas/:id`.

| Método | Rota | Perfis | Notas |
|--------|------|--------|--------|
| GET | `/mesas` | os 3 | Cliente: só ativas |
| GET | `/mesas/disponibilidade` | os 3 | `data`, `horario`, `pessoas` |
| GET | `/mesas/:id` | os 3 | Cliente: 404 se inativa |
| POST / PUT / PATCH | `/mesas` … | admin | |
| PATCH | `/mesas/:id/ativa` | admin | `{ ativa }` |

### Reservas

| Método | Rota | Perfis | Notas |
|--------|------|--------|--------|
| GET | `/reservas` | os 3 | Cliente: próprias. Filtros `data`, `status`, `mesaId`, `cliente` |
| POST | `/reservas` | os 3 | 201 `pendente`. Cliente: `clienteId` = self |
| GET | `/reservas/:id` | os 3 | Cliente: 403 nas alheias |
| PUT/PATCH | `/reservas/:id` | os 3 | Só `pendente`/`confirmada` |
| PATCH | `/reservas/:id/status` | os 3 | Ver §5 |

### Cardápio

| Método | Rota | Perfis | Notas |
|--------|------|--------|--------|
| GET | `/categorias`, `/categorias/:id`, `/categorias/:id/itens` | os 3 | Func/cliente: só ativas |
| POST / PUT / PATCH | `/categorias` … | admin | Nome duplicado → 409 |
| PATCH | `/categorias/:id/ativa` | admin | Não cascateia itens |
| GET | `/itens-menu`, `/itens-menu/:id` | os 3 | Func/cliente: disponível + categoria ativa |
| POST / PUT / PATCH | `/itens-menu` … | admin | |
| PATCH | `/itens-menu/:id/disponivel` | admin | `{ disponivel }` |

### Pedidos

`GET /pedidos/garcons` **antes** de `GET /pedidos/:id`.

| Método | Rota | Perfis | Notas |
|--------|------|--------|--------|
| GET | `/pedidos` | os 3 | Cliente: próprios |
| POST | `/pedidos` | os 3 | 201 `aberto`; `{ clienteId?, reservaId?, itens }` |
| GET | `/pedidos/garcons` | admin, funcionario | Funcionários ativos |
| GET | `/pedidos/:id` | os 3 | Cliente: só o próprio |
| POST / PATCH / DELETE | `…/itens` | os 3 | Só pedido `aberto` |
| PATCH | `/pedidos/:id/garcom` | admin, funcionario | `{ garcomId }` |
| PATCH | `/pedidos/:id/status` | os 3 | Ver §5 |

`preco_unitario` é snapshot. Totais em centavos; resposta monetária com 2 casas.

### Compras e financeiro

| Método | Rota | Perfis | Notas |
|--------|------|--------|--------|
| GET/POST/PUT/PATCH/DELETE | `/compras` … | admin | Data não futura; `registradoPorId` = autenticado |
| GET | `/financeiro/resumo` | admin | `?de=&ate=` |
| GET | `/financeiro/comissoes` | admin (todos); funcionario (próprias) | `?de=&ate=` |

---

## 9. Frontends

| App | Porta | Gate | Rotas React |
|-----|-------|------|-------------|
| `frontend-cliente` | **5173** | só `cliente`; admin/func → apontados ao 5174 | `/login`, `/cadastro` (públicas); `/reservar`, `/minhas-reservas`, `/cardapio`, `/meus-pedidos` |
| `frontend-gestao` | **5174** | só `admin`/`funcionario`; cliente → 5173 | `/login`; `/reservas`, `/pedidos`, `/mesas`, `/cardapio`, `/financeiro`; `/compras`, `/usuarios` (só admin) |

- `VITE_API_URL` (ex.: `http://localhost:3001/api`).
- JWT + refresh em `sessionStorage`; interceptor Axios renova **uma vez** em 401; sem refresh válido limpa sessão.
- Erro na UI: campo `erro` (+ primeiro `detalhes` se houver).
- PWA: shell estático instalável; API exige rede (sem offline de pedidos/reservas).

---

## 10. Seed / usuários demo

```powershell
cd backend
npx sequelize-cli db:migrate
npm run seed
```

Seed reexecutável (`findOrCreate`). Senha de todos: **`123456`**.

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com`, `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com`, `cliente2@getorder.com`, `cliente3@getorder.com` |

Também: 7 mesas (M1–M7, M7 inativa), 4 reservas, 5 categorias (1 inativa), 9 itens (1 indisponível), 4 pedidos e 4 compras.

---

## 11. Decisões técnicas

1. **Migrations** em `backend/src/migrations/` são a fonte de verdade do schema.
2. `docs/schema_referencia.sql` é entrega didática (CREATE + exemplos) — não substitui `db:migrate` nem `npm run seed`.
3. Regra de negócio nas **services**; controllers só traduzem HTTP.
4. Entrada validada com **Zod**; banco (UNIQUE, FK, CHECK) mapeado para 409/400 sem vazar SQL.
5. Dois sites, uma API. CORS só nas origens listadas. Access JWT (~30m) + refresh com rotação.
6. Dinheiro em centavos inteiros; API devolve string com 2 casas.
7. Comissão de 10% gravada uma vez, na ida para `pago`.
8. Coleções Postman por domínio; este arquivo lista o mesmo conjunto de rotas.
9. **PWA = shell only** — instalável e cache do estático; dados e RBAC exigem API online.
