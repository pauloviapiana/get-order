# Fase 7 — Erros, CORS e documentação da API

Escopo: contrato de erro previsível, CORS das duas origens e um inventário único da API. Sem feature nova de domínio.

Notas por fase (`FASE2_AUTH.md` … `FASE6_FINANCEIRO.md`) foram mantidas. Este arquivo aponta o que mudou.

---

## Erros

`tratarErros` continua o único formatador: `{ erro }` e, no Zod, `detalhes`. A tradução do Sequelize ficou em `backend/src/utils/errosSequelize.js`.

| Erro | HTTP | Mensagem ao client |
|------|------|--------------------|
| UNIQUE (`email`, `identificacao`, `nome`, ou outro) | 409 | a mensagem já usada na service, ou "Valor já cadastrado" |
| FK de referência ausente (`23503`, `SequelizeForeignKeyConstraintError`) | 409 | "Referência inválida: o recurso relacionado não existe" |
| Vínculo `RESTRICT` ao excluir ou alterar (`23001`; o Sequelize entrega como `DatabaseError`) | 409 | "Não é possível excluir ou alterar: o registro está vinculado a outros dados" |
| `SequelizeValidationError` | 400 | campos agregados, sem texto cru do banco |
| CHECK, NOT NULL e tipo inválido (`23514`, `23502`, `22001`, `22003`, `22P02`, `22007`, `22008`) | 400 | "Dados inválidos para uma restrição do banco" |
| Outro erro de banco (conexão, SQL inesperado) | 500 | "Erro interno do servidor" |

Stack, SQL e nome de constraint não vão na resposta. CHECK e FK são logados no servidor.

As services não ganharam `try/catch`. Elas seguem lançando `HttpErro` (o 409 de e-mail, mesa e categoria nasce aí). O mapeamento entra quando o banco rejeita antes da service — corrida de UNIQUE, ou FK/CHECK que a checagem não cobriu.

## CORS

`CLIENT_ORIGINS` no `.env.example` continua `http://localhost:5173,http://localhost:5174`.

Lista vazia ou contendo `*` encerra o boot com mensagem no console. A demo não sobe com o browser bloqueado em silêncio nem com origem aberta. Postman e `curl` não dependem de CORS; os dois Vite apps dependem dessa lista.

## Documentação

| Artefato | Papel |
|----------|--------|
| [`DOCUMENTACAO.md`](DOCUMENTACAO.md) | inventário único: objetivo, stack, pastas, modelo, segurança, RBAC, todas as rotas `/api`, frontends, seed, decisões |
| [`schema_referencia.sql`](schema_referencia.sql) | CREATE das 8 tabelas + ≥ 3 INSERTs. Didático. Migrations continuam sendo a fonte de verdade |
| [`../backend/postman/README.md`](../backend/postman/README.md) | ordem das 5 coleções |
| [`../backend/postman/Get-Order-API.postman_collection.json`](../backend/postman/Get-Order-API.postman_collection.json) | índice + 409 de unique e 400 de JSON inválido |

## Como validar

Com a API no ar (`npm run dev` em `backend/`, depois do seed):

```powershell
curl.exe -s -w "`nHTTP %{http_code}`n" -X POST http://localhost:3001/api/auth/register -H "Content-Type: application/json" -d "{\"nome\":\"Admin Demo\",\"email\":\"admin@getorder.com\",\"senha\":\"123456\"}"

curl.exe -s -w "`nHTTP %{http_code}`n" -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{"
```

O primeiro deve ser 409 `{ "erro": "E-mail já cadastrado" }`. O segundo, 400 com `{ "erro": ... }` e sem SQL.

FK e CHECK reais ficam em `backend/src/utils/errosSequelize.js`. A service já responde 404/400 antes do `INSERT` nesses casos; o mapeamento é a rede de segurança (exercida em transação com rollback, sem gravar). O README, seção "Erros e docs", tem os dois `curl` acima.
