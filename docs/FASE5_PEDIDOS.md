# Fase 5 — Pedidos e compra antecipada

Escopo: tabelas `pedidos` e `pedido_itens`, itens com preço snapshot, fluxo de status, garçom, pagamento com comissão de 10%, vínculo opcional com reserva, RBAC/posse e seed.  
Regras de origem: `FASE0_REGRAS.md` §§4–6, `MODELO_DADOS.md` §§6–7, `DER.md`, `MATRIZ_RBAC.md` (Pedidos), `FASE4_CARDAPIO.md` ("Para a Fase 5").

Tabela `compras` e relatórios financeiros **não** fazem parte desta fase (Fase 6). Não há gateway de pagamento: pagar = mudar o status para `pago`.

---

## Decisões

| Item | Decisão |
|------|---------|
| Migrations | `20261124000006-create-pedidos` e `20261124000007-create-pedido-itens`; todas as FKs `ON DELETE RESTRICT` |
| CHECKs | `pedido_itens`: `quantidade > 0`, `preco_unitario >= 0`, `subtotal >= 0`. `pedidos`: `valor_total >= 0`, `valor_comissao >= 0` (NULL passa), e `pedidos_pago_consistente`: status `pago` exige `garcomId`, `valor_comissao` e `pago_em` preenchidos |
| Índices | `pedidos`: `clienteId`, `garcomId`, `reservaId`, `status`, `createdAt`. `pedido_itens`: `pedidoId`, `itemMenuId`. **Sem** UNIQUE(`pedidoId`, `itemMenuId`) — a service soma a quantidade |
| Associações | `Pedido.belongsTo(Usuario)` como `cliente` e `garcom`; `Pedido.belongsTo(Reserva, { as: 'reserva' })`; `Pedido.hasMany(PedidoItem, { as: 'itens' })`; `PedidoItem.belongsTo(ItemMenu, { as: 'item' })` (+ inversas `pedidos`, `atendimentos`, `pedidoItens`) |
| Sem DELETE | Pedido nunca é apagado: cancelar via `PATCH /pedidos/:id/status` (preserva histórico e comissão) |
| Item pedível | `itens_menu.disponivel = true` **e** `categoria.ativa = true`, checado no banco dentro da transação. Item inexistente → 404; indisponível ou de categoria desativada → **400** com mensagem explícita (diferente do `GET /itens-menu/:id`, que responde 404 para o cliente: aqui o id veio do cardápio e o motivo importa para quem pede) |
| Snapshot | `preco_unitario` = `itens_menu.preco` no momento da adição. Mudar o preço no cardápio não altera pedidos existentes |
| Dinheiro | Contas em **centavos inteiros** (`backend/src/utils/dinheiro.js`), nunca `Number` com casas decimais. Respostas de DECIMAL como **string com 2 casas** (`"61.05"`), padrão da Fase 4 |
| `valor_total` | Soma dos `subtotal` das linhas; recalculado em toda criação/adição/alteração/remoção de item (e conferido de novo ao pagar). Teto: cabe em DECIMAL(10,2) → senão 400 |
| Item repetido | No `POST /pedidos`, itens repetidos no corpo viram uma linha só (quantidades somadas). No `POST /pedidos/:id/itens`, item já presente soma na **mesma linha**, que **mantém o `preco_unitario` original** (snapshot da primeira adição) |
| Quantidade | Inteiro de 1 a 100 por linha (também depois de somar). Aumentar a quantidade de uma linha exige o item ainda pedível; diminuir é sempre permitido |
| Pedido vazio | Proibido: criação exige ≥ 1 item; remover a última linha → 400 ("cancele o pedido") |
| Itens só em `aberto` | Adicionar/alterar/remover item com status ≠ `aberto` → 400 |
| Cliente criando | `clienteId` é **sempre** o próprio id (body descartado), como em reservas |
| Equipe criando | `clienteId` obrigatório: usuário existente (404), perfil `cliente` (400) e ativo (400) |
| Compra antecipada | `reservaId` opcional. Se informado: reserva existe (404); pertence ao `clienteId` do pedido (cliente com reserva alheia → **403**; equipe com reserva de outro cliente → 400); status **`pendente` ou `confirmada`** (`cancelada` e `concluida` → 400, pois não há mais visita futura a antecipar) |
| Cascata reserva → pedido | Cancelar reserva **não** cancela pedidos vinculados (aviso no confirm do frontend cliente). O vínculo é checado só na criação |
| Garçom | `PATCH /pedidos/:id/garcom` (só equipe): usuário existente (404), perfil `funcionario` (400; admin não é garçom), ativo (400). Pode trocar enquanto o pedido não for `pago`/`cancelado` (400). Revalidado (ativo + funcionario) no pagamento |
| Pagamento | `entregue → pago` exige `garcomId` (400 sem ele). Grava `valor_comissao = round(valor_total × 10%, 2)` (meio para cima, igual ao `ROUND` do Postgres; em centavos: `floor((total + 5) / 10)`) e `pago_em = now()` |
| Cancelamento | `valor_comissao` fica **null** em qualquer cancelamento (nunca há cancelamento depois de `pago`, que é terminal). `entregue → cancelado` só admin (excepcional) |
| Concorrência | Toda escrita roda em transação com `SELECT … FOR UPDATE` na linha do pedido: duas edições/transições simultâneas no mesmo pedido são serializadas |
| Ordenação | Listagem por `id` decrescente (mais recentes primeiro); itens de cada pedido por `id` |

