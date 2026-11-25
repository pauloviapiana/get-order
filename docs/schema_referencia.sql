-- =============================================================================
-- get-order — Script SQL de REFERÊNCIA (entrega didática)
-- =============================================================================
-- Este arquivo NÃO é a fonte de verdade do projeto.
--
-- Fonte de verdade (o que o app realmente usa):
--   backend/src/migrations/*.cjs  → aplicadas com Sequelize CLI
--   backend: npm run seed         → dados com bcrypt real (caminho oficial)
--
-- Como aplicar o schema de verdade:
--   cd backend
--   npx sequelize-cli db:migrate
--   npm run seed
--
-- Este script existe para:
--   - mostrar o modelo em SQL PostgreSQL (9 tabelas: 8 de domínio + refresh_tokens)
--   - cumprir a entrega didática (≥ 3 registros de exemplo por tabela)
--   - apoiar a apresentação junto de docs/DOCUMENTACAO.md e docs/DER.md
--
-- NÃO rode este arquivo em cima de um banco já migrado ou semeado:
--   os CREATE falham se as tabelas existem, e os INSERT pressupõem
--   tabelas vazias (ids 1, 2, 3 na ordem abaixo).
--
-- Ordem (respeita FKs), a mesma das migrations:
--   1) usuarios
--   2) mesas
--   3) reservas          (FK → usuarios, mesas)
--   4) categorias_menu
--   5) itens_menu        (FK → categorias_menu)
--   6) pedidos           (FK → usuarios, usuarios, reservas)
--   7) pedido_itens      (FK → pedidos, itens_menu)
--   8) compras           (FK → usuarios)
--   9) refresh_tokens    (FK → usuarios; sessão renovável)
--
-- Colunas camelCase ("clienteId", "createdAt", …) ficam entre aspas duplas,
-- como o Sequelize cria no PostgreSQL. Snake_case (data_reserva, valor_total)
-- segue o nome da migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) usuarios
-- ---------------------------------------------------------------------------
CREATE TYPE "enum_usuarios_perfil" AS ENUM ('admin', 'funcionario', 'cliente');

CREATE TABLE "usuarios" (
  "id" SERIAL PRIMARY KEY,
  "nome" VARCHAR(120) NOT NULL,
  "email" VARCHAR(160) NOT NULL UNIQUE,
  "senha" VARCHAR(255) NOT NULL,
  "telefone" VARCHAR(30) NULL,
  "perfil" "enum_usuarios_perfil" NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "usuarios_perfil" ON "usuarios" ("perfil");

-- ---------------------------------------------------------------------------
-- 2) mesas
-- ---------------------------------------------------------------------------
CREATE TABLE "mesas" (
  "id" SERIAL PRIMARY KEY,
  "identificacao" VARCHAR(40) NOT NULL UNIQUE,
  "capacidade" INTEGER NOT NULL,
  "ativa" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT mesas_capacidade_positiva CHECK ("capacidade" > 0)
);

-- ---------------------------------------------------------------------------
-- 3) reservas
-- Sem UNIQUE (mesa, data, horário): cancelada/concluída liberam o slot.
-- O conflito entre pendente/confirmada é regra da reservaService.
-- ---------------------------------------------------------------------------
CREATE TYPE "enum_reservas_status" AS ENUM (
  'pendente',
  'confirmada',
  'cancelada',
  'concluida'
);

CREATE TABLE "reservas" (
  "id" SERIAL PRIMARY KEY,
  "clienteId" INTEGER NOT NULL
    REFERENCES "usuarios" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "mesaId" INTEGER NOT NULL
    REFERENCES "mesas" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "data_reserva" DATE NOT NULL,
  "horario" VARCHAR(5) NOT NULL,
  "quantidade_pessoas" INTEGER NOT NULL,
  "status" "enum_reservas_status" NOT NULL DEFAULT 'pendente',
  "observacoes" TEXT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT reservas_quantidade_pessoas_positiva CHECK ("quantidade_pessoas" > 0)
);

CREATE INDEX "reservas_data_reserva_horario" ON "reservas" ("data_reserva", "horario");
CREATE INDEX "reservas_mesa_data_horario" ON "reservas" ("mesaId", "data_reserva", "horario");
CREATE INDEX "reservas_cliente_id" ON "reservas" ("clienteId");
CREATE INDEX "reservas_status" ON "reservas" ("status");

-- ---------------------------------------------------------------------------
-- 4) categorias_menu
-- ---------------------------------------------------------------------------
CREATE TABLE "categorias_menu" (
  "id" SERIAL PRIMARY KEY,
  "nome" VARCHAR(80) NOT NULL UNIQUE,
  "ativa" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5) itens_menu
-- ---------------------------------------------------------------------------
CREATE TABLE "itens_menu" (
  "id" SERIAL PRIMARY KEY,
  "categoriaId" INTEGER NOT NULL
    REFERENCES "categorias_menu" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "nome" VARCHAR(120) NOT NULL,
  "descricao" TEXT NULL,
  "preco" DECIMAL(10, 2) NOT NULL,
  "disponivel" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT itens_menu_preco_nao_negativo CHECK ("preco" >= 0)
);

CREATE INDEX "itens_menu_categoria_id" ON "itens_menu" ("categoriaId");
CREATE INDEX "itens_menu_disponivel" ON "itens_menu" ("disponivel");

-- ---------------------------------------------------------------------------
-- 6) pedidos
-- ---------------------------------------------------------------------------
CREATE TYPE "enum_pedidos_status" AS ENUM (
  'aberto',
  'em_preparo',
  'pronto',
  'entregue',
  'pago',
  'cancelado'
);

CREATE TABLE "pedidos" (
  "id" SERIAL PRIMARY KEY,
  "clienteId" INTEGER NOT NULL
    REFERENCES "usuarios" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "garcomId" INTEGER NULL
    REFERENCES "usuarios" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "reservaId" INTEGER NULL
    REFERENCES "reservas" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "status" "enum_pedidos_status" NOT NULL DEFAULT 'aberto',
  "valor_total" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "valor_comissao" DECIMAL(10, 2) NULL,
  "pago_em" TIMESTAMP WITH TIME ZONE NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT pedidos_valor_total_nao_negativo CHECK ("valor_total" >= 0),
  CONSTRAINT pedidos_valor_comissao_nao_negativa CHECK ("valor_comissao" >= 0),
  CONSTRAINT pedidos_pago_consistente CHECK (
    status <> 'pago'
    OR ("garcomId" IS NOT NULL AND valor_comissao IS NOT NULL AND pago_em IS NOT NULL)
  )
);

CREATE INDEX "pedidos_cliente_id" ON "pedidos" ("clienteId");
CREATE INDEX "pedidos_garcom_id" ON "pedidos" ("garcomId");
CREATE INDEX "pedidos_reserva_id" ON "pedidos" ("reservaId");
CREATE INDEX "pedidos_status" ON "pedidos" ("status");
CREATE INDEX "pedidos_created_at" ON "pedidos" ("createdAt");

-- ---------------------------------------------------------------------------
-- 7) pedido_itens
-- Sem UNIQUE (pedido, item): a service soma a quantidade se o item se repete.
-- preco_unitario é o snapshot de itens_menu.preco no momento do pedido.
-- ---------------------------------------------------------------------------
CREATE TABLE "pedido_itens" (
  "id" SERIAL PRIMARY KEY,
  "pedidoId" INTEGER NOT NULL
    REFERENCES "pedidos" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "itemMenuId" INTEGER NOT NULL
    REFERENCES "itens_menu" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "quantidade" INTEGER NOT NULL,
  "preco_unitario" DECIMAL(10, 2) NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT pedido_itens_quantidade_positiva CHECK ("quantidade" > 0),
  CONSTRAINT pedido_itens_preco_unitario_nao_negativo CHECK ("preco_unitario" >= 0),
  CONSTRAINT pedido_itens_subtotal_nao_negativo CHECK ("subtotal" >= 0)
);

CREATE INDEX "pedido_itens_pedido_id" ON "pedido_itens" ("pedidoId");
CREATE INDEX "pedido_itens_item_menu_id" ON "pedido_itens" ("itemMenuId");

-- ---------------------------------------------------------------------------
-- 8) compras
-- ---------------------------------------------------------------------------
CREATE TABLE "compras" (
  "id" SERIAL PRIMARY KEY,
  "descricao" VARCHAR(255) NOT NULL,
  "valor" DECIMAL(10, 2) NOT NULL,
  "data_compra" DATE NOT NULL,
  "fornecedor" VARCHAR(120) NULL,
  "registradoPorId" INTEGER NOT NULL
    REFERENCES "usuarios" ("id")
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT compras_valor_nao_negativo CHECK ("valor" >= 0)
);

CREATE INDEX "compras_data_compra" ON "compras" ("data_compra");
CREATE INDEX "compras_registrado_por_id" ON "compras" ("registradoPorId");

-- ---------------------------------------------------------------------------
-- 9) refresh_tokens
-- tokenHash = SHA-256 hex (64 chars) do refresh opaco; o valor em claro nunca
-- fica no banco. Rotação: token antigo recebe revokedAt em /auth/refresh.
-- ---------------------------------------------------------------------------
CREATE TABLE "refresh_tokens" (
  "id" SERIAL PRIMARY KEY,
  "usuarioId" INTEGER NOT NULL
    REFERENCES "usuarios" ("id")
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  "tokenHash" VARCHAR(64) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "revokedAt" TIMESTAMP WITH TIME ZONE NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX "refresh_tokens_usuario_id" ON "refresh_tokens" ("usuarioId");
CREATE INDEX "refresh_tokens_expires_at" ON "refresh_tokens" ("expiresAt");

-- =============================================================================
-- DADOS DE EXEMPLO (≥ 3 registros por tabela)
-- =============================================================================
-- Amostra mínima e legível. O seed Node grava mais linhas (6 usuários, 7 mesas,
-- 4 reservas, 5 categorias, 9 itens, 4 pedidos, 4 compras) e recalcula datas.
-- refresh_tokens só nascem no login real; abaixo há 3 hashes fictícios didáticos.
--
-- SENHAS (usuarios."senha"):
--   O banco guarda HASH bcrypt, nunca "123456" em texto puro.
--   O hash abaixo corresponde à senha de demonstração 123456.
--   O caminho oficial continua sendo `npm run seed`.
--
-- Datas de reserva: 2026-11-27 (sexta), 2026-11-28 (sábado), 2026-11-29 (domingo).
-- IDs 1, 2, 3 abaixo só valem com as tabelas vazias, nesta ordem de INSERT.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- usuarios (3)
-- ---------------------------------------------------------------------------
INSERT INTO "usuarios" ("nome", "email", "senha", "telefone", "perfil", "ativo", "createdAt", "updatedAt")
VALUES
  (
    'Admin Demo',
    'admin@getorder.com',
    '$2b$10$BbIvG6liyWzkKhitd0P4UO2Vzz1QGea7V5ALsCzH4rQ1tqTCsExlS',
    '(11) 90000-0001',
    'admin',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'Fernanda Garçom',
    'funcionario1@getorder.com',
    '$2b$10$BbIvG6liyWzkKhitd0P4UO2Vzz1QGea7V5ALsCzH4rQ1tqTCsExlS',
    '(11) 90000-0002',
    'funcionario',
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'Ana Cliente',
    'cliente1@getorder.com',
    '$2b$10$BbIvG6liyWzkKhitd0P4UO2Vzz1QGea7V5ALsCzH4rQ1tqTCsExlS',
    '(11) 98888-0001',
    'cliente',
    TRUE,
    NOW(),
    NOW()
  );

-- ---------------------------------------------------------------------------
-- mesas (3)
-- ---------------------------------------------------------------------------
INSERT INTO "mesas" ("identificacao", "capacidade", "ativa", "createdAt", "updatedAt")
VALUES
  ('M1', 2, TRUE, NOW(), NOW()),
  ('M2', 4, TRUE, NOW(), NOW()),
  ('M3', 6, TRUE, NOW(), NOW());

-- ---------------------------------------------------------------------------
-- reservas (3) — cliente 3 (Ana); mesas 1, 2 e 3
-- ---------------------------------------------------------------------------
INSERT INTO "reservas" (
  "clienteId", "mesaId", "data_reserva", "horario", "quantidade_pessoas",
  "status", "observacoes", "createdAt", "updatedAt"
)
VALUES
  (3, 1, '2026-11-27', '19:00', 2, 'pendente',  '[ref] Sexta M1',  NOW(), NOW()),
  (3, 2, '2026-11-28', '20:00', 4, 'confirmada', '[ref] Sábado M2', NOW(), NOW()),
  (3, 3, '2026-11-29', '21:00', 3, 'concluida',  '[ref] Domingo M3', NOW(), NOW());

-- ---------------------------------------------------------------------------
-- categorias_menu (3)
-- ---------------------------------------------------------------------------
INSERT INTO "categorias_menu" ("nome", "ativa", "createdAt", "updatedAt")
VALUES
  ('Entradas', TRUE, NOW(), NOW()),
  ('Pratos principais', TRUE, NOW(), NOW()),
  ('Bebidas', TRUE, NOW(), NOW());

-- ---------------------------------------------------------------------------
-- itens_menu (3)
-- ---------------------------------------------------------------------------
INSERT INTO "itens_menu" (
  "categoriaId", "nome", "descricao", "preco", "disponivel", "createdAt", "updatedAt"
)
VALUES
  (1, 'Bruschetta de tomate', 'Pão italiano, tomate, manjericão e azeite', 24.90, TRUE, NOW(), NOW()),
  (2, 'Filé à parmegiana', 'Acompanha arroz e fritas', 64.50, TRUE, NOW(), NOW()),
  (3, 'Suco natural de laranja', NULL, 12.00, TRUE, NOW(), NOW());

-- ---------------------------------------------------------------------------
-- pedidos (3)
-- 1 aberto, ligado à reserva pendente, sem garçom
-- 2 entregue, com garçom, ainda sem comissão
-- 3 pago: garçom + comissão 10% + pago_em (CHECK pedidos_pago_consistente)
-- ---------------------------------------------------------------------------
INSERT INTO "pedidos" (
  "clienteId", "garcomId", "reservaId", "status",
  "valor_total", "valor_comissao", "pago_em", "createdAt", "updatedAt"
)
VALUES
  (3, NULL, 1, 'aberto',   24.90, NULL, NULL, NOW(), NOW()),
  (3, 2,    NULL, 'entregue', 64.50, NULL, NULL, NOW(), NOW()),
  (
    3,
    2,
    NULL,
    'pago',
    24.00,
    2.40,
    '2026-11-21 22:10:00-03',
    NOW(),
    NOW()
  );

-- ---------------------------------------------------------------------------
-- pedido_itens (3) — um por pedido; subtotal = quantidade * preco_unitario
-- ---------------------------------------------------------------------------
INSERT INTO "pedido_itens" (
  "pedidoId", "itemMenuId", "quantidade", "preco_unitario", "subtotal", "createdAt", "updatedAt"
)
VALUES
  (1, 1, 1, 24.90, 24.90, NOW(), NOW()),
  (2, 2, 1, 64.50, 64.50, NOW(), NOW()),
  (3, 3, 2, 12.00, 24.00, NOW(), NOW());

-- ---------------------------------------------------------------------------
-- compras (3) — registradas pelo admin (id 1); não entram na base dos 10%
-- ---------------------------------------------------------------------------
INSERT INTO "compras" (
  "descricao", "valor", "data_compra", "fornecedor", "registradoPorId", "createdAt", "updatedAt"
)
VALUES
  ('[ref] Caixa de tomate italiano (20 kg)', 85.50,  '2026-11-23', 'Hortifruti Central', 1, NOW(), NOW()),
  ('[ref] Carnes para a semana',             420.00, '2026-11-21', 'Frigorífico Boa Carne', 1, NOW(), NOW()),
  ('[ref] Botijão de gás P45',               130.00, '2026-11-12', NULL, 1, NOW(), NOW());

-- ---------------------------------------------------------------------------
-- refresh_tokens (3) — hashes SHA-256 fictícios (64 hex); não são tokens reais
-- ---------------------------------------------------------------------------
INSERT INTO "refresh_tokens" (
  "usuarioId", "tokenHash", "expiresAt", "revokedAt", "createdAt", "updatedAt"
)
VALUES
  (
    1,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    NOW() + INTERVAL '7 days',
    NULL,
    NOW(),
    NOW()
  ),
  (
    2,
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    NOW() + INTERVAL '7 days',
    NULL,
    NOW(),
    NOW()
  ),
  (
    3,
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '1 day'
  );
