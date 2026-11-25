# Checklist de conclusão — get-order (restaurante IOT)

Checklist no espírito da entrega acadêmica (pacote final), alinhado às Fases 0–10.  
Marcação conforme o estado **real do repositório** após o ensaio da Fase 10.

Legenda: `[x]` pronto no código/artefatos · `[ ]` ainda não feito (não implementar aqui se for Fase 11).

---

## 1. Banco e persistência

- [x] Banco com **oito** tabelas (`usuarios`, `mesas`, `reservas`, `categorias_menu`, `itens_menu`, `pedidos`, `pedido_itens`, `compras`), PKs e FKs (migrations Sequelize)
- [x] Backend conecta ao PostgreSQL (`sequelize.authenticate()` no boot)
- [x] Uma única estratégia de persistência de ponta a ponta: **Sequelize**
- [x] Models e associações implementados (`backend/src/models/`)
- [x] Seed com pelo menos três registros efetivos por tabela (`npm run seed`, reexecutável sem duplicar)

---

## 2. Segurança e autenticação

- [x] Senhas armazenadas com **bcrypt**
- [x] Login e **JWT** funcionando (expiração **30m**)
- [x] Rotas protegidas com middleware `autenticar` + `autorizarPerfil` (RBAC)
- [x] Senha **fora** das respostas JSON
- [x] Segredos em `.env` (não commitados; `.gitignore` em backend e frontends)
- [x] `backend/.env.example` presente (modelo sem segredos)
- [x] `frontend-cliente/.env.example` e `frontend-gestao/.env.example` presentes (`VITE_API_URL`)
- [x] CORS com origens explícitas (`CLIENT_ORIGINS` = 5173 e 5174; vazio/`*` encerra o boot)

---

## 3. API de negócio

- [x] Auth: register (força `cliente`), login, `GET /auth/me`
- [x] Usuários: CRUD admin + próprio cadastro (cliente); `DELETE` = desativar
- [x] Mesas: CRUD admin, disponibilidade por slot, desativar via `PATCH .../ativa`
- [x] Reservas: sex/sáb/dom + slots 18:00–22:30; conflito 409; status e posse por perfil
- [x] Cardápio: categorias e itens; visibilidade ativo/disponível; admin gerencia
- [x] Pedidos: montagem, preparo, pagamento com garçom, comissão **10%** no `pago`
- [x] Financeiro: compras (admin), resumo (`vendas − despesas`), comissões (admin todos; funcionário só as próprias)
- [x] Erros padronizados `{ erro }` / `{ erro, detalhes }` (sem stack/SQL no client)
- [x] Camadas: routes → controllers → services → models; validação Zod

---

## 4. Frontends (Fases 8–9)

- [x] Dois apps Vite React + Axios (JWT em `sessionStorage`)
- [x] `frontend-cliente` (5173): gate só `cliente`; abas Reservar / Minhas reservas / Cardápio e pedido / Meus pedidos
- [x] `frontend-gestao` (5174): gate admin/funcionário; abas por perfil (Reservas, Pedidos, Mesas, Cardápio; admin: Compras, Financeiro, Usuários; funcionario: Minhas comissões)
- [x] Login com nome do usuário e botão **Sair**
- [x] Estados de carregamento, erro e vazio nas telas principais
- [x] 401 autenticado limpa sessão e volta ao login (ambos)

---

## 5. Testes e documentação de entrega

- [x] Testes manuais com coleções **Postman** (`backend/postman/`, ordem em `backend/postman/README.md`)
- [x] Script SQL de referência com CREATE + ≥ 3 INSERTs por tabela (`docs/schema_referencia.sql`)
- [x] DER compatível com o banco (`docs/DER.md` — Mermaid)
- [x] Documentação do projeto (`docs/DOCUMENTACAO.md`)
- [x] README da raiz com setup executável (`README.md`)
- [x] Evidências do ensaio ponta a ponta (`docs/FASE10_EVIDENCIAS.md`)
- [x] Resumo da Fase 10 (`docs/FASE10_ENTREGA.md`)
- [x] Este checklist (`docs/CHECKLIST_ENTREGA.md`)

---

## 6. Versão curta (MVP acadêmico)

- [x] Banco com as oito tabelas, PKs e FKs
- [x] Login e JWT com rotas protegidas e RBAC
- [x] Reservas de mesa (sex–sáb–dom) + cardápio + pedidos
- [x] Financeiro com 10% do garçom e compras
- [x] Dois frontends consumindo a API por Axios
- [x] Senhas com bcrypt; erros sem vazar SQL/stack
- [x] Documentação, DER, SQL de referência e Postman alinhados ao código

---

## 7. Fora do escopo desta entrega (Fase 11 — NÃO implementar agora)

Marcado como pendente de propósito; não bloqueia o MVP:

- [ ] Rate limit
- [ ] Refresh token
- [ ] React Router (navegação por rotas)
- [ ] Redesign visual / polimento de apresentação
- [ ] PWA

---

## Observação para a banca

O schema operacional é criado por **migrations Sequelize** (`npx sequelize-cli db:migrate`).  
O arquivo `docs/schema_referencia.sql` é a entrega didática, alinhada a essas migrations — **não** substitui `db:migrate` nem `npm run seed`.
