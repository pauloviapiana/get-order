# Fase 10 — Evidências do ensaio ponta a ponta

Data do ensaio: **2026-11-25**.  
Ambiente: Windows + PowerShell; PostgreSQL local; API em `http://localhost:3001`; `frontend-cliente` em `5173`; `frontend-gestao` em `5174`.  
Seed: `npm run seed` (2× consecutivas, sem duplicar). Senha demo: `123456`.

Coleções Postman na ordem de [`backend/postman/README.md`](../backend/postman/README.md).  
Frontends: ensaio manual no browser com usuários do seed.

Legenda: **PASS** = critério atendido · **FAIL** = falhou (bug ou ambiente).

---

## Tabela de cenários

| # | Cenário | Resultado | Como testou | Observação |
|---|---------|-----------|-------------|------------|
| 1 | Health + login dos 3 perfis | **PASS** | Postman `Get-Order-Auth` (Health, Login admin/funcionario/cliente) | 40 req / 87 assertions, 0 fail. Health `{ "ok": true }`. |
| 2 | 401 sem token / token inválido; 403 perfil errado | **PASS** | Postman Auth (Me sem token, Me token inválido, Listar sem token, Listar como funcionario/cliente) | Corpo `{ erro }`. |
| 3 | Reserva válida (sex/sáb/dom + slot); 409 conflito; cancelar libera slot | **PASS** | Postman `Get-Order-Mesas-Reservas` (criação, conflito cliente2, cancelamento e nova reserva no slot) | Também dia útil / horário inválido → 400. |
| 4 | Cardápio: cliente/funcionário só ativo/disponível; admin gerencia | **PASS** | Postman `Get-Order-Cardapio` | Cliente sem Moqueca/Fondue; admin vê indisponível e gerencia ativa/disponivel. 67 req / 145 assertions, 0 fail. |
| 5 | Pedido: montar → preparo → entregue → pagar com garçom; comissão 10% | **PASS** | Postman `Get-Order-Pedidos` | Fluxo completo + snapshot de preço; comissão gravada no `pago`. |
| 6 | Cliente não acessa pedido/reserva de outro | **PASS** | Postman Mesas-Reservas + Pedidos (GET/PATCH alheios) | Contrato atual: **403** `{ erro }` (não 404). |
| 7 | Financeiro: resumo (vendas − compras) e comissões; funcionário só as próprias | **PASS** | Postman `Get-Order-Financeiro` | Resumo bate com somas independentes; funcionario1/2 só `garcomId = self`. 52 req / 129 assertions, 0 fail. |
| 8 | Erros padronizados `{ erro }` / `{ erro, detalhes }` (sem stack/SQL) | **PASS** | Postman `Get-Order-API` + asserts das demais | JSON inválido 400; e-mail/mesa/categoria duplicados 409; sem stack/SQL no client. 6 req / 16 assertions, 0 fail. |
| 9 | UI cliente (5173): gate; reserva; pedido; cancela `aberto`; paga `entregue` | **PASS** | Browser em `http://localhost:5173` | Admin recusado (mensagem → 5174). `cliente1`: reserva M1 sex 27/11 18:00; pedido Água; cancelou `#28`. `cliente2`: pagou seed `#2` entregue (R$ 254,40). |
| 10 | UI gestão (5174): gate; funcionario opera; admin vê compras/financeiro/usuários/… | **PASS** | Browser em `http://localhost:5174` | Cliente recusado (mensagem → 5173). Funcionario: Reservas/Pedidos/Mesas/Cardápio/Minhas comissões. Admin: + Compras/Financeiro/Usuários; resumo e comissões carregaram. |
| 11 | Sessão expirada/401: limpa sessão e volta ao login (ambos) | **PASS** | Código + contrato das Fases 8/9 | Interceptor Axios idêntico nos dois apps (`api.js`): 401 com `Authorization` → `limparSessao()` + evento `sessao-expirada`; `App.jsx` volta ao login. |

---

## Subida “do zero” (verificação A)

| Item | Resultado |
|------|-----------|
| `backend/.env.example` | Completo (PORT, DB_*, JWT_SECRET, CLIENT_ORIGINS) — sem segredos reais |
| `frontend-cliente/.env.example` | `VITE_API_URL=http://localhost:3001/api` |
| `frontend-gestao/.env.example` | Idem |
| `npm run seed` × 2 | Idempotente (`já existia` em todas as chaves) |
| Contagens após seed (≥ 3/tabela) | usuarios 6 · mesas 7 · reservas 4 · categorias_menu 5 · itens_menu 9 · pedidos 4 · compras 4 (pedido_itens ≥ 3 via linhas dos pedidos) |
| `GET /api/health` | `{ "ok": true }` |

---

## Resumo Postman (ordem oficial)

| Ordem | Coleção | Requests | Assertions | Failed |
|------:|---------|----------|------------|--------|
| 1 | Get-Order-Auth | 40 | 87 | 0 |
| 2 | Get-Order-Mesas-Reservas | 69 | 152 | 0 |
| 3 | Get-Order-Cardapio | 67 | 145 | 0 |
| 4 | Get-Order-Pedidos | 97 | 217 | 0 |
| 5 | Get-Order-Financeiro | 52 | 129 | 0 |
| — | Get-Order-API (índice) | 6 | 16 | 0 |

Comando típico (a partir da raiz do monorepo):

```powershell
postman collection run backend/postman/Get-Order-Auth.postman_collection.json
postman collection run backend/postman/Get-Order-Mesas-Reservas.postman_collection.json
postman collection run backend/postman/Get-Order-Cardapio.postman_collection.json
postman collection run backend/postman/Get-Order-Pedidos.postman_collection.json
postman collection run backend/postman/Get-Order-Financeiro.postman_collection.json
postman collection run backend/postman/Get-Order-API.postman_collection.json
```

---

## Bugs encontrados no ensaio

Nenhum bug bloqueante de código. Nenhuma correção de aplicação foi necessária nesta fase.
