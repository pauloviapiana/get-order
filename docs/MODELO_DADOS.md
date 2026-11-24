# Modelo de dados — get-order

Campos previstos para o MVP. Tipos no formato **Sequelize / PostgreSQL**.  
Convenção Sequelize: `createdAt` / `updatedAt` (`timestamps: true`). FKs em **camelCase** no model (ex.: `clienteId`), como no `web-car-wash`.

Regras: `docs/FASE0_REGRAS.md`. Diagrama: `docs/DER.md`.

---

## 1. `usuarios`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK autoincrement | não | — | |
| `nome` | STRING(120) | não | — | |
| `email` | STRING(160) | não | — | **UNIQUE**; login |
| `senha` | STRING(255) | não | — | hash **bcrypt** |
| `telefone` | STRING(30) | sim | null | contato |
| `perfil` | ENUM(`admin`,`funcionario`,`cliente`) | não | — | RBAC |
| `ativo` | BOOLEAN | não | `true` | desativar sem apagar |
| `createdAt` | DATE | não | now | |
| `updatedAt` | DATE | não | now | |

**Índices / uniques:** UNIQUE(`email`); índice em `perfil` (opcional, útil em listagens).

**Negócio:** auto-cadastro público só cria `cliente`. Admin cria `funcionario`/`admin`. Login rejeita se `ativo = false`.

---

## 2. `mesas`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK | não | — | |
| `identificacao` | STRING(40) | não | — | ex.: `M1`, `Varanda-2`; **UNIQUE** |
| `capacidade` | INTEGER | não | — | CHECK `> 0` |
| `ativa` | BOOLEAN | não | `true` | mesa fora de uso |
| `createdAt` / `updatedAt` | DATE | não | now | |

**Índices / uniques:** UNIQUE(`identificacao`).

**Negócio:** só mesas `ativa = true` entram na alocação. `quantidade_pessoas` da reserva ≤ `capacidade`.

---

## 3. `reservas`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK | não | — | |
| `clienteId` | INTEGER FK → `usuarios.id` | não | — | perfil cliente |
| `mesaId` | INTEGER FK → `mesas.id` | não | — | abordagem A |
| `data_reserva` | DATEONLY | não | — | sex/sáb/dom |
| `horario` | TIME / STRING(5) | não | — | slot da lista fixa |
| `quantidade_pessoas` | INTEGER | não | — | CHECK `> 0` |
| `status` | ENUM(...) | não | `pendente` | ver FASE0_REGRAS |
| `observacoes` | TEXT | sim | null | |
| `createdAt` / `updatedAt` | DATE | não | now | |

**Índices:** (`data_reserva`, `horario`); (`mesaId`, `data_reserva`, `horario`); `clienteId`; `status`.  
**Não** criar UNIQUE rígido mesa+data+hora (status cancelado libera o slot) — validar na service + transação.

**Negócio:** conflito se outra reserva `pendente`/`confirmada` na mesma mesa/data/horário.

---

## 4. `categorias_menu`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK | não | — | |
| `nome` | STRING(80) | não | — | **UNIQUE** |
| `ativa` | BOOLEAN | não | `true` | |
| `createdAt` / `updatedAt` | DATE | não | now | |

---

## 5. `itens_menu`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK | não | — | |
| `categoriaId` | INTEGER FK → `categorias_menu.id` | não | — | |
| `nome` | STRING(120) | não | — | |
| `descricao` | TEXT | sim | null | |
| `preco` | DECIMAL(10,2) | não | — | CHECK `>= 0` |
| `disponivel` | BOOLEAN | não | `true` | cardápio do dia |
| `createdAt` / `updatedAt` | DATE | não | now | |

**Índices:** `categoriaId`; (`disponivel`) opcional.

**Negócio:** pedido só inclui itens `disponivel = true` no momento da criação/adição.

---

## 6. `pedidos`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK | não | — | |
| `clienteId` | INTEGER FK → `usuarios.id` | não | — | |
| `garcomId` | INTEGER FK → `usuarios.id` | sim | null | funcionario; obrigatório ao `pago` |
| `reservaId` | INTEGER FK → `reservas.id` | sim | null | compra antecipada opcional |
| `status` | ENUM(...) | não | `aberto` | ver FASE0_REGRAS |
| `valor_total` | DECIMAL(10,2) | não | `0` | recalcular ao mudar itens |
| `valor_comissao` | DECIMAL(10,2) | sim | null | 10% ao `pago` |
| `pago_em` | DATE | sim | null | timestamp do pagamento |
| `createdAt` / `updatedAt` | DATE | não | now | |

