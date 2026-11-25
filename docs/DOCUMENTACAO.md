# Documentação — get-order

Documentação alinhada ao código do monorepo `get-order`.  
As notas por fase (`FASE2_AUTH.md` … `FASE6_FINANCEIRO.md`, `FASE7_DOCS_ERROS.md`, `FASE8_FRONTEND_CLIENTE.md`, `FASE9_FRONTEND_GESTAO.md`) continuam válidas; este arquivo é o inventário único.

Artefatos relacionados: [`DER.md`](DER.md), [`MODELO_DADOS.md`](MODELO_DADOS.md), [`MATRIZ_RBAC.md`](MATRIZ_RBAC.md), [`schema_referencia.sql`](schema_referencia.sql), [`FASE0_REGRAS.md`](FASE0_REGRAS.md).

Pacote de entrega (Fase 10): [`FASE10_ENTREGA.md`](FASE10_ENTREGA.md), [`FASE10_EVIDENCIAS.md`](FASE10_EVIDENCIAS.md), [`CHECKLIST_ENTREGA.md`](CHECKLIST_ENTREGA.md).

---

## 1. Objetivo do sistema

Aplicação web para o **restaurante IOT**: o cliente reserva mesa (sexta, sábado e domingo), consulta o cardápio e faz pedidos — inclusive compra antecipada ligada a uma reserva. A gestão opera mesas, reservas, cardápio, preparo e o financeiro, com **10% do garçom** gravados no pagamento.

Há **dois sites** (cliente e gestão) e uma API REST. A autorização real fica no backend.

---

## 2. Stack tecnológica

| Camada | Tecnologia |
|--------|------------|
| Banco | PostgreSQL |
| Backend | Node.js + Express 5 |
| Persistência | **Sequelize** (models, migrations, seed) — única estratégia do projeto |
| Validação de entrada | **Zod** |
| Auth | bcrypt (senha) + JWT (sessão, **30 minutos**) |
| Frontends | Vite + React (JavaScript) + Axios — dois apps |
| Testes manuais de API | Coleções Postman em `backend/postman/` |

Base da API: `http://localhost:3001/api`.

---

## 3. Estrutura de pastas

```
get-order/
├── backend/
│   ├── .env.example          # modelo de variáveis (sem segredos reais)
│   ├── .sequelizerc
│   ├── package.json
│   ├── postman/              # 5 coleções por domínio + índice da Fase 7
│   └── src/
│       ├── config/           # conexão Sequelize
│       ├── controllers/      # HTTP fino
│       ├── middlewares/      # autenticar, autorizarPerfil, tratarErros
│       ├── migrations/       # 8 tabelas — fonte de verdade do schema
│       ├── models/
│       ├── routes/           # mapa /api
│       ├── schemas/          # Zod
│       ├── seeders/          # npm run seed
│       ├── services/         # regras de negócio
│       ├── utils/            # HttpErro, dinheiro, errosSequelize
│       └── server.js         # porta 3001
├── frontend-cliente/         # Vite — porta 5173
│   └── src/
│       ├── components/       # Login, Cadastro, Cardapio, NovaReserva, MinhasReservas, MeusPedidos
│       └── services/         # api.js (Axios) + sessao.js (sessionStorage)
├── frontend-gestao/          # Vite — porta 5174
│   └── src/
│       ├── components/       # Login, Usuarios, Mesas, Reservas, Cardapio, Pedidos, Compras, Financeiro
│       └── services/
├── docs/                     # este arquivo, DER, fases, SQL de referência
└── README.md
```

Camadas da API: **routes → controllers → services → models**. O controller não concentra regra de negócio. O service lança `HttpErro`; o middleware central formata a resposta.

---

## 4. Modelo de dados

Oito tabelas. Diagrama em [`DER.md`](DER.md); campos em [`MODELO_DADOS.md`](MODELO_DADOS.md); SQL didático em [`schema_referencia.sql`](schema_referencia.sql).

