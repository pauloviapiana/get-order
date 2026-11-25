# Fase 6 — Financeiro (compras + relatórios / comissões)

Escopo: tabela `compras` (despesas de alimentos/insumos), CRUD admin, relatório de resumo (vendas `pago` − compras) e relatório de comissões por garçom, seed e telas na gestão.  
Regras de origem: `FASE0_REGRAS.md` §5 (financeiro) e §7 (RBAC), `MODELO_DADOS.md` §8, `MATRIZ_RBAC.md` (Pagamentos / financeiro + Relatórios), `DER.md` (Usuario → Compra), `FASE5_PEDIDOS.md` ("Para a Fase 6").

Esta fase **não** recalcula pagamento: a comissão de 10% já é gravada em `pedidos.valor_comissao` na transição `entregue → pago` (Fase 5). Aqui ela só é **lida**. Sem gateway, NF-e ou estoque automático a partir de compras.

---

## Decisões

| Item | Decisão |
|------|---------|
| Migration | `20261124000008-create-compras` (08 de `MODELO_DADOS.md`). FK `registradoPorId → usuarios` `ON DELETE RESTRICT`. CHECK `compras_valor_nao_negativo` (`valor >= 0`). Índices `data_compra` e `registradoPorId` |
| Associação | `Usuario.hasMany(Compra, { as: 'comprasRegistradas' })` / `Compra.belongsTo(Usuario, { as: 'registradoPor' })` |
| `registradoPorId` | Sempre `req.usuario.id` (admin autenticado). No `POST` o campo do corpo é descartado; no `PUT/PATCH` é **rejeitado** (400, schema `strict`). Não muda na edição |
| Data da compra | `data_compra` DATEONLY "AAAA-MM-DD", data existente; **não pode ser futura** (comparada com hoje em `America/Sao_Paulo`) → 400 |
| Valor | Número ≥ 0, no máximo 2 casas, até 99.999.999,99 (mesmo padrão do `preco` do cardápio). Resposta como **string com 2 casas** (`"85.50"`) |
| Fornecedor | Opcional; `""` vira `null` (permite apagar na edição) |
| DELETE | Exclusão **física** (MVP): nenhuma tabela referencia `compras`, então não há impacto em histórico. 204 sem corpo |
| Base dos 10% | `compras` **não** entra. Comissão só vem de `pedidos.valor_comissao` |
| Vendas | `SUM(pedidos.valor_total)` com `status = 'pago'`. Cancelados e não pagos (`entregue` etc.) ficam fora |
| **Período (pedidos)** | Filtro pela **data local de `pago_em`** no fuso do projeto: `(pago_em AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN de AND ate`. Nunca por `createdAt`: um pedido criado num dia e pago no outro conta no dia do pagamento. Pago às 23:30 em SP (02:30 UTC do dia seguinte) conta no dia de SP |
| **Período (compras)** | `data_compra BETWEEN de AND ate` |
| Limites do período | `de` e `ate` inclusivos e **opcionais**: omitidos = sem limite (todo o histórico); só um = intervalo aberto do outro lado. Ambos presentes exigem `de <= ate` (400) |
| **Resultado** | `resultado = vendas − despesas`. `comissao_total` vem **separado e informativo** (custo de pessoal), **não** é subtraído do resultado. Pode ser negativo (`"-483.50"`) |
| Somas | `SUM` no Postgres (exato em DECIMAL); a diferença `resultado` e o total das comissões são feitos em **centavos inteiros** (`utils/dinheiro.js`). `paraCentavos`/`deCentavos` passaram a aceitar negativos |
| Comissões — escopo | Admin: todos os garçons com pedido pago no período. Funcionário: só `garcomId = req.usuario.id` (posse na service, não na rota). Garçom sem pagamento no período não aparece (lista vazia → UI mostra "Nenhuma comissão") |
| Comissões — ordenação | Maior comissão primeiro; empate por nome |
| Fuso | `FUSO` de `services/regrasReserva.js` (mesmo das reservas). Brasil sem horário de verão desde 2019 |

---

## Endpoints

Base: `http://localhost:3001/api`. Todos exigem JWT (`Authorization: Bearer <token>`).

| Método | Rota | Acesso | Sucesso |
|--------|------|--------|---------|
| GET | `/compras?de=&ate=&q=` | admin | 200 lista (mais recentes primeiro: `data_compra` desc, `id` desc). `q` busca (ILIKE) em descrição **ou** fornecedor |
| GET | `/compras/:id` | admin | 200 compra |
| POST | `/compras` | admin | 201 compra — corpo `{ descricao, valor, data_compra, fornecedor? }` |
| PUT / PATCH | `/compras/:id` | admin | 200 compra — mesmos campos, todos opcionais (≥ 1) |
| DELETE | `/compras/:id` | admin | 204 |
| GET | `/financeiro/resumo?de=&ate=` | admin | 200 resumo |
| GET | `/financeiro/comissoes?de=&ate=` | admin (todos), funcionario (próprias) | 200 comissões |

