# Fase 0 — Regras de negócio e decisões fechadas

Projeto: **get-order** (restaurante IOT).  
Escopo: enunciado completo (auth, reservas, menu/pedidos, financeiro, dois sites).  
Persistência: **Sequelize + migrations** (padrão `web-car-wash`).  
Material complementar = apoio didático de **reservas**, não do escopo total.

Nenhuma decisão abaixo fica “a decidir” sem default.

---

## 1. Horário de funcionamento e agendamento

| Item | Decisão |
|------|---------|
| Dias com **reserva** | Somente **sexta, sábado e domingo** |
| Segunda a quinta | Sem agendamento; API rejeita (`400`) |
| Janela de horário | **18:00 às 22:30** (último slot) |
| Intervalo entre slots | **30 minutos** (`18:00`, `18:30`, …, `22:30`) |
| Fuso | `America/Sao_Paulo` (validar data/hora no backend) |
| Passado | Impedir reserva com data/horário já ocorridos |
| Quantidade de pessoas | Inteiro ≥ 1; não pode exceder a **capacidade da mesa** alocada |

Slots válidos (lista fixa no service):  
`18:00, 18:30, 19:00, 19:30, 20:00, 20:30, 21:00, 21:30, 22:00, 22:30`.

---

## 2. Capacidade — abordagem escolhida

**Escolha: A — mesas com capacidade individual + alocação na reserva.**

Justificativa:
- O enunciado fala em **“reserva de mesa”**.
- Espaço pequeno: mesas físicas fazem sentido e evitam overbooking por soma genérica.
- MVP acadêmico: alocação **manual/explícita** (cliente ou funcionário escolhe mesa disponível; admin/funcionário pode reatribuir). Sem algoritmo avançado de packing.

### Regras de disponibilidade (mesa)

Uma mesa está **indisponível** no par `(data, horário)` se existir reserva com status `pendente` ou `confirmada` para a mesma mesa nesse slot.

- `cancelada` e `concluida` **não** bloqueiam.
- Ao editar data/horário/mesa/quantidade, revalidar disponibilidade e capacidade.
- Concorrência: verificar + gravar em **transação** Sequelize; em conflito responder `409`.

Limite didático sugerido no seed: ~6–8 mesas (capacidade 2–6). Não há teto global por horário além da soma das mesas.

---

## 3. Status de reserva e transições

ENUM: `pendente` | `confirmada` | `cancelada` | `concluida`.

| De | Para | Quem |
|----|------|------|
| (criação) | `pendente` | cliente (própria) ou funcionario/admin |
| `pendente` | `confirmada` | funcionario, admin |
| `pendente` | `cancelada` | cliente (própria), funcionario, admin |
| `confirmada` | `cancelada` | cliente (própria), funcionario, admin |
| `confirmada` | `concluida` | funcionario, admin |
| `cancelada` / `concluida` | — | **terminal** (sem nova transição) |

Edição de campos (data, horário, mesa, pessoas, observações): só em `pendente` ou `confirmada`, com revalidação. Preferir cancelar a apagar (`DELETE` soft via status).

---

## 4. Status de pedido e transições

ENUM: `aberto` | `em_preparo` | `pronto` | `entregue` | `pago` | `cancelado`.

| De | Para | Quem |
|----|------|------|
| (criação) | `aberto` | cliente, funcionario, admin |
| `aberto` | `em_preparo` | funcionario, admin |
| `em_preparo` | `pronto` | funcionario, admin |
| `pronto` | `entregue` | funcionario, admin |
| `entregue` | `pago` | cliente (próprio), funcionario, admin |
| `aberto` / `em_preparo` / `pronto` | `cancelado` | cliente (próprio, se ainda `aberto`), funcionario, admin |
| `entregue` | `cancelado` | **não** (já consumido; só admin pode estornar via cancelamento excepcional → `cancelado` **sem** comissão) |
| `pago` / `cancelado` | — | **terminal** |

Default MVP: cliente cancela só enquanto `aberto`. Depois disso, só funcionario/admin.

---

## 5. Regra financeira — 10% do garçom