### Transições de status (`PATCH /pedidos/:id/status`)

| De → Para | admin | funcionario | cliente (próprio) |
|-----------|:-----:|:-----------:|:-----------------:|
| criação → `aberto` | sim | sim | sim |
| `aberto` → `em_preparo` | sim | sim | 403 |
| `em_preparo` → `pronto` | sim | sim | 403 |
| `pronto` → `entregue` | sim | sim | 403 |
| `entregue` → `pago` (exige garçom; grava 10%) | sim | sim | sim |
| `aberto` → `cancelado` | sim | sim | sim |
| `em_preparo` / `pronto` → `cancelado` | sim | sim | 403 |
| `entregue` → `cancelado` (excepcional, sem comissão) | sim | 403 | 403 |
| a partir de `pago` / `cancelado` | 400 terminal | 400 terminal | 400 terminal |
| qualquer outra (ex.: `aberto` → `pronto`) | 400 | 400 | 400 (ou 403 se o destino for de preparo) |

Ordem das checagens (igual a reservas): **404** pedido → **403** posse → **403** perfil (destino de preparo para cliente; par de/para não permitido ao perfil) → **400** transição inválida/terminal → **400** regras de negócio (sem garçom, garçom desativado, pedido sem itens).

---

## Endpoints

Base: `http://localhost:3001/api`. Todos exigem JWT (`Authorization: Bearer <token>`).

| Método | Rota | Acesso | Sucesso |
|--------|------|--------|---------|
| GET | `/pedidos?status=&clienteId=&reservaId=` | admin/func: todos · cliente: próprios | 200 lista. `clienteId` é ignorado para cliente |
| GET | `/pedidos/garcons` | admin, funcionario | 200 `[{ id, nome }]` — funcionários ativos (auxiliar para escolher o garçom; `/usuarios` é só admin) |
| GET | `/pedidos/:id` | admin/func · cliente (próprio) | 200 pedido |
| POST | `/pedidos` | os 3 perfis | 201 pedido `aberto` — corpo `{ clienteId?, reservaId?, itens: [{ itemMenuId, quantidade }] }` |
| POST | `/pedidos/:id/itens` | admin/func · cliente (próprio), só `aberto` | 200 pedido — corpo `{ itemMenuId, quantidade }` |
| PATCH | `/pedidos/:id/itens/:pedidoItemId` | idem | 200 pedido — corpo `{ quantidade }` |
| DELETE | `/pedidos/:id/itens/:pedidoItemId` | idem | 200 pedido |
| PATCH | `/pedidos/:id/garcom` | admin, funcionario | 200 pedido — corpo `{ garcomId }` |
| PATCH | `/pedidos/:id/status` | ver tabela de transições | 200 pedido — corpo `{ status }` |

Sem `DELETE /pedidos/:id`.

### API de itens (shape escolhido)

Operações **por linha** em vez de substituir a lista inteira:

- `POST /pedidos/:id/itens` adiciona; se o item já está no pedido, soma na linha existente (mantém o snapshot).
- `PATCH /pedidos/:id/itens/:pedidoItemId` define a nova quantidade da linha.
- `DELETE /pedidos/:id/itens/:pedidoItemId` remove a linha (não a última).

`pedidoItemId` é o `id` da linha em `pedido_itens` (vem em `itens[].id`), não o `itemMenuId`. As três respondem o **pedido completo** com `valor_total` recalculado. Motivo: cada operação tem semântica única de snapshot (linhas não tocadas nunca são repreçadas) e mapeia direto para a UI.

### Formato do pedido (todas as rotas)

```json
{
  "id": 5,
  "clienteId": 4,
  "garcomId": 2,
  "reservaId": null,
  "status": "pago",
  "valor_total": "61.05",
  "valor_comissao": "6.11",
  "pago_em": "2026-11-25T00:41:12.000Z",
  "createdAt": "…",
  "updatedAt": "…",
  "itens": [
    {
      "id": 9, "pedidoId": 5, "itemMenuId": 12, "quantidade": 2,
      "preco_unitario": "25.50", "subtotal": "51.00",
      "item": { "id": 12, "nome": "PM Item A", "categoriaId": 6 }
    }
  ],
  "cliente": { "id": 4, "nome": "Ana Cliente", "email": "cliente1@getorder.com", "telefone": "…" },
  "garcom": { "id": 2, "nome": "Fernanda Garçom" },
  "reserva": null
}
```

