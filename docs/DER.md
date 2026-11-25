# DER — get-order (Restaurante IOT)

Diagrama entidade-relacionamento alinhado às migrations Sequelize (fonte de verdade do schema).  
Campos e endpoints: [`DOCUMENTACAO.md`](DOCUMENTACAO.md). SQL didático: [`schema_referencia.sql`](schema_referencia.sql).

---

## Relacionamentos

| De | Para | Cardinalidade | FK |
|----|------|---------------|----|
| `usuarios` (cliente) | `reservas` | 1 : N | `reservas.clienteId` |
| `mesas` | `reservas` | 1 : N | `reservas.mesaId` |
| `usuarios` (cliente) | `pedidos` | 1 : N | `pedidos.clienteId` |
| `usuarios` (funcionário/garçom) | `pedidos` | 1 : N | `pedidos.garcomId` |
| `reservas` | `pedidos` | 1 : 0..N (opcional) | `pedidos.reservaId` nullable |
| `categorias_menu` | `itens_menu` | 1 : N | `itens_menu.categoriaId` |
| `pedidos` | `pedido_itens` | 1 : N | `pedido_itens.pedidoId` |
| `itens_menu` | `pedido_itens` | 1 : N | `pedido_itens.itemMenuId` |
| `usuarios` | `compras` | 1 : N | `compras.registradoPorId` |
| `usuarios` | `refresh_tokens` | 1 : N | `refresh_tokens.usuarioId` |

- Um **usuário** autentica todos os papéis (`admin` \| `funcionario` \| `cliente`) na mesma tabela.
- Cada reserva aloca **uma** mesa (`mesaId` obrigatório).
- Pedido pode ou não ter reserva; garçom é obrigatório só no **pagamento**.
- `pedido_itens` guarda preço unitário (snapshot).
- `compras` = despesas (insumos), sem ligação com cardápio.
- `refresh_tokens` guarda hash SHA-256 do refresh (nunca o token em claro); `ON DELETE CASCADE` no usuário.

---

## ENUMs, UNIQUE e CHECK

- **UNIQUE:** `usuarios.email`, `mesas.identificacao`, `categorias_menu.nome`, `refresh_tokens.tokenHash`
- **ENUM:**
  - `usuarios.perfil` → `admin` \| `funcionario` \| `cliente`
  - `reservas.status` → `pendente` \| `confirmada` \| `cancelada` \| `concluida`
  - `pedidos.status` → `aberto` \| `em_preparo` \| `pronto` \| `entregue` \| `pago` \| `cancelado`
- **CHECK:** `mesas.capacidade > 0`; `reservas.quantidade_pessoas > 0`; `itens_menu.preco >= 0`; `pedido_itens` qtd/preço/subtotal ≥ regras; `pedidos.valor_total >= 0`; `pedidos.valor_comissao >= 0`; `compras.valor >= 0`; pedido `pago` exige `garcomId` + `valor_comissao` + `pago_em`
- **Disponibilidade de mesa:** regra na API (não UNIQUE): bloqueia se já houver `pendente`/`confirmada` na mesma mesa + data + horário
- **ON DELETE RESTRICT** nas FKs de domínio (preferir `ativa` / `disponivel` / cancelar)
- **Comissão 10%:** gravada em `pedidos.valor_comissao` ao status `pago`

---

## Diagrama (Mermaid)

```mermaid
erDiagram
  USUARIOS {
    int id PK
    string nome
    string email UK "UNIQUE"
    string senha "hash bcrypt"
    string telefone "opcional"
    enum perfil "admin | funcionario | cliente"
    boolean ativo "default true"
    datetime createdAt
    datetime updatedAt
  }

  MESAS {
    int id PK
    string identificacao UK "UNIQUE"
    int capacidade "CHECK > 0"
    boolean ativa "default true"
    datetime createdAt
    datetime updatedAt
  }

  RESERVAS {
    int id PK
    int clienteId FK
    int mesaId FK
    date data_reserva
    time horario
    int quantidade_pessoas "CHECK > 0"
    enum status "pendente | confirmada | cancelada | concluida"
    text observacoes "opcional"
    datetime createdAt
    datetime updatedAt
  }

  CATEGORIAS_MENU {
    int id PK
    string nome UK "UNIQUE"
    boolean ativa "default true"
    datetime createdAt
    datetime updatedAt
  }

  ITENS_MENU {
    int id PK
    int categoriaId FK
    string nome
    text descricao "opcional"
    decimal preco "CHECK >= 0"
    boolean disponivel "default true"
    datetime createdAt
    datetime updatedAt
  }

  PEDIDOS {
    int id PK
    int clienteId FK
    int garcomId FK "nullable até pagamento"
    int reservaId FK "nullable"
    enum status "aberto | em_preparo | pronto | entregue | pago | cancelado"
    decimal valor_total "CHECK >= 0"
    decimal valor_comissao "10% se pago"
    datetime pago_em "nullable"
    datetime createdAt
    datetime updatedAt
  }

  PEDIDO_ITENS {
    int id PK
    int pedidoId FK
    int itemMenuId FK
    int quantidade "CHECK > 0"
    decimal preco_unitario "snapshot CHECK >= 0"
    decimal subtotal
    datetime createdAt
    datetime updatedAt
  }

  COMPRAS {
    int id PK
    string descricao
    decimal valor "CHECK >= 0"
    date data_compra
    string fornecedor "opcional"
    int registradoPorId FK
    datetime createdAt
    datetime updatedAt
  }

  REFRESH_TOKENS {
    int id PK
    int usuarioId FK
    string tokenHash UK "SHA-256 UNIQUE"
    datetime expiresAt
    datetime revokedAt "nullable"
    datetime createdAt
    datetime updatedAt
  }

  USUARIOS ||--o{ RESERVAS : "cliente faz"
  MESAS ||--o{ RESERVAS : "alocada em"
  USUARIOS ||--o{ PEDIDOS : "cliente pede"
  USUARIOS ||--o{ PEDIDOS : "garcom atende"
  RESERVAS ||--o{ PEDIDOS : "opcional"
  CATEGORIAS_MENU ||--o{ ITENS_MENU : "agrupa"
  PEDIDOS ||--o{ PEDIDO_ITENS : "contem"
  ITENS_MENU ||--o{ PEDIDO_ITENS : "vendido em"
  USUARIOS ||--o{ COMPRAS : "registra"
  USUARIOS ||--o{ REFRESH_TOKENS : "sessao"
```

### Como ler

- `PK` = chave primária · `FK` = chave estrangeira · `UK` = UNIQUE
- `||--o{` = **um** para **muitos** (1:N)

Visualizar no preview Mermaid do Cursor / VS Code / GitHub.