| Tabela | Papel | Destaques |
|--------|-------|-----------|
| `usuarios` | Login dos três perfis | `email` UNIQUE; `senha` = hash bcrypt; `perfil` ENUM; `ativo` |
| `mesas` | Capacidade física | `identificacao` UNIQUE; CHECK `capacidade > 0`; `ativa` |
| `reservas` | Slot sexta/sábado/domingo | FK `clienteId`, `mesaId` (`RESTRICT`); ENUM de status |
| `categorias_menu` | Grupos do cardápio | `nome` UNIQUE; `ativa` |
| `itens_menu` | Pratos e bebidas | FK `categoriaId` (`RESTRICT`); CHECK `preco >= 0`; `disponivel` |
| `pedidos` | Comanda | FK cliente, garçom e reserva opcional (`RESTRICT`); ENUM de status; CHECK do pagamento |
| `pedido_itens` | Linhas da comanda | Preço snapshot; CHECK quantidade e valores |
| `compras` | Despesas de insumos | FK `registradoPorId` (`RESTRICT`); CHECK `valor >= 0` |

**Relacionamentos 1:N**

- 1 cliente → N reservas e N pedidos
- 1 mesa → N reservas
- 1 reserva → N pedidos (vínculo opcional)
- 1 categoria → N itens
- 1 pedido → N itens de pedido
- 1 item de cardápio → N linhas de pedido
- 1 usuário (quem registrou) → N compras

Conflito de mesa **não** é UNIQUE no banco: reserva `cancelada` ou `concluida` libera o slot. A service bloqueia outra `pendente`/`confirmada` na mesma mesa, data e horário, em transação.

**Persistência:** o schema que o app usa nasce das **migrations** (`npx sequelize-cli db:migrate`). O SQL em `docs/` é referência de entrega, não o fluxo operacional.

---

## 5. Segurança

| Regra | Como está no projeto |
|-------|----------------------|
| Senha | Hash **bcrypt**; nunca texto puro no banco nem na resposta |
| Sessão | **JWT** com `JWT_SECRET`; validade **30m** (`expiresIn: '30m'`) |
| Token no cliente | `sessionStorage` (`token` e `usuario`); Axios envia `Authorization: Bearer …` |
| Conta desativada | `autenticar` relê o usuário: token dentro dos 30m não basta se `ativo = false` |
| Segredos | Só em `.env` (não versionar). Modelo: `backend/.env.example` |
| CORS | Lista explícita em `CLIENT_ORIGINS` (CSV). Padrão: `http://localhost:5173`, `http://localhost:5174`. Sem `*` |
| Boot sem origem | `CLIENT_ORIGINS` vazio ou contendo `*` encerra o processo com mensagem no console |
| Base da API | Prefixo `/api` |

### Formato de erro

Resposta de erro: `{ "erro": "mensagem" }`. Validação Zod acrescenta `detalhes`.

```json
{ "erro": "Dados inválidos", "detalhes": [{ "campo": "email", "mensagem": "E-mail inválido" }] }
```

| Origem | HTTP | Corpo |
|--------|------|--------|
| `HttpErro` (regra de negócio) | status do erro | `{ erro }` |
| Zod | 400 | `{ erro: "Dados inválidos", detalhes }` |
| JSON inválido | 400 | `{ erro }` |
| Sem token / token inválido | 401 | `{ erro }` |
| Perfil sem permissão | 403 | `{ erro }` |
| Não encontrado | 404 | `{ erro }` |
| UNIQUE (e-mail, mesa, categoria ou outro) | 409 | `{ erro }` |
| FK ausente (`23503`) ou vínculo `RESTRICT` (`23001`) | 409 | `{ erro }` |
| Validação do model / CHECK / tipo rejeitado pelo Postgres | 400 | `{ erro }` |
| Rota inexistente | 404 | `{ erro: "Rota não encontrada" }` |
| Demais | 500 | `{ erro: "Erro interno do servidor" }` |

O client não recebe stack, SQL, variável de ambiente nem caminho interno. O log completo desses erros de banco fica no processo do servidor.

Conflitos esperados (e-mail, identificação de mesa, nome de categoria, slot ocupado) são lançados como `HttpErro` **409** na service, antes do `INSERT`. O mapeamento do Sequelize cobre a corrida entre essa checagem e o banco.

---

## 6. RBAC (resumo)

Perfis: `admin` | `funcionario` | `cliente`.  
Middlewares: `autenticar` (JWT) → `autorizarPerfil(...)`. Posse (cliente só o próprio recurso; funcionário só as próprias comissões) é checada na **service**.

Matriz completa: [`MATRIZ_RBAC.md`](MATRIZ_RBAC.md).

