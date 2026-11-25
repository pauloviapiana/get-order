# Fase 8 — Frontend cliente (consolidação)

Escopo: fechar o site `frontend-cliente` (porta **5173**) como entrega coerente com `FASE0_REGRAS.md` §8 e `DOCUMENTACAO.md` §8.  
As telas nasceram nas Fases 2–5; esta fase **organiza, endurece UX e documenta** — não cria o app do zero.

Fora de escopo: backend, gestão (`frontend-gestao` → Fase 9), ensaio E2E formal (Fase 10), React Router, refresh token, PWA, gateway de pagamento.

Regras: `FASE0_REGRAS.md`, `MATRIZ_RBAC.md`, `FASE3_MESAS_RESERVAS.md`, `FASE4_CARDAPIO.md`, `FASE5_PEDIDOS.md`.

---

## O que a tela faz

| Área | Comportamento |
|------|----------------|
| Público | Abas **Entrar** / **Criar conta**. Cadastro chama `POST /auth/register` e já entra com `POST /auth/login`. |
| Gate de perfil | Só `cliente` grava sessão. `admin` / `funcionario` veem mensagem apontando o site de gestão (`http://localhost:5174`) — espelho do gate inverso da gestão. |
| Logado | Header com nome, perfil e **Sair**. Abas: **Reservar** \| **Minhas reservas** \| **Cardápio e pedido** \| **Meus pedidos**. |
| Sessão | JWT em `sessionStorage` (`token` + `usuario`). Ao abrir, `GET /auth/me`. Em 401 autenticado, limpa sessão e volta ao login. |
| Preços | Exibidos em R$ via `formatarPreco` (API devolve decimal string). |

Não há endpoints de gestão neste app (usuários admin, compras, financeiro, CRUD de mesas/cardápio).

---

## Abas autenticadas × rotas API

| Aba | UI | Rotas consumidas |
|-----|----|------------------|
| Reservar | Data/horário/pessoas → mesas livres → criar reserva | `GET /mesas`, `GET /mesas/disponibilidade`, `POST /reservas` |
| Minhas reservas | Lista própria; cancelar `pendente`/`confirmada` (aviso: pedido vinculado não cancela sozinho) | `GET /reservas`, `PATCH /reservas/:id/status` → `cancelada` |
| Cardápio e pedido | Categorias/itens, quantidades, reserva opcional, total, enviar | `GET /categorias`, `GET /itens-menu`, `GET /reservas`, `POST /pedidos` |
| Meus pedidos | Lista; cancelar se `aberto`; pagar se `entregue` **com** garçom; sem garçom, aviso bloqueando | `GET /pedidos`, `PATCH /pedidos/:id/status` |

Auth compartilhado: `POST /auth/login`, `POST /auth/register`, `GET /auth/me`.

---

## Gate de perfil

1. **Login:** se `usuario.perfil !== 'cliente'`, **não** chama `salvarSessao`; mostra `MENSAGEM_PERFIL_GESTAO`.
2. **Boot:** sessão local com perfil ≠ `cliente` é descartada; `/auth/me` com perfil errado também limpa e avisa.
3. **Autorização real** continua no backend (403). O gate é só UX.

Funcionário **não** opera cozinha/garçom neste site (MVP desta fase = só `cliente`).

---

## UX / robustez

- Loading, erro (`mensagemDeErro`: `erro` + primeiro `detalhes` se houver), lista vazia e botões `disabled` em submit.
- Sem resposta de rede: mensagem pedindo para verificar se a API está no ar.
- Token expirado (30 min): interceptor Axios em 401 com `Authorization` dispara `sessao-expirada`.
- Navegação por estado (sem React Router), no mesmo padrão do gestão.
- Sem dependências novas além de React + Axios + Vite.

---

## Como subir

Pré-requisito: API em `http://localhost:3001` com migrate + seed (`README.md`).

```powershell
cd frontend-cliente
copy .env.example .env
npm install
npm run dev
```

Abre em `http://localhost:5173`. `VITE_API_URL` padrão: `http://localhost:3001/api`.

### Logins demo (senha `123456`)

| Deve entrar no 5173 | Deve ser recusado (mensagem → 5174) |
|---------------------|--------------------------------------|
| `cliente1@getorder.com` | `admin@getorder.com` |
| `cliente2@getorder.com` | `funcionario1@getorder.com` |

---

## Critérios de aceite

Com API no ar + seed:

1. `cliente1@getorder.com` / `123456` entra e completa: reservar → pedir (com e sem reserva) → ver pedidos.
2. Cancelar reserva/`aberto` nos status permitidos mostra feedback correto.
3. Pagar pedido `entregue` **com** garçom funciona; **sem** garçom, UI bloqueia com mensagem clara.
4. Login de `admin@getorder.com` no 5173 é recusado sem gravar sessão.
5. Erros 400/403/409 da API aparecem legíveis (sem stack/SQL).
6. Este arquivo permite a outro aluno validar a fase sem reabrir o código inteiro.

### Roteiro manual curto

1. Subir backend + `npm run seed`; subir cliente (`npm run dev`).
2. Tentar `admin@getorder.com` → mensagem de gestão; sessão vazia no DevTools.
3. Entrar como `cliente1@getorder.com`.
4. **Reservar:** sex/sáb/dom futuro, slot 18:00–22:30 → mesa livre → criar → ver em **Minhas reservas**.
5. Dia inválido (ex. terça) → erro da API na UI.
6. **Cardápio:** montar itens, enviar sem reserva; depois com reserva pendente/confirmada.
7. **Meus pedidos:** cancelar um `aberto`; no seed, pedido `entregue` com garçom → **Pagar**; se aparecer entregue sem garçom → aviso, sem botão.
8. Esperar expirar o JWT (ou apagar `token`) e disparar uma ação → volta ao login.

---

## Arquivos principais

```
frontend-cliente/src/
├── App.jsx                 # gate, abas, /auth/me, sessão expirada
├── components/
│   ├── Login.jsx           # gate de perfil
│   ├── Cadastro.jsx
│   ├── NovaReserva.jsx
│   ├── MinhasReservas.jsx
│   ├── Cardapio.jsx
│   └── MeusPedidos.jsx
└── services/
    ├── api.js              # Axios + Bearer + 401 → limpar sessão
    ├── sessao.js           # sessionStorage + mensagemDeErro + MENSAGEM_PERFIL_GESTAO
    └── formato.js          # R$ e data pt-BR
```

---

## Próximo

- **Fase 9:** consolidar `frontend-gestao` — ver [`FASE9_FRONTEND_GESTAO.md`](FASE9_FRONTEND_GESTAO.md).
- **Fase 10:** ensaio E2E formal dos dois sites + pacote de entrega.
