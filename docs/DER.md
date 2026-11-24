# DER — get-order (Restaurante IOT)

**DER** = Diagrama Entidade-Relacionamento das tabelas previstas para o MVP.  
Fonte de planejamento da Fase 0; na implementação, as **migrations Sequelize** serão a fonte de verdade do schema (como em `web-car-wash`). Detalhe de campos: `docs/MODELO_DADOS.md`. Regras: `docs/FASE0_REGRAS.md`.

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
| `usuarios` (admin/funcionário) | `compras` | 1 : N | `compras.registradoPorId` |

- Um **usuário** autentica todos os papéis (`admin` | `funcionario` | `cliente`) na mesma tabela.
- Cliente faz **N** reservas e **N** pedidos.
- Cada reserva aloca **uma** mesa (`mesaId` obrigatório — abordagem A).
- Pedido pode ou não ter reserva; garçom é obrigatório só no momento do **pagamento**.
- `pedido_itens` guarda preço unitário (snapshot) na compra.
- `compras` = despesas (alimentos/insumos), sem ligação com cardápio no MVP.

---

## Regras importantes para apresentar

- **UNIQUE:** `usuarios.email`, `mesas.identificacao`, `categorias_menu.nome`
- **ENUM:**  
  - `usuarios.perfil` → `admin` \| `funcionario` \| `cliente`  
  - `reservas.status` → `pendente` \| `confirmada` \| `cancelada` \| `concluida`  
  - `pedidos.status` → `aberto` \| `em_preparo` \| `pronto` \| `entregue` \| `pago` \| `cancelado`
- **CHECK:**  
  - `mesas.capacidade > 0`  
  - `reservas.quantidade_pessoas > 0`  
  - `itens_menu.preco >= 0`  
  - `pedido_itens.quantidade > 0`  
  - `pedido_itens.preco_unitario >= 0`  
  - `pedidos.valor_total >= 0`  
  - `pedidos.valor_comissao >= 0` (quando preenchido)  
  - `compras.valor >= 0`
- **Disponibilidade de mesa:** regra de negócio na API (não UNIQUE simples): bloquear se já houver reserva `pendente`/`confirmada` na mesma mesa + data + horário.
- **ON DELETE RESTRICT** nas FKs principais (não apagar usuário/mesa/item com filhos). Preferir `ativa`/`disponivel`/`cancelado`.
- **Comissão 10%:** calculada e gravada em `pedidos.valor_comissao` ao status `pago`.

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

  USUARIOS ||--o{ RESERVAS : "cliente faz"
  MESAS ||--o{ RESERVAS : "alocada em"
  USUARIOS ||--o{ PEDIDOS : "cliente pede"
  USUARIOS ||--o{ PEDIDOS : "garcom atende"
  RESERVAS ||--o{ PEDIDOS : "opcional"
  CATEGORIAS_MENU ||--o{ ITENS_MENU : "agrupa"
  PEDIDOS ||--o{ PEDIDO_ITENS : "contem"
  ITENS_MENU ||--o{ PEDIDO_ITENS : "vendido em"
  USUARIOS ||--o{ COMPRAS : "registra"
```

### Como ler os símbolos

- `PK` = chave primária (`id`)
- `FK` = chave estrangeira
- `UK` = UNIQUE
- `||--o{` = **um** para **muitos** (1:N)

## Onde visualizar

- Preview Markdown com Mermaid no VS Code / Cursor / GitHub.
- Exportar imagem/PDF se a banca pedir artefato visual separado.