Com reserva: `"reserva": { "id", "data_reserva", "horario", "status", "mesaId", "mesa": { "id", "identificacao" } }`.

### Erros

Mesmo formato das fases anteriores: `{ "erro": "mensagem" }` (+ `detalhes: [{ campo, mensagem }]` em validação Zod).

| HTTP | Quando |
|------|--------|
| 400 | Zod (itens vazio/ausente, quantidade 0/fracionada/> 100, ids inválidos, status fora do ENUM, campo extra em item); item indisponível ou de categoria desativada; reserva `cancelada`/`concluida` ou de outro cliente (equipe); equipe sem `clienteId` ou com usuário não cliente/desativado; alterar itens fora de `aberto`; remover a última linha; transição inválida/terminal; pagar sem garçom; garçom não funcionário/desativado; trocar garçom de pedido pago/cancelado |
| 401 | Sem token / token inválido |
| 403 | Cliente em pedido alheio; cliente com reserva alheia; cliente avançando preparo, cancelando fora de `aberto`, atribuindo garçom ou listando garçons; funcionário cancelando `entregue` |
| 404 | Pedido, linha do pedido, item do cardápio, reserva, cliente ou garçom não encontrado |

---

## Exemplos

```http
POST /api/pedidos
Authorization: Bearer <token-cliente>
Content-Type: application/json

{ "reservaId": 1, "itens": [{ "itemMenuId": 3, "quantidade": 2 }, { "itemMenuId": 6, "quantidade": 2 }] }
```

```http
POST /api/pedidos
Authorization: Bearer <token-funcionario>
Content-Type: application/json

{ "clienteId": 5, "itens": [{ "itemMenuId": 1, "quantidade": 1 }] }
```

```http
PATCH /api/pedidos/5/garcom
Authorization: Bearer <token-funcionario>
Content-Type: application/json

{ "garcomId": 2 }
```

```http
PATCH /api/pedidos/5/status
Authorization: Bearer <token-cliente>
Content-Type: application/json

{ "status": "pago" }
```

```json
{ "erro": "Atribua um garçom ao pedido antes do pagamento" }
```

---

## Seed (`npm run seed`)

Estende o seed das Fases 2–4 (usuários, mesas, reservas e cardápio inalterados). Reexecutável: chave = cliente + reserva seed vinculada (ou cliente sem reserva). Preço snapshot e totais calculados em centavos na 1ª execução.

| Cliente | Reserva vinculada | Status | Garçom | Itens | Total | Comissão |
|---------|-------------------|--------|--------|-------|------:|---------:|
| cliente1 (Ana) | "[seed] Jantar em família" (pendente) — compra antecipada | `aberto` | — | 2× Risoto de cogumelos, 2× Suco natural de laranja | 140,00 | — |
| cliente2 (Bruno) | "[seed] Aniversário" (confirmada) | `entregue` | funcionario1 (Fernanda) | 1× Bruschetta, 3× Filé à parmegiana, 6× Água mineral | 254,40 | — (pronto para pagar) |
| cliente3 (Carla) | — | `em_preparo` | — | 2× Bruschetta de tomate | 49,80 | — |
| cliente1 (Ana) | "[seed] Histórico" (concluída) | `pago` | funcionario2 (Gustavo) | 1× Bolinho de bacalhau, 2× Petit gâteau | 91,80 | 9,18 |

O pedido pago tem `pago_em` = noite da reserva histórica (23:00, `-03:00`). O seed grava direto pelo model (status variados), sem `compras`. Se a reserva vinculada não existir (slot ocupado na 1ª execução do seed da Fase 3), o pedido correspondente é pulado.

---

## Postman

`backend/postman/Get-Order-Pedidos.postman_collection.json` — 96 requests, 217 asserções:

