# Fase 3 — Mesas e reservas

Escopo: tabelas `mesas` e `reservas`, regras de agenda, disponibilidade, transições de status e RBAC.  
Regras de origem: `FASE0_REGRAS.md` §§1–3, `MODELO_DADOS.md` §§2–3, `MATRIZ_RBAC.md` (Mesas e Reservas).

Cardápio, pedidos e financeiro **não** fazem parte desta fase.

---

## Decisões

| Item | Decisão |
|------|---------|
| Migrations | `20261124000002-create-mesas` e `20261124000003-create-reservas`; FKs `ON DELETE RESTRICT`; CHECK `capacidade > 0` e `quantidade_pessoas > 0` |
| Slot único? | **Sem** UNIQUE(mesa, data, horário). Conflito só entre `pendente`/`confirmada`, checado no `reservaService` |
| Concorrência | Criar/editar reserva roda em transação e trava a linha da mesa (`SELECT … FOR UPDATE`): checagem de conflito + gravação são atômicas. Testado com 6 POSTs simultâneos no mesmo slot → 1×201, 5×409 |
| `horario` | `STRING(5)` `"HH:MM"`; precisa estar em `18:00, 18:30, …, 22:30` |
| Dia / passado | Só sexta, sábado e domingo; slot já ocorrido rejeitado. "Agora" calculado em `America/Sao_Paulo` (`services/regrasReserva.js`) |
| Validação | Zod checa só formato (`AAAA-MM-DD`, `HH:MM`, inteiros > 0). Dia da semana, lista de slots, passado, mesa ativa, capacidade e conflito são regras da service |
| Cliente criando | `clienteId` é **sempre** o próprio id (valor do body é descartado) |
| Equipe criando | `clienteId` obrigatório e deve ser usuário ativo com perfil `cliente` (reserva por telefone) |
| Edição | `PUT/PATCH /reservas/:id` só em `pendente`/`confirmada`; mudar mesa/data/horário/pessoas revalida tudo (inclusive conflito, ignorando a própria reserva). `status` e `clienteId` não são editáveis por aqui (400) |
| Status | `PATCH /reservas/:id/status`, transições exatamente como §3. Terminais (`cancelada`, `concluida`) → 400. Transição fora da tabela → 400. Cliente confirmando/concluindo → 403 |
| Ordem das checagens de status | 404 → posse (403) → perfil para confirmar/concluir (403) → transição (400) |
| `DELETE /reservas/:id` | **Omitido**. Cancelar via status preserva histórico (e futuros `pedidos.reservaId`) |
| Desativar mesa | `PATCH /mesas/:id/ativa` com `{ "ativa": false }` (mesmo padrão de `/usuarios/:id/ativo`). **Sem** `DELETE /mesas` |
| Mesa com reservas ativas | Desativar mesa com reserva `pendente`/`confirmada` de hoje em diante → 409 (cancele antes). Reduzir capacidade abaixo de uma reserva ativa futura → 409 |
| Cliente e mesa inativa | Não aparece em `GET /mesas`; `GET /mesas/:id` responde 404 |
| Disponibilidade | Mesas `ativa=true` sem reserva `pendente`/`confirmada` no slot; mesmas regras de dia/slot/passado (400). `pessoas` opcional filtra `capacidade >= pessoas` |
| Unique de mesa | `identificacao` repetida → 409 "Identificação de mesa já cadastrada" (service + fallback no tratador de erros) |

---

## Endpoints

Base: `http://localhost:3001/api`. Todos exigem JWT (`Authorization: Bearer <token>`).

### Mesas

| Método | Rota | Acesso | Sucesso |
|--------|------|--------|---------|
| GET | `/mesas` | os 3 perfis (cliente: só ativas) | 200 lista; admin/func aceitam `?ativa=true\|false` |
| GET | `/mesas/disponibilidade?data=&horario=&pessoas=` | os 3 perfis | 200 `{ data, horario, mesas: [...] }` |
| GET | `/mesas/:id` | os 3 perfis (cliente: 404 se inativa) | 200 mesa |
| POST | `/mesas` | admin | 201 mesa |
| PUT/PATCH | `/mesas/:id` | admin | 200 mesa (`identificacao`, `capacidade`) |
| PATCH | `/mesas/:id/ativa` | admin | 200 mesa |

### Reservas

| Método | Rota | Acesso | Sucesso |
|--------|------|--------|---------|
| GET | `/reservas?data=&status=&mesaId=&cliente=` | admin/func: todas · cliente: próprias | 200 lista com `mesa` e `cliente` |
| GET | `/reservas/:id` | admin/func · cliente (própria) | 200 reserva |
| POST | `/reservas` | os 3 perfis | 201 reserva `pendente` |
| PUT/PATCH | `/reservas/:id` | admin/func · cliente (própria) | 200 reserva |
| PATCH | `/reservas/:id/status` | ver tabela abaixo | 200 reserva |

Filtro `cliente` = trecho do nome (sem diferenciar maiúsculas); ignorado para cliente, que sempre vê só as próprias. Ordenação: data, horário.

| Transição (`status` no body) | admin | funcionario | cliente |
|------------------------------|:-----:|:-----------:|:-------:|
| `pendente` → `confirmada` | sim | sim | 403 |
| `pendente`/`confirmada` → `cancelada` | sim | sim | própria |
| `confirmada` → `concluida` | sim | sim | 403 |
| qualquer outra / a partir de terminal | 400 | 400 | 400 (ou 403 se for confirmar/concluir) |

### Erros

Mesmo formato da Fase 2: `{ "erro": "mensagem" }` (+ `detalhes` em validação Zod).

