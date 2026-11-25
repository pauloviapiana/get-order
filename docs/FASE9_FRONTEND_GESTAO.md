# Fase 9 — Frontend gestão (consolidação)

Escopo: fechar o site `frontend-gestao` (porta **5174**) como entrega coerente com `FASE0_REGRAS.md` §8 e `DOCUMENTACAO.md` §8.  
As telas nasceram nas Fases 2–6; esta fase **organiza, endurece UX e documenta** — não cria o app do zero. Espelho da Fase 8 (`FASE8_FRONTEND_CLIENTE.md`).

Fora de escopo: backend, cliente (`frontend-cliente` → Fase 8), ensaio E2E formal (Fase 10), React Router, refresh token, PWA, redesign visual grande, endpoints inventados.

Regras: `FASE0_REGRAS.md`, `MATRIZ_RBAC.md`, `FASE2_AUTH.md` … `FASE6_FINANCEIRO.md`.

---

## O que a tela faz

| Área | Comportamento |
|------|----------------|
| Público | Só **Entrar** (sem cadastro público). Login chama `POST /auth/login`. |
| Gate de perfil | Só `admin` / `funcionario` gravam sessão. `cliente` vê mensagem apontando o site do cliente (`http://localhost:5173`) — espelho do gate inverso do cliente. |
| Logado | Header com nome, perfil e **Sair**. Abas conforme perfil (ver abaixo). |
| Sessão | JWT em `sessionStorage` (`token` + `usuario`). Ao abrir, `GET /auth/me`. Em 401 autenticado, limpa sessão e volta ao login. |
| Preços | Exibidos em R$ via `formatarPreco` (API devolve decimal string). |
| RBAC na UI | Esconde abas/ações de admin para funcionário (`ehAdmin`); a API continua a fonte da verdade (403 legível). |

Não há cadastro público nem fluxos exclusivos do cliente (reservar própria mesa, montar pedido como cliente).

---

## Abas autenticadas × rotas API

| Aba | Quem vê | UI | Rotas consumidas |
|-----|---------|----|------------------|
| Reservas | admin + funcionario | Lista/filtros; confirmar/concluir/cancelar | `GET /reservas`, `PATCH /reservas/:id/status` |
| Pedidos | admin + funcionario | Filtro status; atribuir garçom; fluxo de preparo/pagamento; cancelar `entregue` só admin | `GET /pedidos`, `GET /pedidos/garcons`, `PATCH /pedidos/:id/garcom`, `PATCH /pedidos/:id/status` |
| Mesas | admin + funcionario | Lista; CRUD/ativar só admin | `GET /mesas`; admin: `POST/PATCH /mesas`, `PATCH /mesas/:id/ativa` |
| Cardápio | admin + funcionario | Categorias/itens; CRUD/ativar só admin | `GET /categorias`, `GET /itens-menu`; admin: `POST/PATCH` + `ativa`/`disponivel` |
| Compras | só admin | Filtrar, criar, editar, excluir despesas | `GET/POST /compras`, `PATCH/DELETE /compras/:id` |
| Financeiro | admin: resumo + comissões; funcionario: **Minhas comissões** | Período opcional | `GET /financeiro/comissoes`; admin também `GET /financeiro/resumo` |
| Usuários | só admin | Lista | `GET /usuarios` |

Auth compartilhado: `POST /auth/login`, `GET /auth/me`.

---

## Gate de perfil

1. **Login:** se `usuario.perfil` ∉ `{admin, funcionario}`, **não** chama `salvarSessao`; mostra `MENSAGEM_PERFIL_CLIENTE`.
2. **Boot:** sessão local com perfil inválido/`cliente` é descartada; `/auth/me` com perfil errado também limpa e avisa.
3. **Autorização real** continua no backend (403). O gate e o `ehAdmin` são só UX.

Cliente **não** opera este site (MVP desta fase = gestão).

---

## UX / robustez

- Loading, erro (`mensagemDeErro`: sem rede → API no ar; `erro` + primeiro `detalhes` se houver), lista vazia e botões `disabled` em submit.
- Sem resposta de rede: mensagem pedindo para verificar se a API está no ar.
- Token expirado (30 min): interceptor Axios em 401 com `Authorization` dispara `sessao-expirada`.
- Navegação por estado (sem React Router), no mesmo padrão do cliente.
- Sem dependências novas além de React + Axios + Vite.

---

## Como subir

Pré-requisito: API em `http://localhost:3001` com migrate + seed (`README.md`).

```powershell
cd frontend-gestao
copy .env.example .env
npm install
npm run dev
```

Abre em `http://localhost:5174`. `VITE_API_URL` padrão: `http://localhost:3001/api`.

### Logins demo (senha `123456`)

| Deve entrar no 5174 | Abas | Deve ser recusado (mensagem → 5173) |
|---------------------|------|--------------------------------------|
| `admin@getorder.com` | Reservas, Pedidos, Mesas, Cardápio, Compras, Financeiro, Usuários | `cliente1@getorder.com` |
| `funcionario1@getorder.com` | Reservas, Pedidos, Mesas, Cardápio, Minhas comissões (sem Usuários/Compras nem ações admin em mesas/cardápio) | `cliente2@getorder.com` |

---

## Critérios de aceite

Com API no ar + seed:

1. `admin@getorder.com` / `123456` entra e usa Reservas, Pedidos, Mesas, Cardápio, Compras, Financeiro, Usuários.
2. `funcionario1@getorder.com` entra; vê Reservas/Pedidos/Mesas/Cardápio/Minhas comissões; **não** vê Usuários nem Compras (nem ações admin no cardápio/mesas).
3. Login de `cliente1@getorder.com` no 5174 é recusado **sem** gravar sessão; mensagem aponta o 5173.
4. Token expirado / 401 autenticado limpa sessão e volta ao login com aviso.
5. Erros 400/403/409 da API aparecem legíveis (sem stack/SQL); loading/vazio ok nas abas principais.
6. Este arquivo permite a outro aluno validar a fase sem reabrir o código inteiro.

### Roteiro manual curto

1. Subir backend + `npm run seed`; subir gestão (`npm run dev` em `frontend-gestao`).
2. Tentar `cliente1@getorder.com` → mensagem do cliente (5173); sessão vazia no DevTools.
3. Entrar como `admin@getorder.com`: percorrer abas; em Pedidos atribuir garçom e avançar status; em Compras registrar uma despesa; em Financeiro ver resumo.
4. Sair; entrar como `funcionario1@getorder.com`: confirmar abas (sem Usuários/Compras); Minhas comissões; Mesas/Cardápio só leitura.
5. Apagar `token` no sessionStorage e disparar uma ação → volta ao login com aviso de sessão expirada.

---

## Arquivos principais

```
frontend-gestao/src/
├── App.jsx                 # gate, abas por perfil, /auth/me, sessão expirada
├── components/
│   ├── Login.jsx           # gate de perfil (MENSAGEM_PERFIL_CLIENTE)
│   ├── Reservas.jsx
│   ├── Pedidos.jsx
│   ├── Mesas.jsx
│   ├── Cardapio.jsx
│   ├── Compras.jsx         # só admin
│   ├── Financeiro.jsx      # resumo admin / minhas comissões
│   └── Usuarios.jsx        # só admin
└── services/
    ├── api.js              # Axios + Bearer + 401 → limpar sessão
    ├── sessao.js           # sessionStorage + mensagemDeErro + MENSAGEM_PERFIL_CLIENTE
    └── formato.js          # R$ e data pt-BR
```

---

## Próximo

- **Fase 10:** ensaio E2E formal dos dois sites + pacote de entrega.