- **0. Setup:** login admin / funcionario1 / cliente1 / cliente2; cria categoria `PM Ped <timestamp>` com item A (R$ 25,50), item B (R$ 10,05) e um indisponível; cria segunda categoria com item e a desativa; localiza reservas do seed (pendente/confirmada do cliente1, do cliente2, cancelada, concluída)
- **1. Criação:** 401; cliente cria sem reserva (`clienteId` do body ignorado, item repetido somado, snapshot `"25.50"`, total `"86.55"`); com reserva própria; reserva alheia (cliente 403 / equipe 400); reserva cancelada e concluída (400); reserva/item inexistente (404); item indisponível e categoria inativa (400); itens vazio/ausente, quantidade 0 e 1,5 (400); equipe sem `clienteId` ou com funcionário como cliente (400); admin muda o preço do item A e o pedido antigo mantém o snapshot; pedido novo usa o preço novo
- **2. Leitura e posse:** cliente só vê os próprios (e `?clienteId=` é ignorado); cliente2 não vê pedido do cliente1 (403); filtros `clienteId`/`status`/`reservaId`; status inválido e id inválido (400); 404; `GET /pedidos/garcons` (func 200, cliente 403)
- **3. Itens:** somar na mesma linha; linha mantém snapshot após mudança de preço; item indisponível/categoria inativa (400); campo extra (400); pedido alheio (403); alterar quantidade, 0 (400), linha inexistente (404); equipe edita pedido aberto do cliente; remover linha; remover a última (400)
- **4. Fluxo completo:** `aberto → em_preparo → pronto → entregue`, com cliente avançando (403), transição pulada (400), editar itens fora de `aberto` (400), cliente cancelando `em_preparo` (403); pagar sem garçom (400); atribuir garçom por cliente (403), admin como garçom (400), inexistente (404), corpo vazio (400), funcionario1 (200); cliente2 pagando pedido alheio (403); **cliente1 paga: `valor_total "61.05"`, `valor_comissao "6.11"`** (6,105 arredondado), `pago_em` preenchido; terminal `pago` (400 em cancelar/voltar/trocar garçom); status fora do ENUM (400); pedido inexistente (404)
- **5. Cancelamentos:** cliente cancela o próprio `aberto` (comissão null, reserva continua vinculada); terminal `cancelado` (400); `entregue → cancelado` por cliente e funcionário (403) e por admin (200, sem comissão); funcionário cancela `em_preparo`
- **6. Limpeza:** desativa a categoria da execução

```powershell
postman collection run backend/postman/Get-Order-Pedidos.postman_collection.json
```

Reexecutável: itens próprios por execução; os pedidos criados ficam como histórico (não há DELETE de pedido).

**Happy path mínimo** (pasta 4 depois da 0/1): *Cliente1 cria pedido sem reserva* → *Funcionario aberto → em_preparo* → *em_preparo → pronto* → *pronto → entregue* → *Funcionario atribui funcionario1 como garçom* → *Cliente1 paga o próprio pedido (200, comissão 10%)*.

---

## Frontends

- **frontend-cliente (5173):** a seção **Cardápio e pedido** mostra o cardápio com quantidade por item, prévia do total (centavos), seleção opcional de uma reserva pendente/confirmada e botão "Fazer pedido". **Meus pedidos** lista itens, total, status, reserva e garçom; botão **Cancelar** em `aberto`; **Pagar** em `entregue` com garçom (sem garçom: "Aguardando o garçom ser registrado para liberar o pagamento"). Cancelar reserva avisa que pedidos vinculados não são cancelados.
- **frontend-gestao (5174):** aba **Pedidos** (admin e funcionário) com filtro por status; tabela com cliente, itens, total, comissão, reserva; select de **garçom** (funcionários ativos via `/pedidos/garcons`) enquanto o pedido não é terminal; botões Iniciar preparo / Pronto / Entregue / Registrar pagamento / Cancelar conforme o status. **Cancelar (excepcional)** de `entregue` só aparece para admin. Funcionário continua sem gerenciar cardápio/usuários.
- Mensagens de erro da API aparecem em vermelho (`mensagemDeErro`). Autorização real continua no backend.

---

## Para a Fase 6 (financeiro)

- **Comissões já gravadas:** `pedidos.valor_comissao` (string decimal) só é preenchida em pedidos `pago`, junto com `garcomId` e `pago_em` (garantido pelo CHECK `pedidos_pago_consistente`). Relatório de comissões = `SUM(valor_comissao)` agrupado por `garcomId` com `status = 'pago'`, filtrando período por **`pago_em`** (não por `createdAt`).
- **Vendas** = `SUM(valor_total)` de `pago` no período (`pago_em`). Cancelados (`valor_comissao` null) não entram; `entregue` ainda não pago também não.
- **Falta:** migration/model `compras` (08 de `MODELO_DADOS.md`), CRUD admin, `GET /financeiro/resumo` (vendas − compras + comissões por garçom) e `GET /financeiro/comissoes` (funcionário vê só as próprias, `garcomId = req.usuario.id`). `compras` não entra na base dos 10%.
- Somas no relatório: fazer no Postgres (`SUM` sobre DECIMAL é exato) ou em centavos com `utils/dinheiro.js`; não somar strings com `Number` em ponto flutuante.
- Estorno de pedido pago está fora do MVP (pago é terminal); se a Fase 6 precisar, decidir antes se vira novo status ou ajuste em relatório.
- Pedidos de demo do Postman (itens "PM Item …") ficam no banco como histórico pago/cancelado; para relatórios "limpos" de apresentação, rodar o seed num banco recém-migrado.