| HTTP | Quando |
|------|--------|
| 400 | Zod (formato, campo não permitido, body vazio); dia útil; horário fora da lista; slot passado; pessoas > capacidade; mesa desativada; transição inválida/terminal; editar reserva cancelada/concluída; equipe sem `clienteId` |
| 401 | Sem token / token inválido |
| 403 | Perfil sem permissão (escrita em mesas por não-admin); cliente em reserva alheia; cliente confirmando/concluindo |
| 404 | Mesa, reserva ou cliente não encontrado |
| 409 | Slot ocupado (mesma mesa + data + horário com `pendente`/`confirmada`); `identificacao` de mesa repetida; desativar/reduzir mesa com reservas ativas |

---

## Exemplos

```http
GET /api/mesas/disponibilidade?data=2027-01-15&horario=20:00&pessoas=4
Authorization: Bearer <token-cliente>
```

```json
{
  "data": "2027-01-15",
  "horario": "20:00",
  "mesas": [
    { "id": 3, "identificacao": "M3", "capacidade": 4, "ativa": true, "createdAt": "…", "updatedAt": "…" }
  ]
}
```

```http
POST /api/reservas
Authorization: Bearer <token-cliente>
Content-Type: application/json

{ "mesaId": 3, "data_reserva": "2027-01-15", "horario": "20:00", "quantidade_pessoas": 4, "observacoes": "Aniversário" }
```

```http
POST /api/reservas
Authorization: Bearer <token-funcionario>
Content-Type: application/json

{ "clienteId": 5, "mesaId": 4, "data_reserva": "2027-01-16", "horario": "19:30", "quantidade_pessoas": 2 }
```

```http
PATCH /api/reservas/7/status
Authorization: Bearer <token-funcionario>
Content-Type: application/json

{ "status": "confirmada" }
```

```http
PATCH /api/mesas/7/ativa
Authorization: Bearer <token-admin>
Content-Type: application/json

{ "ativa": false }
```

Conflito:

```json
{ "erro": "Mesa M3 já está reservada em 2027-01-15 às 20:00" }
```

---

## Seed (`npm run seed`)

Estende o seed da Fase 2 (usuários inalterados). Reexecutável.

**Mesas** (chave `identificacao`):

| Mesa | Capacidade | Ativa |
|------|-----------:|:-----:|
| M1, M2 | 2 | sim |
| M3, M4 | 4 | sim |
| M5, M6 | 6 | sim |
| M7 | 4 | **não** |

**Reservas** (chave cliente + mesa + `observacoes` "[seed] …"). Datas calculadas na **primeira** execução, relativas ao dia em que o seed rodou; execuções seguintes não recriam nem mudam:

| Cliente | Mesa | Data | Horário | Pessoas | Status |
|---------|------|------|---------|--------:|--------|
| cliente1 (Ana) | M3 | próxima sexta | 19:00 | 3 | pendente |
| cliente2 (Bruno) | M5 | próximo sábado | 20:30 | 6 | confirmada |
| cliente3 (Carla) | M1 | próximo domingo | 18:30 | 2 | cancelada |
| cliente1 (Ana) | M4 | sábado anterior | 21:00 | 4 | concluida (histórico) |

O seed grava direto pelo model (para poder criar status variados e uma reserva passada), mas pula reservas ativas cujo slot já esteja ocupado.

---

## Postman

`backend/postman/Get-Order-Mesas-Reservas.postman_collection.json` — 69 requests, 152 asserções:

- **0. Setup:** login admin / funcionario1 / cliente1 / cliente2 e cálculo das datas (sexta ~5 semanas à frente, domingo, segunda útil, sexta passada)
- **1. Mesas:** criar (admin 201, duplicada 409, capacidade 0 400, func/cliente 403, sem token 401), atualizar, desativar, cliente só vê ativas
- **2. Disponibilidade:** slot livre, filtro `pessoas`, dia útil / horário fora da lista / sem parâmetros (400)
- **3. Criação e regras:** reserva válida (clienteId forçado = self), dia útil, 18:45, 23:00, data passada, capacidade, mesa desativada, mesa inexistente, conflito 409
- **4. Posse e RBAC:** cliente só lista/vê/edita/cancela as próprias (403 nas alheias), confirmar 403 para cliente, filtros de data/nome/status
- **5. Status:** confirmar, transição inválida, conflito com confirmada, cancelar **libera o slot** (2ª reserva no mesmo slot = 201), concluir, terminais
- **6. Mesa com reservas ativas:** reduzir capacidade / desativar → 409; após cancelar → desativa (limpeza)

```powershell
postman collection run backend/postman/Get-Order-Mesas-Reservas.postman_collection.json
```

Cada execução cria mesas próprias (`PM-<timestamp>`) e as desativa no final: reexecutável sem colidir com o seed.

---

## Frontends

- **frontend-cliente (5173):** logado, mostra as mesas ativas, formulário data/horário/pessoas → "Ver mesas livres" (`/mesas/disponibilidade`) → botão "Reservar Mx" cria a reserva; tabela "Minhas reservas" com botão Cancelar (pendente/confirmada).
- **frontend-gestao (5174):** abas **Reservas** (todas, filtros data/status/nome do cliente; botões Confirmar / Concluir / Cancelar conforme o status) e **Mesas** (todas; admin cria, edita identificação/capacidade e ativa/desativa; funcionário só consulta). Admin mantém a aba **Usuários**.
- Mensagens de erro da API aparecem em vermelho (`mensagemDeErro`). Autorização real continua no backend.