| Área | admin | funcionario | cliente |
|------|:-----:|:-----------:|:-------:|
| Login / `GET /auth/me` | sim | sim | sim |
| Auto-cadastro `POST /auth/register` | — | — | público; força `cliente` |
| CRUD de usuários | sim | não | só o próprio (sem mudar perfil) |
| Mesas: leitura / disponibilidade | sim | sim | sim (só ativas) |
| Mesas: criar, editar, ativar | sim | não | não |
| Reservas | todas | todas | só as próprias |
| Confirmar / concluir reserva | sim | sim | não |
| Cardápio: leitura | sim (inclui inativos) | só ativos/disponíveis | só ativos/disponíveis |
| Cardápio: escrita | sim | não | não |
| Pedidos | todos | todos | só os próprios |
| Avançar preparo / atribuir garçom | sim | sim | não |
| Pagar pedido `entregue` | sim | sim | o próprio |
| Cancelar pedido `entregue` | sim | não | não |
| Compras e resumo financeiro | sim | não | não |
| Comissões | todas | só as próprias | não |

Bloqueio no frontend é só UX. A API responde **403** quando o perfil não pode.

---

## 7. Endpoints

Base: `http://localhost:3001/api`.  
Rotas com `:id` numérico inválido → **400**. Recurso ausente → **404**.

Não há `DELETE` de mesa, categoria, item, reserva ou pedido: desativar, marcar indisponível ou cancelar preserva o histórico (FKs `RESTRICT`). `DELETE /usuarios/:id` desativa. `DELETE /compras/:id` é exclusão física.

### Públicos

| Método | Rota | Auth | Notas |
|--------|------|------|--------|
| GET | `/health` | não | `{ ok: true }` |
| POST | `/auth/register` | não | Corpo `{ nome, email, senha, telefone? }`. Perfil gravado: `cliente`. 201 |
| POST | `/auth/login` | não | Corpo `{ email, senha }`. 200 `{ token, usuario: { id, nome, email, perfil } }` |

### Auth

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/auth/me` | JWT | os 3 | Usuário logado, sem senha |

### Usuários

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/usuarios` | JWT | admin | Lista. Filtro opcional `?perfil=` |
| POST | `/usuarios` | JWT | admin | Cria qualquer perfil. 201 |
| GET | `/usuarios/:id` | JWT | admin; cliente só o próprio | Funcionário usa `/auth/me` |
| PUT | `/usuarios/:id` | JWT | admin; cliente só o próprio | Cliente não muda `perfil` |
| PATCH | `/usuarios/:id` | JWT | admin; cliente só o próprio | Igual ao PUT |
| PATCH | `/usuarios/:id/ativo` | JWT | admin | Corpo `{ ativo }`. Admin não se desativa |
| DELETE | `/usuarios/:id` | JWT | admin | Desativa (`ativo=false`). 200 `{ mensagem, usuario }` |

### Mesas

`GET /mesas/disponibilidade` está declarado **antes** de `GET /mesas/:id`.

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/mesas` | JWT | os 3 | Cliente: só `ativa=true`. Admin/funcionário: `?ativa=true\|false` |
| GET | `/mesas/disponibilidade` | JWT | os 3 | Query `data`, `horario`, `pessoas`. 200 `{ data, horario, mesas }` |
| GET | `/mesas/:id` | JWT | os 3 | Cliente: 404 se inativa |
| POST | `/mesas` | JWT | admin | `{ identificacao, capacidade }`. 201 |
| PUT | `/mesas/:id` | JWT | admin | `identificacao`, `capacidade` |
| PATCH | `/mesas/:id` | JWT | admin | Igual ao PUT |
| PATCH | `/mesas/:id/ativa` | JWT | admin | `{ ativa }` |

### Reservas

Agenda: sexta, sábado e domingo; slots `18:00`–`22:30` de 30 em 30 minutos; fuso `America/Sao_Paulo`; não reserva horário passado. `quantidade_pessoas` ≤ capacidade da mesa.

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/reservas` | JWT | os 3 | Admin/funcionário: todas. Cliente: próprias. Filtros `data`, `status`, `mesaId`, `cliente` |
| POST | `/reservas` | JWT | os 3 | 201, status `pendente`. Cliente: `clienteId` ignorado (fica o próprio) |
| GET | `/reservas/:id` | JWT | os 3 | Cliente: só a própria (403 nas alheias) |
| PUT | `/reservas/:id` | JWT | os 3 | Só `pendente` ou `confirmada`; revalida slot |
| PATCH | `/reservas/:id` | JWT | os 3 | Igual ao PUT |
| PATCH | `/reservas/:id/status` | JWT | os 3 | Ver transições |

