# Fase 4 — Cardápio (categorias e itens)

Escopo: tabelas `categorias_menu` e `itens_menu`, CRUD do admin, visibilidade por perfil e seed.  
Regras de origem: `FASE0_REGRAS.md` (admin gerencia cardápio; funcionário/cliente só consultam), `MODELO_DADOS.md` §§4–5, `MATRIZ_RBAC.md` (Cardápio).

Pedidos, `pedido_itens`, comissão e financeiro **não** fazem parte desta fase.

---

## Decisões

| Item | Decisão |
|------|---------|
| Migrations | `20261124000004-create-categorias-menu` e `20261124000005-create-itens-menu`; FK `itens_menu.categoriaId` `ON DELETE RESTRICT`; CHECK `preco >= 0` (`itens_menu_preco_nao_negativo`); índices em `categoriaId` e `disponivel` |
| Associações | `CategoriaMenu.hasMany(ItemMenu, { as: 'itens' })` · `ItemMenu.belongsTo(CategoriaMenu, { as: 'categoria' })`, FK `categoriaId` |
| Sem DELETE | Categoria e item **nunca** são apagados. Categoria: `PATCH /categorias/:id/ativa`. Item: `PATCH /itens-menu/:id/disponivel`. `pedido_itens` (Fase 5) vai referenciar `itens_menu` com RESTRICT |
| Quem vê o quê | **Admin** vê tudo (filtros opcionais). **Funcionário e cliente** veem só categorias `ativa=true` e itens `disponivel=true` **de categoria ativa**. Para eles, o resto responde 404 no `GET /:id` e os filtros `ativa`/`disponivel` da query são ignorados |
| Desativar categoria | **Sem cascata**: `disponivel` dos itens não muda. Os itens somem para funcionário/cliente pelo filtro de categoria ativa e voltam sozinhos ao reativar a categoria (o admin não perde a marcação "disponível do dia") |
| Item em categoria inativa | Criar item numa categoria inativa → 400. Mover item (`categoriaId`) para categoria inativa → 400. Editar item que **já está** numa categoria inativa (sem trocar `categoriaId`) → permitido |
| Categoria inexistente | `categoriaId` que não existe no POST/PUT de item → 404 "Categoria não encontrada" (mesmo padrão de mesa inexistente na Fase 3) |
| Nome da categoria | UNIQUE no banco; o service compara **sem diferenciar maiúsculas** ("Bebidas" = "bebidas") → 409 "Categoria já cadastrada" (com fallback no tratador de erros) |
| Nome do item | Sem UNIQUE (o modelo não prevê); dois itens podem ter o mesmo nome |
| `preco` | Entrada: **número** JSON, `>= 0`, no máximo 2 casas decimais, até 99.999.999,99 (Zod) + CHECK no banco. Saída: **string decimal** com 2 casas (`"25.50"`), como o driver `pg` devolve `DECIMAL` — valor exato, sem erro de ponto flutuante |
| `descricao` | Opcional; `""` vira `null` (permite apagar) |
| Edição | `PUT/PATCH /categorias/:id` só aceita `nome`; `PUT/PATCH /itens-menu/:id` aceita `categoriaId`, `nome`, `descricao`, `preco` (parcial). `ativa`/`disponivel` no corpo → 400 (têm rota própria) |
| Ordenação | Categorias por `id`; itens por `categoriaId`, depois `nome` |

---

## Endpoints

Base: `http://localhost:3001/api`. Todos exigem JWT (`Authorization: Bearer <token>`).

### Categorias

| Método | Rota | Acesso | Sucesso |
|--------|------|--------|---------|
| GET | `/categorias` | os 3 perfis (func/cliente: só ativas) | 200 lista; admin aceita `?ativa=true\|false` |
| GET | `/categorias/:id` | os 3 perfis (func/cliente: 404 se inativa) | 200 categoria |
| GET | `/categorias/:id/itens` | os 3 perfis (mesmas regras de `/itens-menu`) | 200 lista de itens com `categoria`; admin aceita `?disponivel=` |
| POST | `/categorias` | admin | 201 categoria — corpo `{ "nome" }` |
| PUT/PATCH | `/categorias/:id` | admin | 200 categoria — corpo `{ "nome" }` |
| PATCH | `/categorias/:id/ativa` | admin | 200 categoria — corpo `{ "ativa": boolean }` |

### Itens do menu

| Método | Rota | Acesso | Sucesso |
|--------|------|--------|---------|
| GET | `/itens-menu` | os 3 perfis (func/cliente: só disponíveis de categoria ativa) | 200 lista com `categoria`; `?categoriaId=` para todos; `?disponivel=true\|false` só admin |
| GET | `/itens-menu/:id` | os 3 perfis (func/cliente: 404 se indisponível ou categoria inativa) | 200 item com `categoria` |
| POST | `/itens-menu` | admin | 201 item — corpo `{ categoriaId, nome, descricao?, preco, disponivel? }` |
| PUT/PATCH | `/itens-menu/:id` | admin | 200 item — qualquer subconjunto de `categoriaId`, `nome`, `descricao`, `preco` |
| PATCH | `/itens-menu/:id/disponivel` | admin | 200 item — corpo `{ "disponivel": boolean }` |

Formato do item (todas as rotas de item):

```json
{
  "id": 3,
  "categoriaId": 2,
  "nome": "Risoto de cogumelos",
  "descricao": "Arbóreo, shiitake e parmesão",
  "preco": "58.00",
  "disponivel": true,
  "createdAt": "…",
  "updatedAt": "…",
  "categoria": { "id": 2, "nome": "Pratos principais", "ativa": true }
}
```

