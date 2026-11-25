# Fase 11 — Polimento opcional

Entrega acadêmica **opcional** após as Fases 0–10. Não altera regras de negócio (RBAC, status, 10% do garçom, reservas sex–sáb–dom).

---

## O que foi feito

| Item | Resumo |
|------|--------|
| **11.1 Rate limit** | `express-rate-limit` em `/api` + limite mais restrito em login/register/refresh. Resposta `429` no formato `{ erro }`. `helmet` com CSP desligado (não quebra CORS). |
| **11.2 Refresh token** | Access JWT curto + refresh opaco com rotação e tabela `refresh_tokens`. Endpoints `POST /auth/refresh` e `POST /auth/logout`. Fronts: interceptor Axios tenta refresh **uma vez** em 401. |
| **11.3 React Router** | `react-router-dom` nos dois sites; deep link (F5) preserva rota; guards por autenticação/perfil. |
| **11.4 Redesign** | Identidade “Get Order” (verde oliva + ouro cítrico, Fraunces + Karla, fundo com atmosfera). Sem lib UI pesada. |
| **11.5 PWA** | `vite-plugin-pwa` nos dois fronts: manifest, ícones, service worker com cache do shell. API permanece **online**. |

---

## Decisões

### Refresh storage

**Access + refresh no `sessionStorage`** (chaves `token` e `refreshToken`).

Justificativa acadêmica:
- Dois origins (`5173` / `5174`) com CORS sem `credentials` — cookies httpOnly exigiriam `credentials: true` e `Access-Control-Allow-Credentials`, com mais atrito didático.
- Mantém o modelo da Fase 0 (sessão por aba no `sessionStorage`) e só adiciona o refresh.
- No logout o front chama `POST /auth/logout` (best-effort) e limpa o storage; o evento `EVENTO_SESSAO_EXPIRADA` continua existindo.

Persistência: hash SHA-256 do refresh em `refresh_tokens` (migration `20261125000009`). Rotação a cada `/auth/refresh` (token antigo fica `revokedAt`).

### Rate limit (defaults)

| Escopo | Env | Default |
|--------|-----|---------|
| Geral `/api` | `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | 15 min / **200** |
| Auth (`login`, `register`, `refresh`) | `RATE_LIMIT_AUTH_WINDOW_MS` / `RATE_LIMIT_AUTH_MAX` | 15 min / **20** |

JWT: `JWT_ACCESS_EXPIRES_IN=30m`, `JWT_REFRESH_EXPIRES_IN=7d` (formato `número` + `s|m|h|d`).

### Rotas React

**Cliente (5173)**

| Rota | Acesso |
|------|--------|
| `/login`, `/cadastro` | público (redireciona se já logado) |
| `/reservar`, `/minhas-reservas`, `/cardapio`, `/meus-pedidos` | só `cliente` |

**Gestão (5174)**

| Rota | Acesso |
|------|--------|
| `/login` | público |
| `/reservas`, `/pedidos`, `/mesas`, `/cardapio`, `/financeiro` | `admin` / `funcionario` |
| `/compras`, `/usuarios` | só `admin` |

### PWA — limitação

Instalável + cache do **shell** estático. Dados da API, login e RBAC **exigem rede**. Não há modo offline de pedidos/reservas.

---

## Contrato auth (delta)

Login passa a responder:

```json
{
  "token": "<access JWT>",
  "refreshToken": "<opaco>",
  "usuario": { "id": 1, "nome": "...", "email": "...", "perfil": "cliente" }
}
```

| Método | Rota | Auth | Corpo | Resposta |
|--------|------|------|-------|----------|
| POST | `/auth/refresh` | não | `{ refreshToken }` | mesmo formato do login (rotação) |
| POST | `/auth/logout` | não | `{ refreshToken? }` | `{ ok: true }` (idempotente) |

Postman: `backend/postman/Get-Order-Auth.postman_collection.json` (requests Refresh / Logout).

---

## Como testar

1. `cd backend` → `npx sequelize-cli db:migrate` → `npm run seed` → `npm run dev`
2. Subir `frontend-cliente` (5173) e `frontend-gestao` (5174)
3. Login cliente e gestão com seed (`123456`)
4. Refresh: no `.env` use `JWT_ACCESS_EXPIRES_IN=1m`, relogue, espere >1 min e use o app — a chamada deve renovar sem voltar ao login; sem refresh válido dispara `EVENTO_SESSAO_EXPIRADA`
5. Rate limit: em PowerShell, estoure login (`RATE_LIMIT_AUTH_MAX=5` ajuda) → HTTP **429** com `{ "erro": "Muitas requisições..." }`
6. Deep link: autenticado, abra `/minhas-reservas` ou `/pedidos` direto (F5) — não “quebra”
7. Fluxo feliz: reserva → pedido → pagar (Fases 3–6 intactas)
8. PWA: DevTools → Application → Manifest / Service Workers (ícone e SW visíveis)

---

## Arquivos principais

- Backend: `middlewares/rateLimit.js`, `services/authService.js`, `migrations/20261125000009-create-refresh-tokens.cjs`, `models/RefreshToken.js`, `server.js`, `.env.example`
- Fronts: `App.jsx`, `services/api.js`, `services/sessao.js`, `vite.config.js`, `index.css`, `public/icon.svg` + `pwa-*.png`
- Docs: este arquivo; checklists; `README.md`; `DOCUMENTACAO.md`