Transições: `pendente` → `confirmada` \| `cancelada`; `confirmada` → `cancelada` \| `concluida`. `confirmada` e `concluida` só equipe. Cliente cancela a própria. `cancelada` e `concluida` são terminais. Slot ocupado por outra `pendente`/`confirmada` → **409**.

### Cardápio — categorias

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/categorias` | JWT | os 3 | Funcionário/cliente: só ativas. Admin: `?ativa=` |
| GET | `/categorias/:id` | JWT | os 3 | Funcionário/cliente: 404 se inativa |
| GET | `/categorias/:id/itens` | JWT | os 3 | Mesma visibilidade de `/itens-menu`. Admin: `?disponivel=` |
| POST | `/categorias` | JWT | admin | `{ nome }`. Nome repetido → 409. 201 |
| PUT | `/categorias/:id` | JWT | admin | `{ nome }` |
| PATCH | `/categorias/:id` | JWT | admin | `{ nome }` |
| PATCH | `/categorias/:id/ativa` | JWT | admin | `{ ativa }`. Não cascateia os itens |

### Cardápio — itens

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/itens-menu` | JWT | os 3 | Funcionário/cliente: disponível e categoria ativa. `?categoriaId=` para todos. `?disponivel=` só admin |
| GET | `/itens-menu/:id` | JWT | os 3 | Funcionário/cliente: 404 se não puder ver |
| POST | `/itens-menu` | JWT | admin | `{ categoriaId, nome, descricao?, preco, disponivel? }`. Categoria precisa existir e estar ativa. 201 |
| PUT | `/itens-menu/:id` | JWT | admin | Subconjunto de `categoriaId`, `nome`, `descricao`, `preco` |
| PATCH | `/itens-menu/:id` | JWT | admin | Igual ao PUT |
| PATCH | `/itens-menu/:id/disponivel` | JWT | admin | `{ disponivel }` |

### Pedidos

`GET /pedidos/garcons` está declarado **antes** de `GET /pedidos/:id`. Sem `DELETE` de pedido.

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/pedidos` | JWT | os 3 | Admin/funcionário: todos. Cliente: próprios (`clienteId` da query é ignorado). Filtros `status`, `clienteId`, `reservaId` |
| POST | `/pedidos` | JWT | os 3 | 201, status `aberto`. `{ clienteId?, reservaId?, itens: [{ itemMenuId, quantidade }] }` |
| GET | `/pedidos/garcons` | JWT | admin, funcionario | `[{ id, nome }]` funcionários ativos |
| GET | `/pedidos/:id` | JWT | os 3 | Cliente: só o próprio |
| POST | `/pedidos/:id/itens` | JWT | os 3 | Só pedido `aberto`. `{ itemMenuId, quantidade }`. Item repetido soma na mesma linha |
| PATCH | `/pedidos/:id/itens/:pedidoItemId` | JWT | os 3 | Só `aberto`. `{ quantidade }` |
| DELETE | `/pedidos/:id/itens/:pedidoItemId` | JWT | os 3 | Só `aberto`. Não deixa o pedido vazio |
| PATCH | `/pedidos/:id/garcom` | JWT | admin, funcionario | `{ garcomId }` funcionário ativo. Não em status terminal |
| PATCH | `/pedidos/:id/status` | JWT | os 3 | `{ status }`. Ver transições |

Item pedível = `disponivel` e categoria ativa. `preco_unitario` é snapshot. Totais em centavos, resposta monetária com 2 casas.

Transições:

| De | Para | Quem |
|----|------|------|
| `aberto` | `em_preparo` | admin, funcionario |
| `aberto` | `cancelado` | os 3 (cliente: o próprio) |
| `em_preparo` | `pronto` ou `cancelado` | admin, funcionario |
| `pronto` | `entregue` ou `cancelado` | admin, funcionario |
| `entregue` | `pago` | os 3 (cliente: o próprio). Exige garçom e ao menos 1 item. Grava `valor_comissao` (10%) e `pago_em` |
| `entregue` | `cancelado` | só admin |
| `pago`, `cancelado` | — | terminais |

`reservaId` é opcional: mesma pessoa da reserva, reserva `pendente` ou `confirmada`. Cancelar a reserva não cancela o pedido.

### Compras

Tudo exige JWT de **admin**. Data `AAAA-MM-DD`, não futura (`America/Sao_Paulo`). `registradoPorId` é o admin autenticado (campo no corpo é ignorado no POST e rejeitado no PUT/PATCH).

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/compras` | JWT | admin | `?de=&ate=&q=`. `q` busca descrição ou fornecedor. Mais recentes primeiro |
| GET | `/compras/:id` | JWT | admin | |
| POST | `/compras` | JWT | admin | `{ descricao, valor, data_compra, fornecedor? }`. 201. Valor na resposta é string (`"85.50"`) |
| PUT | `/compras/:id` | JWT | admin | Campos opcionais, ao menos um |
| PATCH | `/compras/:id` | JWT | admin | Igual ao PUT |
| DELETE | `/compras/:id` | JWT | admin | 204, sem corpo |