**Índices:** `clienteId`; `garcomId`; `reservaId`; `status`; `createdAt`.

**Negócio:** `valor_comissao = round(valor_total * 0.10, 2)` na transição para `pago`. Cancelado antes do pagamento → comissão null/0.

---

## 7. `pedido_itens`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK | não | — | |
| `pedidoId` | INTEGER FK → `pedidos.id` | não | — | |
| `itemMenuId` | INTEGER FK → `itens_menu.id` | não | — | |
| `quantidade` | INTEGER | não | — | CHECK `> 0` |
| `preco_unitario` | DECIMAL(10,2) | não | — | snapshot do preço |
| `subtotal` | DECIMAL(10,2) | não | — | `qtd * preco_unitario` |
| `createdAt` / `updatedAt` | DATE | não | now | |

**Índices:** `pedidoId`; UNIQUE opcional (`pedidoId`, `itemMenuId`) — no MVP pode somar quantidade se repetir o item.

**Negócio:** preço congelado no item do pedido (mudança futura no cardápio não altera histórico).

---

## 8. `compras`

| Campo | Tipo | Null | Default | Notas |
|-------|------|:----:|---------|-------|
| `id` | INTEGER PK | não | — | |
| `descricao` | STRING(255) | não | — | ex.: “caixa de tomate” |
| `valor` | DECIMAL(10,2) | não | — | CHECK `>= 0` |
| `data_compra` | DATEONLY | não | — | |
| `fornecedor` | STRING(120) | sim | null | |
| `registradoPorId` | INTEGER FK → `usuarios.id` | não | — | admin (ou quem registrou) |
| `createdAt` / `updatedAt` | DATE | não | now | |

**Índices:** `data_compra`; `registradoPorId`.

**Negócio:** despesa operacional; entra no relatório financeiro; **não** na base dos 10%.

---

## Ordem sugerida das migrations (Fase 1+)

Nomes ilustrativos (prefixo timestamp do Sequelize CLI na prática):

| Ordem | Nome sugerido | Cria |
|------:|---------------|------|
| 01 | `01-usuarios` | `usuarios` |
| 02 | `02-mesas` | `mesas` |
| 03 | `03-reservas` | `reservas` + FKs cliente/mesa |
| 04 | `04-categorias-menu` | `categorias_menu` |
| 05 | `05-itens-menu` | `itens_menu` |
| 06 | `06-pedidos` | `pedidos` + FKs cliente/garçom/reserva |
| 07 | `07-pedido-itens` | `pedido_itens` |
| 08 | `08-compras` | `compras` |

Seed sugerido (Fase 2+): 1 admin, 2 funcionários, 3 clientes, ≥3 mesas, ≥3 categorias/itens, amostras de reservas/pedidos/compras.

---

## Associações Sequelize (rascunho)

```
Usuario.hasMany(Reserva, { foreignKey: 'clienteId', as: 'reservas' })
Mesa.hasMany(Reserva, { foreignKey: 'mesaId', as: 'reservas' })
Reserva.belongsTo(Usuario, { foreignKey: 'clienteId', as: 'cliente' })
Reserva.belongsTo(Mesa, { foreignKey: 'mesaId', as: 'mesa' })

Usuario.hasMany(Pedido, { foreignKey: 'clienteId', as: 'pedidos' })
Usuario.hasMany(Pedido, { foreignKey: 'garcomId', as: 'atendimentos' })
Pedido.belongsTo(Usuario, { foreignKey: 'clienteId', as: 'cliente' })
Pedido.belongsTo(Usuario, { foreignKey: 'garcomId', as: 'garcom' })
Pedido.belongsTo(Reserva, { foreignKey: 'reservaId', as: 'reserva' })

CategoriaMenu.hasMany(ItemMenu, { foreignKey: 'categoriaId', as: 'itens' })
Pedido.hasMany(PedidoItem, { foreignKey: 'pedidoId', as: 'itens' })
PedidoItem.belongsTo(ItemMenu, { foreignKey: 'itemMenuId', as: 'item' })

Usuario.hasMany(Compra, { foreignKey: 'registradoPorId', as: 'comprasRegistradas' })
```