### RBAC

| Recurso | admin | funcionario | cliente |
|---------|:-----:|:-----------:|:-------:|
| `/compras` (todas as rotas) | sim | 403 | 403 |
| `GET /financeiro/resumo` | sim | 403 | 403 |
| `GET /financeiro/comissoes` | sim (todos) | sim (só as próprias) | 403 |

Perfil checado na rota (`autenticar` + `autorizarPerfil`); posse das comissões do funcionário no `financeiroService`.

### Formato da compra

```json
{
  "id": 1,
  "descricao": "[seed] Caixa de tomate italiano (20 kg)",
  "valor": "85.50",
  "data_compra": "2026-11-23",
  "fornecedor": "Hortifruti Central",
  "registradoPorId": 1,
  "createdAt": "…",
  "updatedAt": "…",
  "registradoPor": { "id": 1, "nome": "Admin Demo" }
}
```

### `GET /financeiro/resumo`

```json
{
  "periodo": { "de": "2026-11-19", "ate": "2026-11-21" },
  "vendas": { "quantidade_pedidos": 1, "valor_total": "91.80" },
  "despesas": { "quantidade_compras": 2, "valor_total": "609.90" },
  "comissao_total": "9.18",
  "resultado": "-518.10"
}
```

### `GET /financeiro/comissoes`

```json
{
  "periodo": { "de": null, "ate": null },
  "itens": [
    { "garcomId": 2, "nome": "Fernanda Garçom", "quantidade_pedidos": 3, "valor_vendas": "250.10", "comissao_total": "25.02" },
    { "garcomId": 3, "nome": "Gustavo Garçom", "quantidade_pedidos": 1, "valor_vendas": "91.80", "comissao_total": "9.18" }
  ],
  "total": { "quantidade_pedidos": 4, "comissao_total": "34.20" }
}
```

`valor_vendas` (soma dos pedidos pagos atendidos pelo garçom) e `total` são extras em relação ao shape mínimo, para a UI e conferência. `total.comissao_total` do admin = `comissao_total` do resumo no mesmo período.

### Erros

Mesmo formato das fases anteriores: `{ "erro": "mensagem" }` (+ `detalhes: [{ campo, mensagem }]` em validação Zod).

| HTTP | Quando |
|------|--------|
| 400 | Zod: descrição ausente/curta, valor negativo/texto/3 casas, data inexistente ou fora de "AAAA-MM-DD", `de > ate`, campo extra no PUT/PATCH (inclui `registradoPorId`), PATCH vazio, id inválido. Negócio: data da compra futura |
| 401 | Sem token / token inválido |
| 403 | Funcionário/cliente em `/compras` ou `/financeiro/resumo`; cliente em `/financeiro/comissoes` |
| 404 | Compra não encontrada (GET/PUT/PATCH/DELETE) |

---

## Exemplos

```http
POST /api/compras
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "descricao": "Caixa de limão", "valor": 42.5, "data_compra": "2026-11-24", "fornecedor": "Ceasa" }
```

```http
GET /api/financeiro/resumo?de=2026-11-01&ate=2026-11-30
Authorization: Bearer <token-admin>
```

```http
GET /api/financeiro/comissoes?de=2026-11-01
Authorization: Bearer <token-funcionario>
```

```json
{ "erro": "Dados inválidos", "detalhes": [{ "campo": "de", "mensagem": "Período inválido: \"de\" deve ser anterior ou igual a \"ate\"" }] }
```

---

## Seed (`npm run seed`)

Estende o seed das Fases 2–5 (tudo anterior inalterado). Reexecutável: chave = admin + `descricao` (texto fixo `[seed] …`); a data é relativa a hoje e calculada **só na 1ª execução**, como as reservas.

| Descrição | Valor | Data (1ª execução) | Fornecedor |
|-----------|------:|--------------------|------------|
| [seed] Caixa de tomate italiano (20 kg) | 85,50 | hoje − 1 | Hortifruti Central |
| [seed] Carnes para a semana (filé e frango) | 420,00 | hoje − 3 | Frigorífico Boa Carne |
| [seed] Bebidas (água, laranja para suco) | 189,90 | hoje − 5 | Distribuidora Rio Claro |
| [seed] Botijão de gás P45 | 130,00 | hoje − 12 | — |