| Item | Decisão |
|------|---------|
| Base do cálculo | Soma dos `pedido_itens` (`quantidade × preco_unitario`) = `pedidos.valor_total` |
| Percentual | **10%** fixo: `valor_comissao = round(valor_total * 0.10, 2)` |
| Quando grava | Ao transicionar para **`pago`** |
| Garçom | `pedidos.garcomId` → `usuarios.id` com perfil `funcionario` |
| Sem garçom | Não permitir `pago` sem `garcomId` (funcionario/admin atribui antes) |
| Itens na base | Todos os itens do pedido no momento do pagamento (preço **snapshot** em `pedido_itens`) |
| Taxas extras / gorjeta manual | Fora do MVP (não entram) |
| Cancelamento | Se `cancelado` **antes** de `pago`: `valor_comissao = 0` (ou null). Se já `pago`: comissão permanece (estorno completo fora do MVP; admin marca nota em relatório se necessário) |
| Despesas | Tabela `compras` (compra de alimentos/insumos) — **não** entra na base dos 10% |
| Relatório | Vendas (`pago`) − despesas (`compras`) + comissões por garçom |

---

## 6. Compra antecipada × reserva

| Item | Decisão |
|------|---------|
| Pedido sem reserva | Permitido (consumo no local / app sem agendar mesa) |
| Pedido com reserva | `pedidos.reservaId` **nullable**; opcional |
| Obrigatório vincular? | **Não** |
| Compra antecipada | Pedido criado pelo cliente (status `aberto`) antes ou no dia; pode apontar para reserva futura |
| Reserva sem pedido | Permitido |
| Cascata | Cancelar reserva **não** cancela pedidos vinculados automaticamente; avisar na UI; cancelamento de pedido é ação separada |

---

## 7. Papéis RBAC

ENUM em `usuarios.perfil`: `admin` | `funcionario` | `cliente`.

Resumo (detalhe em `docs/MATRIZ_RBAC.md`):

| Ação | admin | funcionario | cliente |
|------|:-----:|:-----------:|:-------:|
| Login / ver próprio perfil | sim | sim | sim |
| CRUD usuários | sim | não | não (só auto-cadastro) |
| Auto-cadastro (`cliente`) | — | — | sim (público) |
| Gerir mesas / cardápio | sim | não* | não |
| Criar/listar reservas | sim (todas) | sim (todas) | sim (próprias) |
| Confirmar/concluir reserva | sim | sim | não |
| Criar/listar pedidos | sim (todos) | sim (todos) | sim (próprios) |
| Avançar preparo / atribuir garçom | sim | sim | não |
| Pagar pedido | sim | sim | sim (próprio) |
| Compras / relatório financeiro | sim | listar limitado** | não |

\* Funcionário **consulta** cardápio e mesas; **não** cria/edita/exclui (só admin).  
\*\* Funcionário vê pedidos/comissões do dia; **compras** e relatório consolidado = só admin.

---

## 8. Frontends — dois apps

| App | Porta sugerida (Fase 1+) | Público |
|-----|--------------------------|---------|
| `frontend-cliente` | 5173 | Clientes (+ login funcionario se útil no dia a dia, opcional) |
| `frontend-gestao` | 5174 | Admin e funcionários |

Justificativa: o enunciado pede **dois sites** (Cliente/funcionários e Gestão/funcionários). CORS no backend deve aceitar **ambas** as origens (`CLIENT_ORIGINS` ou lista).

Escopo por app (MVP):
- **Cliente:** cadastro/login, cardápio, pedido, pagamento próprio, reservas próprias.
- **Gestão:** login, reservas (confirmar/concluir), pedidos (fluxo cozinha/garçom), mesas, cardápio (admin), usuários (admin), compras e financeiro (admin).

---

## 9. JWT e sessão no client

| Item | Decisão |
|------|---------|
| Expiração | **30 minutos** (`expiresIn: '30m'`) — alinhado ao `web-car-wash` |
| Payload mínimo | `id`, `email`, `perfil` |
| Armazenamento | `sessionStorage` (chave `token`) |
| Envio | Header `Authorization: Bearer <token>` (Axios interceptor) |
| Senha | Hash **bcrypt**; nunca texto puro |
| Refresh token | Fora do MVP inicial; implementado na **Fase 11** (rotação + `sessionStorage`) — ver `FASE11_POLIMENTO.md` |

---

## 10. Stack e organização (referência para Fase 1+)

- PERN: PostgreSQL + Express + React (Vite) + Node.
- Sequelize **com migrations** (não `pg` cru do anexo).
- Camadas: `routes` → `controllers` → `services` → `models` (Sequelize).
- Validação: **Zod** nos schemas de entrada.
- Erros JSON padronizados, ex.: `{ "erro": "mensagem legível" }`.
- Prefixo API: `/api`.

---

## 11. Fora do MVP (explícito)

- Pagamento online real / gateway / NF-e.
- WhatsApp/e-mail/SMS.
- App nativo.
- Estoque automático a partir de `compras`.
- Algoritmo avançado de alocação de mesas.
- Múltiplos garçons no mesmo pedido.
- Soft-delete genérico além dos status terminais.
