# Checklist de entrega — get-order

Pacote acadêmico final (Fases 0–11). Marcação conforme o estado **real** do repositório.

Legenda: `[x]` pronto · `[ ]` pendente.

---

## Banco

- [x] **9 tabelas** via migrations: 8 de domínio (`usuarios`, `mesas`, `reservas`, `categorias_menu`, `itens_menu`, `pedidos`, `pedido_itens`, `compras`) + `refresh_tokens`
- [x] Backend conecta ao PostgreSQL (`sequelize.authenticate()` no boot)
- [x] Persistência única: **Sequelize** (models + associações)
- [x] Seed reexecutável com ≥ 3 registros efetivos por tabela de domínio (`npm run seed`)

---

## Segurança

- [x] Senhas com **bcrypt**; senha fora do JSON
- [x] Access JWT (**30m**) + refresh com rotação (`POST /auth/refresh`, `POST /auth/logout`)
- [x] Middlewares `autenticar` + `autorizarPerfil` (RBAC)
- [x] Rate limit em `/api` e nas rotas de auth (429 `{ erro }`)
- [x] Helmet + CORS explícito (`CLIENT_ORIGINS`; vazio/`*` encerra o boot)
- [x] Segredos em `.env` (não commitados); `.env.example` no backend e nos dois fronts

---

## API

- [x] Auth: register (força `cliente`), login, me, refresh, logout
- [x] Usuários, mesas, reservas (sex–dom + slots), cardápio, pedidos (10% no `pago`)
- [x] Financeiro: compras, resumo (`vendas − despesas`), comissões
- [x] Erros `{ erro }` / `{ erro, detalhes }` sem stack/SQL no client
- [x] Camadas routes → controllers → services → models; validação Zod

---

## Frontends

- [x] Dois apps Vite React + Axios + **React Router** + PWA (shell)
- [x] Cliente **5173**: gate só `cliente`; rotas `/login`, `/cadastro`, `/reservar`, `/minhas-reservas`, `/cardapio`, `/meus-pedidos`
- [x] Gestão **5174**: gate admin/funcionário; rotas `/login`, `/reservas`, `/pedidos`, `/mesas`, `/cardapio`, `/compras`, `/financeiro`, `/usuarios`
- [x] Access + refresh em `sessionStorage`; interceptor renova em 401; logout limpa sessão

---

## Testes e docs

- [x] Coleções Postman (`backend/postman/`, ordem no README da pasta)
- [x] SQL de referência com CREATE + ≥ 3 INSERTs por tabela ([`schema_referencia.sql`](schema_referencia.sql))
- [x] DER Mermaid ([`DER.md`](DER.md))
- [x] Documentação única ([`DOCUMENTACAO.md`](DOCUMENTACAO.md))
- [x] README da raiz com setup executável
- [x] Este checklist

---

## Evidências (Fase 10)

Ensaio ponta a ponta em **2026-11-25** (Windows + PowerShell; migrate + seed ×2; API 3001; fronts 5173/5174). Senha demo: `123456`.

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Health + login dos 3 perfis | **PASS** |
| 2 | 401 sem/ inválido token; 403 perfil errado | **PASS** |
| 3 | Reserva válida; 409 conflito; cancelar libera slot | **PASS** |
| 4 | Cardápio: visibilidade por perfil; admin gerencia | **PASS** |
| 5 | Pedido → preparo → entregue → pago com garçom (10%) | **PASS** |
| 6 | Cliente não acessa pedido/reserva alheios (403) | **PASS** |
| 7 | Financeiro: resumo e comissões (func só as próprias) | **PASS** |
| 8 | Erros padronizados sem stack/SQL | **PASS** |
| 9 | UI cliente (5173): gate, reserva, pedido, pagar | **PASS** |
| 10 | UI gestão (5174): gate, operação e abas admin | **PASS** |
| 11 | 401 autenticado limpa sessão e volta ao login | **PASS** |

Postman (0 fails): Auth 40/87 · Mesas-Reservas 69/152 · Cardápio 67/145 · Pedidos 97/217 · Financeiro 52/129 · índice API 6/16 (requests/assertions).

---

## Polimento (Fase 11) — verificado no código

- [x] Rate limit (`middlewares/rateLimit.js` + `server.js`)
- [x] Refresh token (migration `refresh_tokens`, `POST /auth/refresh` e `/auth/logout`, interceptor nos fronts)
- [x] React Router nos dois apps (`App.jsx` com `Routes` / guards)
- [x] Redesign visual (identidade Get Order nos CSS)
- [x] PWA (`vite-plugin-pwa`; shell offline; API online)

---

## Observação para a banca

O schema operacional nasce de **`npx sequelize-cli db:migrate`**.  
[`schema_referencia.sql`](schema_referencia.sql) é entrega didática alinhada às migrations — **não** substitui migrate nem seed.  
Setup: [`../README.md`](../README.md). Inventário: [`DOCUMENTACAO.md`](DOCUMENTACAO.md).