### Financeiro

Período `de`/`ate` inclusivo e opcional. Os dois juntos exigem `de <= ate`. Pedidos pagos filtram pela data de `pago_em` em `America/Sao_Paulo`. Compras filtram por `data_compra`. Comissão é informativa: **não** entra em `resultado` (`vendas − despesas`).

| Método | Rota | Auth | Perfis | Notas |
|--------|------|------|--------|--------|
| GET | `/financeiro/resumo` | JWT | admin | `?de=&ate=` |
| GET | `/financeiro/comissoes` | JWT | admin (todos); funcionario (próprias) | `?de=&ate=` |

---

## 8. Frontends

| App | Porta | Quem entra | O que faz |
|-----|-------|------------|-----------|
| `frontend-cliente` | **5173** | só `cliente` (cadastro público); `admin`/`funcionario` são recusados na tela e apontados ao 5174 | Login/cadastro/sair; abas Reservar / Minhas reservas / Cardápio e pedido / Meus pedidos; disponibilidade e reserva; cancelar reserva própria; montar pedido (reserva opcional); cancelar `aberto`; pagar `entregue` (exige garçom na UI). Detalhe: [`FASE8_FRONTEND_CLIENTE.md`](FASE8_FRONTEND_CLIENTE.md) |
| `frontend-gestao` | **5174** | `admin` e `funcionario` (cliente é recusado na tela e apontado ao 5173) | Reservas, pedidos (garçom e status), mesas e cardápio. Admin: usuários, compras e financeiro. Funcionário: "Minhas comissões". Detalhe: [`FASE9_FRONTEND_GESTAO.md`](FASE9_FRONTEND_GESTAO.md) |

URL da API: `VITE_API_URL` (ex.: `http://localhost:3001/api`) em cada `.env.example`. Erro de API na UI usa `erro` e, se existir, o primeiro item de `detalhes`. JWT em `sessionStorage`; 401 autenticado limpa a sessão nos dois frontends.

---

## 9. Seed e logins de demonstração

Caminho oficial (não o SQL de referência):

```powershell
cd backend
npx sequelize-cli db:migrate
npm run seed
```

O seed é reexecutável (`findOrCreate`): não duplica usuário, mesa, categoria, item, reserva, pedido ou compra já gravados.

Senha de todos: **`123456`**

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com`, `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com`, `cliente2@getorder.com`, `cliente3@getorder.com` |

Também cria 7 mesas (M1–M7, M7 inativa), 4 reservas, 5 categorias (1 inativa), 9 itens (1 indisponível), 4 pedidos e 4 compras. Detalhe nas notas `FASE2` … `FASE6`.

---

## 10. Decisões técnicas (para a banca)

1. **Uma** persistência: Sequelize. Migrations em `backend/src/migrations/` são a fonte de verdade do schema.
2. `docs/schema_referencia.sql` é entrega didática (CREATE + exemplos). Não substitui `db:migrate` nem `npm run seed`.
3. Regra de negócio nas **services** (agenda, conflito de slot, transições, comissão, posse). Controllers só traduzem HTTP.
4. Entrada validada com **Zod** antes da service. Banco (UNIQUE, FK, CHECK) é a rede de segurança, mapeada para 409/400 sem vazar SQL.
5. Dois sites, uma API. CORS só nas origens listadas. JWT de 30 minutos no `sessionStorage`.
6. Dinheiro calculado em centavos inteiros; a API devolve string com 2 casas.
7. Comissão de 10% é gravada uma vez, na ida para `pago`, e só lida no financeiro. Compras não entram nessa base.
8. Coleções Postman por domínio provam o contrato; `docs/DOCUMENTACAO.md` lista o mesmo conjunto de rotas.
9. Fases 0–10 concluídas (incluindo ensaio ponta a ponta e checklist de entrega). Fase 11 (rate limit, refresh token, React Router, redesign, PWA) é opcional.
