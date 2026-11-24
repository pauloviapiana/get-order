# Matriz RBAC — get-order

Perfis: `admin` | `funcionario` | `cliente`.  
Middleware previsto (padrão car-wash): `autenticar` → `autorizarPerfil(...)`.  
Legenda: **sim** = permitido · **não** = 403 · observações à direita.

Detalhe de regras: `docs/FASE0_REGRAS.md`.

---

## Auth

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| `POST /api/auth/register` (cliente) | — | — | sim* | *Público; força perfil `cliente` |
| `POST /api/auth/login` | sim | sim | sim | Público |
| `GET /api/auth/me` | sim | sim | sim | JWT obrigatório |
| `GET /api/health` | — | — | — | Público |

---

## Usuários

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| `GET /api/usuarios` | sim | não | não | Listar todos |
| `GET /api/usuarios/:id` | sim | não | próprio** | **Cliente só o próprio id |
| `POST /api/usuarios` | sim | não | não | Criar admin/funcionario/cliente |
| `PUT/PATCH /api/usuarios/:id` | sim | não | próprio*** | ***Cliente: nome/telefone/senha; não muda perfil |
| `PATCH /api/usuarios/:id/ativo` | sim | não | não | Ativar/desativar |
| `DELETE /api/usuarios/:id` | sim | não | não | Preferir desativar; delete só se sem dependências |

---

## Mesas

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| `GET /api/mesas` | sim | sim | sim | Cliente: só `ativa=true` (para reservar) |
| `GET /api/mesas/:id` | sim | sim | sim | |
| `GET /api/mesas/disponibilidade` | sim | sim | sim | Query data+horário → mesas livres |
| `POST /api/mesas` | sim | não | não | |
| `PUT/PATCH /api/mesas/:id` | sim | não | não | |
| `DELETE` / desativar mesa | sim | não | não | Preferir `ativa=false` |

---

## Reservas

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| `GET /api/reservas` | sim | sim | próprias | Filtros data/nome/status |
| `GET /api/reservas/:id` | sim | sim | própria | |
| `POST /api/reservas` | sim | sim | sim | Cliente: `clienteId` = self |
| `PUT/PATCH /api/reservas/:id` | sim | sim | própria | Só `pendente`/`confirmada` |
| `PATCH /api/reservas/:id/status` → confirmada/concluida | sim | sim | não | |
| `PATCH .../status` → cancelada | sim | sim | própria | |
| `DELETE /api/reservas/:id` | sim | não | não | Opcional; preferir cancelar |

---

## Cardápio (categorias + itens)

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| `GET /api/categorias` / `itens-menu` | sim | sim | sim | Cliente/func: preferir só ativos/disponíveis |
| `POST/PUT/PATCH/DELETE categorias` | sim | não | não | |
| `POST/PUT/PATCH/DELETE itens-menu` | sim | não | não | Inclui marcar `disponivel` |

---

## Pedidos

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| `GET /api/pedidos` | sim | sim | próprios | |
| `GET /api/pedidos/:id` | sim | sim | próprio | |
| `POST /api/pedidos` | sim | sim | sim | Com itens; `reservaId` opcional |
| `POST/PATCH itens do pedido` | sim | sim | próprio se `aberto` | |
| `PATCH /api/pedidos/:id/garcom` | sim | sim | não | Atribuir `garcomId` |
| `PATCH /api/pedidos/:id/status` (preparo/pronto/entregue) | sim | sim | não | Fluxo cozinha/salão |
| `PATCH .../status` → `pago` | sim | sim | próprio | Exige garçom; gera 10% |
| `PATCH .../status` → `cancelado` | sim | sim | próprio se `aberto` | Sem comissão se antes de pago |

---

## Pagamentos / financeiro

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| Pagar pedido (ver acima) | sim | sim | próprio | Não há gateway; status `pago` |
| `GET /api/compras` | sim | não | não | Despesas |
| `POST /api/compras` | sim | não | não | |
| `PUT/PATCH/DELETE /api/compras/:id` | sim | não | não | |
| `GET /api/financeiro/resumo` | sim | não**** | não | ****Opcional Fase+: func vê só “minhas comissões” |
| `GET /api/financeiro/comissoes` | sim | próprias | não | 10% por garçom / período |

---

## Relatórios

| Recurso / endpoint | admin | funcionario | cliente | Observação |
|--------------------|:-----:|:-----------:|:-------:|------------|
| Resumo vendas × despesas | sim | não | não | Pedidos `pago` − `compras` |
| Comissões por garçom | sim | próprias | não | Soma `valor_comissao` |
| Ocupação / reservas do dia | sim | sim | não | Apoio operacional |

---

## Frontends × perfil

| App | Papéis esperados |
|-----|------------------|
| `frontend-cliente` | `cliente` (cadastro/login, menu, pedidos, reservas, pagar) |
| `frontend-gestao` | `admin`, `funcionario` (operações + admin total) |

Bloquear no front por UX; **autorização real sempre no backend**.