Total de despesas seed: **R$ 825,40**. Com só o pedido pago do seed (R$ 91,80, comissão R$ 9,18), o resultado de um banco recém-semeado é **−R$ 733,60** — esperado numa demo com poucas vendas. Os pedidos pagos pelas coleções Postman da Fase 5 somam às vendas.

---

## Postman

`backend/postman/Get-Order-Financeiro.postman_collection.json` — 52 requests, 129 asserções:

- **0. Setup:** login admin / funcionario1 / funcionario2 / cliente1; calcula `hoje` e `amanha` no fuso de SP
- **1. Compras:** 401; cria (registradoPorId do corpo ignorado; `0.1 → "0.10"`; fornecedor null); valor negativo / 3 casas / texto, descrição ausente, data inexistente e futura (400); lista ordenada; filtros `de/ate`, `q` por fornecedor e por descrição, `de > ate` (400); GET por id, 404, id inválido (400); PATCH (valor + apagar fornecedor), PUT, PATCH com `registradoPorId` / vazio / data futura (400), 404
- **2. RBAC compras:** funcionário lista/cria/edita (403); cliente lista/exclui (403)
- **3. Resumo:** funcionário e cliente (403); soma **independente** dos pedidos pagos (`GET /pedidos?status=pago`) e das compras (`GET /compras`) no script, em centavos; resumo **sem período** bate (vendas, despesas, comissão, `resultado = vendas − despesas`); resumo **de hoje** bate com os pedidos cujo `pago_em` cai hoje em SP; resumo na data de teste (2001-03-15: sem vendas, resultado negativo formatado); só `de`; `de > ate` e data inválida (400)
- **4. Comissões:** admin — um item por garçom com pedido pago, valor por garçom = soma dos pedidos dele, total = `comissao_total` do resumo; funcionario1 e funcionario2 só veem `garcomId = self`; cliente (403); período sem pagamentos (lista vazia, total `"0.00"`); `de > ate` (400)
- **5. Limpeza:** exclui as compras da execução (204), GET/DELETE depois (404)

```powershell
postman collection run backend/postman/Get-Order-Financeiro.postman_collection.json
```

Reexecutável: as compras de teste usam a data fixa `2001-03-15` (isola o filtro de período) e são excluídas no fim.

---

## Frontends

- **frontend-gestao (5174):**
  - Aba **Compras** (só admin): filtros De/Até e busca por descrição/fornecedor; tabela com data, descrição, fornecedor, valor (R$), quem registrou e total listado; edição inline; excluir com confirmação; formulário "Nova compra".
  - Aba **Financeiro** (admin): filtro de período (ou "Todo o histórico"); cartões Vendas / Despesas / Resultado (vermelho se negativo) / Comissões (informativo, "não descontadas do resultado"); tabela de comissões por garçom com total.
  - Aba **Minhas comissões** (funcionário): mesmo filtro de período; tabela só com a própria linha (a API filtra).
  - Loading, erro em vermelho (`mensagemDeErro`) e estado vazio em todas; valores em `pt-BR` (`R$ 1.234,56`).
  - Removida a nota "Compras e relatório financeiro chegam na próxima fase".
- **frontend-cliente (5173):** sem mudanças (compras/financeiro não são expostos ao cliente).

---

## Para a Fase 7 (erros / CORS / docs API consolidados)

- **Erros:** `tratarErros` ainda não traduz `SequelizeForeignKeyConstraintError` (ex.: apagar usuário com compras/pedidos cai em 500 genérico se algum dia houver DELETE físico de usuário) nem `SequelizeDatabaseError` de CHECK — vale mapear para 409/400.
- **Docs consolidados:** endpoints estão espalhados em `FASE2…FASE6`; consolidar (OpenAPI gerada a partir das coleções Postman é um caminho barato).
- **Fuso:** filtros usam `America/Sao_Paulo` no SQL; se o fuso virar configurável, centralizar `FUSO` fora de `regrasReserva.js`.
- **Desempenho:** o filtro por `(pago_em AT TIME ZONE …)::date` não usa índice; irrelevante no MVP. Se crescer, índice de expressão ou filtro por intervalo de timestamps.
- **Estorno de pedido pago** continua fora do MVP (pago é terminal); o resumo não tem coluna de ajustes.
- **Compras sem auditoria:** exclusão é física e a edição não guarda histórico; se a banca cobrar trilha, trocar por soft-delete/`updatedBy`.
- **Dados de demo:** compras/pedidos criados pelas coleções Postman ficam no banco (as de compras são limpas na própria coleção; pedidos não). Para apresentação "limpa", migrar e semear num banco novo.
