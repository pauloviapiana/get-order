# Fase 10 — Integração ponta a ponta e pacote de entrega

Escopo: provar que o sistema sobe do zero, o seed funciona, os cenários críticos passam (API + dois frontends) e outra pessoa executa só com o README.  
**Não** reimplementa Fases 2–9; **não** inicia Fase 11.

---

## O que foi ensaiado

- Subida documentada: migrate → seed (2×, sem duplicar) → `npm run dev` → health OK.
- Seis coleções Postman na ordem oficial (Auth → Mesas/Reservas → Cardápio → Pedidos → Financeiro + índice de erros).
- UI cliente (5173): gate de perfil, reserva, pedido, cancelar `aberto`, pagar `entregue`.
- UI gestão (5174): gate de perfil, operação funcionario, abas admin (compras/financeiro/usuários/…).
- Pacote de artefatos: evidências, checklist de entrega, README polido, checklist de fases atualizado.

Detalhe cenário a cenário: [`FASE10_EVIDENCIAS.md`](FASE10_EVIDENCIAS.md).

---

## Comandos oficiais (PowerShell)

```powershell
# Banco (uma vez)
# CREATE DATABASE get_order;

cd backend
copy .env.example .env
# Editar DB_PASSWORD e JWT_SECRET
npm install
npx sequelize-cli db:migrate
npm run seed
npm run dev
# → http://localhost:3001/api/health
```

```powershell
cd frontend-cliente
copy .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

```powershell
cd frontend-gestao
copy .env.example .env
npm install
npm run dev
# → http://localhost:5174
```

Postman (API no ar, seed aplicado):

```powershell
postman collection run backend/postman/Get-Order-Auth.postman_collection.json
postman collection run backend/postman/Get-Order-Mesas-Reservas.postman_collection.json
postman collection run backend/postman/Get-Order-Cardapio.postman_collection.json
postman collection run backend/postman/Get-Order-Pedidos.postman_collection.json
postman collection run backend/postman/Get-Order-Financeiro.postman_collection.json
postman collection run backend/postman/Get-Order-API.postman_collection.json
```

Ordem e notas: [`backend/postman/README.md`](../backend/postman/README.md).

---

## Logins demo

Senha de todos: **`123456`**

| Perfil | E-mail |
|--------|--------|
| admin | `admin@getorder.com` |
| funcionario | `funcionario1@getorder.com`, `funcionario2@getorder.com` |
| cliente | `cliente1@getorder.com`, `cliente2@getorder.com`, `cliente3@getorder.com` |

---

## Links do pacote

| Artefato | Caminho |
|----------|---------|
| Evidências (11 cenários) | [`FASE10_EVIDENCIAS.md`](FASE10_EVIDENCIAS.md) |
| Checklist de entrega | [`CHECKLIST_ENTREGA.md`](CHECKLIST_ENTREGA.md) |
| Inventário da API | [`DOCUMENTACAO.md`](DOCUMENTACAO.md) |
| Checklist por fase | [`FASE0_CHECKLIST.md`](FASE0_CHECKLIST.md) |
| Postman | [`backend/postman/README.md`](../backend/postman/README.md) |
| Setup | [`README.md`](../README.md) |

---

## Critérios de aceite da Fase 10

| Critério | Status |
|----------|--------|
| Outra pessoa sobe só com o README | Atendido (README com pré-requisitos, DB, `.env`, migrate, seed, backend, dois frontends, logins, links) |
| Seed reexecutável e demonstrável | Atendido (`findOrCreate`; ≥ 3 registros/tabela) |
| `FASE10_EVIDENCIAS.md` com os 11 cenários | Atendido (todos **PASS**) |
| `CHECKLIST_ENTREGA.md` fiel ao código | Atendido |
| Nenhum segredo real no Git | Atendido (só `.env.example`; `.env` no `.gitignore`) |

---

## Próxima fase (não implementada)

**Fase 11** — polimento opcional: rate limit, refresh token, React Router, redesign visual, PWA.
