# Postman — get-order

Cinco coleções por domínio, mais uma coleção-índice da Fase 7. Não substituem umas às outras.

**Pré-requisitos**

```powershell
cd backend
npx sequelize-cli db:migrate
npm run seed
npm run dev
```

API em `http://localhost:3001/api`. Senha demo: `123456`.

## Ordem

| Ordem | Arquivo | O que cobre |
|------:|---------|-------------|
| 1 | `Get-Order-Auth.postman_collection.json` | `/health`, auth (login/refresh/logout), usuários |
| 2 | `Get-Order-Mesas-Reservas.postman_collection.json` | mesas e reservas |
| 3 | `Get-Order-Cardapio.postman_collection.json` | categorias e itens |
| 4 | `Get-Order-Pedidos.postman_collection.json` | pedidos, garçom, pagamento |
| 5 | `Get-Order-Financeiro.postman_collection.json` | compras, resumo, comissões |
| — | `Get-Order-API.postman_collection.json` | índice + contrato de erro (409 unique, 400 JSON) |

As coleções 1–5 criam dados de teste. A de financeiro apaga as compras que ela mesma criou. Pedidos de teste permanecem. Para uma demo limpa, migre e semeie um banco novo.

A coleção-índice só lê o seed (e-mail, mesa `M1`, categoria `Entradas`) e não grava registro novo. Pode rodar sozinha, com a API no ar.

```powershell
postman collection run backend/postman/Get-Order-API.postman_collection.json
```

Inventário das rotas e regras: [`docs/DOCUMENTACAO.md`](../../docs/DOCUMENTACAO.md).
