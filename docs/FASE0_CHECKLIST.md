# Checklist — Fase 0 (Planejamento) + Fase 1 (Scaffold) + Fase 2 (Auth) + Fase 3 (Mesas e reservas) + Fase 4 (Cardápio) + Fase 5 (Pedidos) + Fase 6 (Financeiro) + Fase 7 (Erros, CORS e docs) + Fase 8 (Frontend cliente) + Fase 9 (Frontend gestão) + Fase 10 (Integração e entrega)

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

## Fase 6 — financeiro (concluído)

Detalhe: [`FASE6_FINANCEIRO.md`](FASE6_FINANCEIRO.md).

- [x] Migration + model `compras` (08 de `MODELO_DADOS.md`), FK `registradoPorId` `RESTRICT`, CHECK `valor >= 0`, índices `data_compra` / `registradoPorId`, associação `registradoPor`
- [x] `compraService`: CRUD só admin, `registradoPorId` = admin autenticado, data não futura, filtros `de`/`ate`/`q`, DELETE físico
- [x] `financeiroService`: resumo (vendas `pago` − compras; comissão informativa, fora do resultado) e comissões por garçom (admin todos; funcionário só as próprias)
- [x] Período inclusivo e opcional: pedidos pela data de `pago_em` em `America/Sao_Paulo`, compras por `data_compra`; `de <= ate`
- [x] Dinheiro em string com 2 casas; diferenças em centavos (`dinheiro.js` agora aceita negativos)
- [x] Schemas Zod de compras e período; rotas `/api/compras` e `/api/financeiro`
- [x] Seed: 4 compras ligadas ao admin, reexecutável
- [x] Coleção Postman `backend/postman/Get-Order-Financeiro.postman_collection.json` (resumo conferido contra somas independentes)
- [x] Frontend gestão: abas Compras (admin) e Financeiro (admin: resumo + comissões; funcionário: "Minhas comissões"), filtro de período
- [x] Frontend cliente: sem compras/financeiro (por decisão)

---

## Fase 7 — erros, CORS e documentação (concluído)

Detalhe: [`FASE7_DOCS_ERROS.md`](FASE7_DOCS_ERROS.md). Inventário: [`DOCUMENTACAO.md`](DOCUMENTACAO.md). SQL didático: [`schema_referencia.sql`](schema_referencia.sql).

- [x] FK ausente (`23503`) e vínculo `RESTRICT` (`23001`) → 409; CHECK / validação de model / tipo óbvio do Postgres → 400; UNIQUE generalizado (mensagens atuais mantidas)
- [x] Client segue recebendo só `{ erro }` / `{ erro, detalhes }`; SQL e stack ficam no log do servidor
- [x] CORS: `CLIENT_ORIGINS` com 5173 e 5174; boot encerra se a lista vier vazia ou com `*`
- [x] `docs/DOCUMENTACAO.md` com o inventário das rotas reais
- [x] `docs/schema_referencia.sql` com as 8 tabelas das migrations e ≥ 3 INSERTs cada
- [x] `backend/postman/README.md` + coleção-índice `Get-Order-API.postman_collection.json`
- [x] README da raiz atualizado (Fases 0–7)

---

## Fase 8 — frontend cliente (concluído)

Detalhe: [`FASE8_FRONTEND_CLIENTE.md`](FASE8_FRONTEND_CLIENTE.md).

Telas básicas já existiam nas Fases 2–5; esta fase consolidou o site do cliente (5173) para entrega acadêmica:

- [x] Gate de perfil: só `cliente` grava sessão; `admin`/`funcionario` são recusados com mensagem apontando o 5174
- [x] Área autenticada em abas (Reservar | Minhas reservas | Cardápio e pedido | Meus pedidos), padrão do gestão
- [x] Fluxos: cadastro → login → reservar/cancelar → pedir (reserva opcional) → cancelar `aberto` / pagar `entregue` com garçom
- [x] UX: loading, erro (`mensagemDeErro`), vazio, disabled em submit; sessão expirada limpa e volta ao login
- [x] Preços em R$; sem endpoints de gestão; sem React Router / deps novas
- [x] `docs/FASE8_FRONTEND_CLIENTE.md` + checklist/README atualizados

---

## Fase 9 — frontend gestão (concluído)

Detalhe: [`FASE9_FRONTEND_GESTAO.md`](FASE9_FRONTEND_GESTAO.md).

Telas básicas já existiam nas Fases 2–6; esta fase consolidou o site de gestão (5174) para entrega acadêmica:

- [x] Gate de perfil: só `admin`/`funcionario` gravam sessão; `cliente` é recusado com mensagem apontando o 5173
- [x] Área autenticada em abas por perfil (Reservas | Pedidos | Mesas | Cardápio | Compras/Financeiro/Usuários admin; Minhas comissões funcionario)
- [x] Fluxos das Fases 2–6 mantidos: status reserva/pedido, garçom, compras, resumo/comissões; RBAC só na UI (API é a fonte da verdade)
- [x] UX: loading, erro (`mensagemDeErro`), vazio, disabled em submit; sessão expirada (401) limpa e volta ao login
- [x] Preços em R$ (`formato.js`); sem React Router / deps novas
- [x] `docs/FASE9_FRONTEND_GESTAO.md` + checklist/README/DOCUMENTACAO atualizados

---

## Fase 10 — integração e entrega (concluído)

Detalhe: [`FASE10_ENTREGA.md`](FASE10_ENTREGA.md). Evidências: [`FASE10_EVIDENCIAS.md`](FASE10_EVIDENCIAS.md). Checklist: [`CHECKLIST_ENTREGA.md`](CHECKLIST_ENTREGA.md).

- [x] Verificar `.env.example` (backend + dois frontends), seed reexecutável e subida “do zero” (migrate → seed × 2 → health)
- [x] Ensaio ponta a ponta: 11 cenários (Postman na ordem oficial + UI cliente/gestão) — todos PASS
- [x] Pacote de entrega: `FASE10_EVIDENCIAS.md`, `CHECKLIST_ENTREGA.md`, `FASE10_ENTREGA.md`
- [x] README da raiz polido como pacote final (Fases 0–10; Fase 11 opcional)
- [x] `DOCUMENTACAO.md` aponta o pacote de entrega / Fase 10

---

## Próxima fase — Fase 11 (polimento, opcional)

Não bloqueia a entrega acadêmica. Sem implementar aqui:

- [ ] Rate limit
- [ ] Refresh token
- [ ] React Router
- [ ] Redesign visual / polimento de apresentação
- [ ] PWA

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
