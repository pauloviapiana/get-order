# Checklist — Fase 0 (Planejamento) + Fase 1 (Scaffold) + Fase 2 (Auth)

Marcado = fechado nesta fase.

---

## Fase 0 — concluído

- [x] Ler enunciado (restaurante IOT: reservas sex–sáb–dom, menu, pedidos, financeiro 10%, dois sites)
- [x] Ler material complementar (reservas) e delimitar: apoio, não escopo total
- [x] Usar `web-car-wash` só como referência de formato/stack (Sequelize + JWT + RBAC)
- [x] Decidir horário e restrição sex/sáb/dom + janela de slots
- [x] Escolher capacidade **A (mesas)** e justificar
- [x] Fechar status + transições de **reserva**
- [x] Fechar status + transições de **pedido**
- [x] Fechar regra dos **10% do garçom** (base, quando grava, cancelamento)
- [x] Fechar relação pedido ↔ reserva (compra antecipada opcional)
- [x] Fechar papéis `admin` | `funcionario` | `cliente`
- [x] Fixar dois frontends: `frontend-cliente` + `frontend-gestao`
- [x] Fixar JWT 30m + `sessionStorage`
- [x] Produzir `docs/FASE0_REGRAS.md`
- [x] Produzir `docs/DER.md` (Mermaid)
- [x] Produzir `docs/MODELO_DADOS.md` + ordem de migrations
- [x] Produzir `docs/MATRIZ_RBAC.md`
- [x] Atualizar `README.md` da raiz (objetivo + link docs; sem setup de execução)
- [x] **Não** implementar código de app / migrations / deps nesta fase

---

## Fase 1 — scaffold (concluído)

- [x] Criar monorepo: `backend/`, `frontend-cliente/`, `frontend-gestao/`, `docs/`
- [x] Adaptar esqueleto do `web-car-wash` (Express, Sequelize CLI, `.sequelizerc`, `.env.example`)
- [x] Configurar CORS para **duas** origens (`CLIENT_ORIGINS` → 5173 e 5174)
- [x] Scaffold Vite React nos dois frontends (UI mínima: título + ping `/health`)
- [x] Criar pasta `services/` no backend (camada exigida pelo enunciado)
- [x] Preparar Zod (deps + pasta `schemas/`) sem regras de domínio completas
- [x] Health check `/api/health`
- [x] Documentar no README **como subir**
- [x] Migrations reais na ordem de `MODELO_DADOS.md` → iniciadas na Fase 2 (`usuarios`)

---

## Fase 2 — auth e usuários (concluído)

Detalhe: [`FASE2_AUTH.md`](FASE2_AUTH.md).

- [x] Migration + model `usuarios` (01 da ordem de `MODELO_DADOS.md`)
- [x] Auth: register (força `cliente`), login, `GET /auth/me`, JWT 30m, bcrypt
- [x] Middlewares `autenticar` / `autorizarPerfil` + tratador central de erros `{ erro, detalhes? }`
- [x] Schemas Zod de auth e usuários (register, login, criar, atualizar admin/próprio, ativo)
- [x] `authService` / `usuarioService` + controllers finos + rotas `/api/auth` e `/api/usuarios`
- [x] CRUD de usuários (admin) e próprio cadastro (cliente); `DELETE` = desativar
- [x] Seed reexecutável: 1 admin, 2 funcionários, 3 clientes (`npm run seed`)
- [x] Frontend cliente: cadastro, login, logout
- [x] Frontend gestão: login admin/funcionário (nega cliente) + listagem de usuários (admin)
- [x] Coleção Postman `backend/postman/Get-Order-Auth.postman_collection.json`

---

## Próximas fases (fora da Fase 2)

- [ ] **Fase 3:** migrations/models `mesas` e `reservas`; regras sex/sáb/dom, slots 18:00–22:30, disponibilidade em transação, status e transições
- [ ] Cardápio: `categorias_menu` e `itens_menu`
- [ ] Pedidos: `pedidos` e `pedido_itens`, fluxo de status, garçom e 10%
- [ ] Financeiro: `compras` e relatórios
- [ ] Seed de domínio (mesas, cardápio, reservas, pedidos, compras)
- [ ] Telas de reserva, cardápio, pedidos e financeiro nos frontends

---

## Critério de pronto da Fase 0

Outra pessoa consegue iniciar a Fase 1 **sem tirar dúvidas** sobre:

| Tema | Onde está |
|------|-----------|
| Entidades e FKs | `DER.md` + `MODELO_DADOS.md` |
| Status e transições | `FASE0_REGRAS.md` §§3–4 |
| RBAC | `MATRIZ_RBAC.md` |
| 10% do garçom | `FASE0_REGRAS.md` §5 |
| Mesas / disponibilidade | `FASE0_REGRAS.md` §2 |
| Dois sites + JWT | `FASE0_REGRAS.md` §§8–9 |