### Erros

Mesmo formato das fases anteriores: `{ "erro": "mensagem" }` (+ `detalhes: [{ campo, mensagem }]` em validação Zod).

| HTTP | Quando |
|------|--------|
| 400 | Zod (nome vazio/longo, preço negativo/texto/3 casas, `ativa`/`disponivel` não booleano, campo não permitido, corpo vazio, id ou filtro inválido); criar/mover item para categoria inativa |
| 401 | Sem token / token inválido |
| 403 | Qualquer POST/PUT/PATCH de funcionário ou cliente |
| 404 | Categoria ou item inexistente; para func/cliente, categoria inativa ou item indisponível/de categoria inativa; `categoriaId` inexistente ao criar/editar item |
| 409 | Nome de categoria repetido (sem diferenciar maiúsculas) |

---

## Exemplos

```http
POST /api/itens-menu
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "categoriaId": 2, "nome": "Lasanha", "descricao": "Bolonhesa", "preco": 49.9 }
```

```http
PATCH /api/itens-menu/5/disponivel
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "disponivel": false }
```

```http
PATCH /api/categorias/5/ativa
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "ativa": false }
```

```json
{ "erro": "Categoria Especiais de inverno está desativada" }
```

---

## Para a Fase 5 (pedidos)

- **Item pedível** = `GET /itens-menu/:id` responde 200 para o cliente, ou seja `disponivel = true` **e** `categoria.ativa = true`. Ao criar/adicionar item no pedido, a service de pedidos deve checar as duas condições no banco (não basta `disponivel`), em transação.
- **Snapshot do preço:** `pedido_itens.preco_unitario` recebe `itens_menu.preco` no momento da adição. Como `preco` vem como string decimal, calcular subtotal/total em centavos (inteiros) ou no próprio Postgres, e não com `Number` em ponto flutuante.
- `pedido_itens.itemMenuId` → `itens_menu.id` com `ON DELETE RESTRICT`; como não há DELETE de item, o histórico fica íntegro mesmo após o item sair do cardápio.
- Associação já prevista em `MODELO_DADOS.md`: `PedidoItem.belongsTo(ItemMenu, { foreignKey: 'itemMenuId', as: 'item' })`.

---

## Seed (`npm run seed`)

Estende o seed das Fases 2–3 (usuários, mesas e reservas inalterados). Reexecutável: categoria pela chave `nome`, item pela chave `categoriaId` + `nome`.

| Categoria | Ativa | Itens (preço) |
|-----------|:-----:|---------------|
| Entradas | sim | Bruschetta de tomate (24,90) · Bolinho de bacalhau (32,00) |
| Pratos principais | sim | Risoto de cogumelos (58,00) · Filé à parmegiana (64,50) · Moqueca de peixe (119,90, **indisponível**) |
| Bebidas | sim | Suco natural de laranja (12,00) · Água mineral (6,00) |
| Sobremesas | sim | Petit gâteau (29,90) |
| Especiais de inverno | **não** | Fondue de queijo (98,00, disponível mas oculto pela categoria) |

Cliente/funcionário veem 4 categorias e 7 itens; admin vê 5 e 9.

---

## Postman

`backend/postman/Get-Order-Cardapio.postman_collection.json` — 67 requests, 145 asserções:

- **0. Setup:** login admin / funcionario1 / cliente1
- **1. Categorias:** 401 sem token; cliente só vê ativas (sem a inativa do seed); admin `?ativa=false`; criar (201), nome repetido em minúsculas (409), nome vazio (400), func/cliente (403); renomear, campo `ativa` no corpo (400), renomear para nome existente (409), 404 e id inválido (400)
- **2. Itens:** criar (201, `preco` `"25.50"`, `categoria` incluída), criar indisponível; preço negativo / 3 casas / texto, sem nome e categoria (400); categoria inexistente (404); func/cliente/sem token (403/401); editar, `disponivel` no corpo e corpo vazio (400); cliente não vê indisponível (lista e 404); filtros admin `disponivel`/`categoriaId`; marcar disponível; `GET /categorias/:id/itens`
- **3. Desativar categoria:** some para cliente/funcionário (lista e 404), admin vê item com `disponivel` intacto (sem cascata), criar/mover item para categoria inativa (400), editar mantendo categoria inativa (200), reativar e o item volta
- **4. Limpeza:** desativa as categorias criadas na execução

```powershell
postman collection run backend/postman/Get-Order-Cardapio.postman_collection.json
```

Cada execução cria categorias próprias (`PM Cat <timestamp>`) e as desativa no final: reexecutável sem colidir com o seed e sem aparecer no cardápio do cliente.

---

## Frontends

- **frontend-cliente (5173):** seção **Cardápio** (leitura) agrupada por categoria, com descrição e preço em R$. A API já entrega só categorias ativas e itens disponíveis.
- **frontend-gestao (5174):** aba **Cardápio** com tabelas de categorias e itens (filtro por categoria). **Admin** cria/renomeia categoria e ativa/desativa; cria item, edita nome/categoria/descrição/preço e marca disponível/indisponível; vê categorias inativas e itens indisponíveis. **Funcionário** só consulta (sem botões; a API devolve só o cardápio visível).
- Mensagens de erro da API aparecem em vermelho (`mensagemDeErro`). Autorização real continua no backend.
