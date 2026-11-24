# Checklist — Fase 0 (Planejamento) + Fase 1 (Scaffold)

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
- [ ] Migrations reais na ordem de `MODELO_DADOS.md` → **Fase 2** (após scaffold)

---

## Fase 2 — próximo (domínio)

- [ ] Migrations + models na ordem de `MODELO_DADOS.md` (`usuarios`, `mesas`, `reservas`, menu, pedidos, compras…)
- [ ] Auth: login, JWT emitido, bcrypt, middlewares `autenticar` / `autorizar`
- [ ] Schemas Zod de domínio
- [ ] Controllers/services de negócio (reservas, pedidos, financeiro…)
- [ ] Seed de dados de domínio
- [ ] Telas nos frontends (cliente e gestão) conforme `FASE0_REGRAS` §8

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
