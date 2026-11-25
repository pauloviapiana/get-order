# Checklist — Fase 0 (Planejamento) + Fase 1 (Scaffold) + Fase 2 (Auth) + Fase 3 (Mesas e reservas) + Fase 4 (Cardápio) + Fase 5 (Pedidos)

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

## Fase 3 — mesas e reservas (concluído)

Detalhe: [`FASE3_MESAS_RESERVAS.md`](FASE3_MESAS_RESERVAS.md).

- [x] Migrations + models `mesas` e `reservas` (02 e 03 de `MODELO_DADOS.md`), FKs `RESTRICT`, CHECKs, ENUM de status, associações
- [x] Regras no `reservaService`: sex/sáb/dom, slots 18:00–22:30, passado (America/Sao_Paulo), capacidade, mesa ativa
- [x] Conflito de slot em transação com lock da mesa → 409; cancelada/concluída liberam o slot
- [x] Transições de status de §3 (terminais travados); edição só em `pendente`/`confirmada` com revalidação
- [x] RBAC: cliente só as próprias; só equipe confirma/conclui; escrita de mesas só admin
- [x] `mesaService`: CRUD admin, desativar via `PATCH /mesas/:id/ativa`, disponibilidade por slot
- [x] Schemas Zod de mesas e reservas; rotas `/api/mesas` e `/api/reservas`
- [x] Seed: 7 mesas (M1–M7, uma inativa) + 4 reservas com status variados, reexecutável
- [x] Coleção Postman `backend/postman/Get-Order-Mesas-Reservas.postman_collection.json`
- [x] Frontend cliente: disponibilidade, reservar, minhas reservas, cancelar
- [x] Frontend gestão: abas Reservas (filtros + confirmar/concluir/cancelar) e Mesas (CRUD/desativar admin)

---

## Fase 4 — cardápio (concluído)

Detalhe: [`FASE4_CARDAPIO.md`](FASE4_CARDAPIO.md).

- [x] Cardápio: migrations + models `categorias_menu` e `itens_menu` (04 e 05 de `MODELO_DADOS.md`), FK `RESTRICT`, CHECK `preco >= 0`, associações
- [x] `categoriaService` / `itemMenuService`: CRUD admin, nome de categoria único (409), item só em categoria ativa, sem DELETE (`ativa` / `disponivel`)
- [x] Visibilidade: funcionário/cliente só categorias ativas e itens disponíveis de categoria ativa (404 no resto); desativar categoria não cascateia
- [x] Schemas Zod de categorias e itens; rotas `/api/categorias` e `/api/itens-menu`
- [x] Seed: 5 categorias (1 inativa) + 9 itens (1 indisponível), reexecutável
- [x] Coleção Postman `backend/postman/Get-Order-Cardapio.postman_collection.json`
- [x] Frontend cliente: seção Cardápio (leitura)
- [x] Frontend gestão: aba Cardápio (admin edita; funcionário consulta)

---

## Fase 5 — pedidos e compra antecipada (concluído)

Detalhe: [`FASE5_PEDIDOS.md`](FASE5_PEDIDOS.md).

- [x] Migrations + models `pedidos` e `pedido_itens` (06 e 07 de `MODELO_DADOS.md`), FKs `RESTRICT`, CHECKs (incl. pago ⇒ garçom + comissão + `pago_em`), ENUM de status, associações
- [x] Item pedível = disponível **e** categoria ativa (checado em transação); preço snapshot; totais em centavos; item repetido soma na mesma linha
- [x] Itens só com pedido `aberto` (adicionar / alterar quantidade / remover linha; pedido nunca vazio)
- [x] Transições de §4 com perfis exatos (cliente: cancelar `aberto` e pagar o próprio; `entregue → cancelado` só admin); terminais travados
- [x] Garçom (funcionário ativo) obrigatório para `pago`; comissão de 10% gravada no pagamento; cancelado sem comissão
- [x] Compra antecipada: `reservaId` opcional, mesma pessoa, reserva `pendente`/`confirmada`; cancelar reserva não cancela pedido
- [x] RBAC/posse: cliente só os próprios; equipe vê todos, cria para cliente, atribui garçom e avança preparo
- [x] Schemas Zod de pedidos; rotas `/api/pedidos` (+ `GET /pedidos/garcons` auxiliar); sem DELETE de pedido
- [x] Seed: 4 pedidos (aberto com reserva, entregue com garçom, em preparo, pago com comissão), reexecutável
- [x] Coleção Postman `backend/postman/Get-Order-Pedidos.postman_collection.json`
- [x] Frontend cliente: montar pedido a partir do cardápio (reserva opcional), meus pedidos, cancelar, pagar
- [x] Frontend gestão: aba Pedidos (filtro, garçom, fluxo de status, cancelamento excepcional só admin)

---

## Próximas fases (fora da Fase 5)

- [ ] Financeiro: `compras` (migration 08), CRUD admin e relatórios (vendas − compras, comissões por garçom)
- [ ] Seed de `compras`
- [ ] Telas de compras e financeiro nos frontends

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
