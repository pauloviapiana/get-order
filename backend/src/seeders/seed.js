/**
 * Seed de demonstração — Fase 2 (usuários) + Fase 3 (mesas e reservas) + Fase 4 (cardápio)
 * + Fase 5 (pedidos) + Fase 6 (compras).
 *
 * Uso (dentro de backend/, depois de `npx sequelize-cli db:migrate`):
 *   npm run seed
 *
 * Reexecutável: `findOrCreate` não duplica nem sobrescreve registros.
 * - usuários: chave e-mail
 * - mesas: chave identificacao
 * - reservas: chave cliente + mesa + observacoes (texto fixo "[seed] ..."),
 *   então datas calculadas na 1ª execução são mantidas nas seguintes.
 * - categorias do cardápio: chave nome
 * - itens do cardápio: chave categoria + nome
 * - pedidos: chave cliente + reserva seed vinculada (ou cliente sem reserva, para Carla);
 *   itens com preço snapshot do cardápio na 1ª execução
 * - compras: chave admin + descricao (texto fixo "[seed] ..."); data relativa a hoje
 *   calculada só na 1ª execução
 */
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import {
  CategoriaMenu,
  Compra,
  ItemMenu,
  Mesa,
  Pedido,
  PedidoItem,
  Reserva,
  sequelize,
  Usuario,
} from '../models/index.js';
import { agoraNoRestaurante, STATUS_QUE_BLOQUEIAM } from '../services/regrasReserva.js';
import { comissaoCentavos, deCentavos, paraCentavos } from '../utils/dinheiro.js';

const SALT_ROUNDS = 10;
const SENHA_DEMO = '123456';

const usuariosDemo = [
  { nome: 'Admin Demo', email: 'admin@getorder.com', perfil: 'admin', telefone: '(11) 90000-0001' },
  { nome: 'Fernanda Garçom', email: 'funcionario1@getorder.com', perfil: 'funcionario', telefone: '(11) 90000-0002' },
  { nome: 'Gustavo Garçom', email: 'funcionario2@getorder.com', perfil: 'funcionario', telefone: '(11) 90000-0003' },
  { nome: 'Ana Cliente', email: 'cliente1@getorder.com', perfil: 'cliente', telefone: '(11) 98888-0001' },
  { nome: 'Bruno Cliente', email: 'cliente2@getorder.com', perfil: 'cliente', telefone: '(11) 98888-0002' },
  { nome: 'Carla Cliente', email: 'cliente3@getorder.com', perfil: 'cliente', telefone: null },
];

const mesasDemo = [
  { identificacao: 'M1', capacidade: 2, ativa: true },
  { identificacao: 'M2', capacidade: 2, ativa: true },
  { identificacao: 'M3', capacidade: 4, ativa: true },
  { identificacao: 'M4', capacidade: 4, ativa: true },
  { identificacao: 'M5', capacidade: 6, ativa: true },
  { identificacao: 'M6', capacidade: 6, ativa: true },
  { identificacao: 'M7', capacidade: 4, ativa: false },
];

const SEXTA = 5;
const SABADO = 6;
const DOMINGO = 0;

function somarDias(data, dias) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Próxima ocorrência do dia da semana, sempre depois de hoje (fuso do restaurante). */
function proximo(diaSemana) {
  const hoje = agoraNoRestaurante().data;
  for (let i = 1; i <= 7; i += 1) {
    const data = somarDias(hoje, i);
    if (new Date(`${data}T12:00:00Z`).getUTCDay() === diaSemana) return data;
  }
  return null;
}

// `dataReserva` é avaliado só quando a reserva ainda não existe
const reservasDemo = [
  { cliente: 'cliente1@getorder.com', mesa: 'M3', dataReserva: () => proximo(SEXTA), horario: '19:00', quantidade_pessoas: 3, status: 'pendente', observacoes: '[seed] Jantar em família' },
  { cliente: 'cliente2@getorder.com', mesa: 'M5', dataReserva: () => proximo(SABADO), horario: '20:30', quantidade_pessoas: 6, status: 'confirmada', observacoes: '[seed] Aniversário' },
  { cliente: 'cliente3@getorder.com', mesa: 'M1', dataReserva: () => proximo(DOMINGO), horario: '18:30', quantidade_pessoas: 2, status: 'cancelada', observacoes: '[seed] Cancelada pela cliente' },
  { cliente: 'cliente1@getorder.com', mesa: 'M4', dataReserva: () => somarDias(proximo(SABADO), -7), horario: '21:00', quantidade_pessoas: 4, status: 'concluida', observacoes: '[seed] Histórico (sábado passado)' },
];

const categoriasDemo = [
  { nome: 'Entradas', ativa: true },
  { nome: 'Pratos principais', ativa: true },
  { nome: 'Bebidas', ativa: true },
  { nome: 'Sobremesas', ativa: true },
  { nome: 'Especiais de inverno', ativa: false },
];

const itensDemo = [
  { categoria: 'Entradas', nome: 'Bruschetta de tomate', descricao: 'Pão italiano, tomate, manjericão e azeite', preco: '24.90', disponivel: true },
  { categoria: 'Entradas', nome: 'Bolinho de bacalhau', descricao: '6 unidades', preco: '32.00', disponivel: true },
  { categoria: 'Pratos principais', nome: 'Risoto de cogumelos', descricao: 'Arbóreo, shiitake e parmesão', preco: '58.00', disponivel: true },
  { categoria: 'Pratos principais', nome: 'Filé à parmegiana', descricao: 'Acompanha arroz e fritas', preco: '64.50', disponivel: true },
  { categoria: 'Pratos principais', nome: 'Moqueca de peixe', descricao: 'Serve 2 pessoas', preco: '119.90', disponivel: false },
  { categoria: 'Bebidas', nome: 'Suco natural de laranja', descricao: null, preco: '12.00', disponivel: true },
  { categoria: 'Bebidas', nome: 'Água mineral', descricao: '500 ml', preco: '6.00', disponivel: true },
  { categoria: 'Sobremesas', nome: 'Petit gâteau', descricao: 'Com sorvete de creme', preco: '29.90', disponivel: true },
  { categoria: 'Especiais de inverno', nome: 'Fondue de queijo', descricao: 'Serve 2 pessoas', preco: '98.00', disponivel: true },
];

// `reserva` = observacoes da reserva seed vinculada (compra antecipada); null = sem reserva
const pedidosDemo = [
  {
    cliente: 'cliente1@getorder.com',
    reserva: '[seed] Jantar em família',
    status: 'aberto',
    garcom: null,
    itens: [['Risoto de cogumelos', 2], ['Suco natural de laranja', 2]],
  },
  {
    cliente: 'cliente2@getorder.com',
    reserva: '[seed] Aniversário',
    status: 'entregue',
    garcom: 'funcionario1@getorder.com',
    itens: [['Bruschetta de tomate', 1], ['Filé à parmegiana', 3], ['Água mineral', 6]],
  },
  {
    cliente: 'cliente3@getorder.com',
    reserva: null,
    status: 'em_preparo',
    garcom: null,
    itens: [['Bruschetta de tomate', 2]],
  },
  {
    cliente: 'cliente1@getorder.com',
    reserva: '[seed] Histórico (sábado passado)',
    status: 'pago',
    garcom: 'funcionario2@getorder.com',
    itens: [['Bolinho de bacalhau', 1], ['Petit gâteau', 2]],
  },
];

// `diasAtras` é avaliado só quando a compra ainda não existe
const comprasDemo = [
  { descricao: '[seed] Caixa de tomate italiano (20 kg)', valor: '85.50', diasAtras: 1, fornecedor: 'Hortifruti Central' },
  { descricao: '[seed] Carnes para a semana (filé e frango)', valor: '420.00', diasAtras: 3, fornecedor: 'Frigorífico Boa Carne' },
  { descricao: '[seed] Bebidas (água, laranja para suco)', valor: '189.90', diasAtras: 5, fornecedor: 'Distribuidora Rio Claro' },
  { descricao: '[seed] Botijão de gás P45', valor: '130.00', diasAtras: 12, fornecedor: null },
];

async function semearUsuarios(t) {
  const senhaHash = await bcrypt.hash(SENHA_DEMO, SALT_ROUNDS);
  console.log('Semeando usuários...');

  for (const dados of usuariosDemo) {
    const [usuario, criado] = await Usuario.findOrCreate({
      where: { email: dados.email },
      defaults: { ...dados, senha: senhaHash, ativo: true },
      transaction: t,
    });

    console.log(`  ${criado ? 'criado' : 'já existia'}: ${usuario.email} (${usuario.perfil})`);
  }
}

async function semearMesas(t) {
  console.log('Semeando mesas...');

  for (const dados of mesasDemo) {
    const [mesa, criada] = await Mesa.findOrCreate({
      where: { identificacao: dados.identificacao },
      defaults: dados,
      transaction: t,
    });

    console.log(
      `  ${criada ? 'criada' : 'já existia'}: ${mesa.identificacao} (${mesa.capacidade} lugares${mesa.ativa ? '' : ', inativa'})`
    );
  }
}

async function semearReservas(t) {
  console.log('Semeando reservas...');

  for (const dados of reservasDemo) {
    const cliente = await Usuario.findOne({ where: { email: dados.cliente }, transaction: t });
    const mesa = await Mesa.findOne({ where: { identificacao: dados.mesa }, transaction: t });
    const chave = { clienteId: cliente.id, mesaId: mesa.id, observacoes: dados.observacoes };

    const existente = await Reserva.findOne({ where: chave, transaction: t });
    if (existente) {
      console.log(`  já existia: #${existente.id} ${mesa.identificacao} ${existente.data_reserva} ${existente.horario} (${existente.status})`);
      continue;
    }

    const alocacao = { mesaId: mesa.id, data_reserva: dados.dataReserva(), horario: dados.horario };

    // Seed não passa pelo service: evita gravar reserva ativa em slot já ocupado
    if (STATUS_QUE_BLOQUEIAM.includes(dados.status)) {
      const conflito = await Reserva.findOne({
        where: { ...alocacao, status: { [Op.in]: STATUS_QUE_BLOQUEIAM } },
        transaction: t,
      });

      if (conflito) {
        console.log(`  ignorada (slot ocupado): ${mesa.identificacao} ${alocacao.data_reserva} ${alocacao.horario}`);
        continue;
      }
    }

    const reserva = await Reserva.create(
      { ...chave, ...alocacao, quantidade_pessoas: dados.quantidade_pessoas, status: dados.status },
      { transaction: t }
    );

    console.log(`  criada: #${reserva.id} ${mesa.identificacao} ${reserva.data_reserva} ${reserva.horario} (${reserva.status})`);
  }
}

async function semearCardapio(t) {
  console.log('Semeando cardápio...');
  const categoriaPorNome = {};

  for (const dados of categoriasDemo) {
    const [categoria, criada] = await CategoriaMenu.findOrCreate({
      where: { nome: dados.nome },
      defaults: dados,
      transaction: t,
    });

    categoriaPorNome[categoria.nome] = categoria;
    console.log(`  ${criada ? 'criada' : 'já existia'}: categoria ${categoria.nome}${categoria.ativa ? '' : ' (inativa)'}`);
  }

  for (const { categoria, ...dados } of itensDemo) {
    const categoriaId = categoriaPorNome[categoria].id;
    const [item, criado] = await ItemMenu.findOrCreate({
      where: { categoriaId, nome: dados.nome },
      defaults: { ...dados, categoriaId },
      transaction: t,
    });

    console.log(`  ${criado ? 'criado' : 'já existia'}: ${item.nome} R$ ${item.preco}${item.disponivel ? '' : ' (indisponível)'}`);
  }
}

async function semearPedidos(t) {
  console.log('Semeando pedidos...');

  for (const dados of pedidosDemo) {
    const cliente = await Usuario.findOne({ where: { email: dados.cliente }, transaction: t });
    let reserva = null;

    if (dados.reserva) {
      reserva = await Reserva.findOne({
        where: { clienteId: cliente.id, observacoes: dados.reserva },
        transaction: t,
      });

      if (!reserva) {
        console.log(`  ignorado (reserva "${dados.reserva}" não existe): pedido de ${cliente.email}`);
        continue;
      }
    }

    const chave = { clienteId: cliente.id, reservaId: reserva?.id ?? null };
    const existente = await Pedido.findOne({ where: chave, transaction: t });
    if (existente) {
      console.log(`  já existia: pedido #${existente.id} de ${cliente.email} (${existente.status})`);
      continue;
    }

    // Seed não passa pelo service: preço snapshot e totais calculados aqui, em centavos
    const linhas = [];
    for (const [nome, quantidade] of dados.itens) {
      const item = await ItemMenu.findOne({ where: { nome }, order: [['id', 'ASC']], transaction: t });
      linhas.push({
        itemMenuId: item.id,
        quantidade,
        preco_unitario: item.preco,
        subtotal: quantidade * paraCentavos(item.preco),
      });
    }

    const total = linhas.reduce((soma, linha) => soma + linha.subtotal, 0);
    const garcom = dados.garcom
      ? await Usuario.findOne({ where: { email: dados.garcom }, transaction: t })
      : null;
    const pago = dados.status === 'pago';

    const pedido = await Pedido.create(
      {
        ...chave,
        garcomId: garcom?.id ?? null,
        status: dados.status,
        valor_total: deCentavos(total),
        valor_comissao: pago ? deCentavos(comissaoCentavos(total)) : null,
        // Pedido histórico: pago na noite da reserva concluída
        pago_em: pago ? new Date(`${reserva.data_reserva}T23:00:00-03:00`) : null,
      },
      { transaction: t }
    );

    await PedidoItem.bulkCreate(
      linhas.map((linha) => ({ ...linha, pedidoId: pedido.id, subtotal: deCentavos(linha.subtotal) })),
      { transaction: t }
    );

    console.log(
      `  criado: pedido #${pedido.id} de ${cliente.email} (${pedido.status}) R$ ${pedido.valor_total}` +
        (pago ? `, comissão R$ ${pedido.valor_comissao}` : '')
    );
  }
}

async function semearCompras(t) {
  console.log('Semeando compras...');
  const admin = await Usuario.findOne({ where: { email: 'admin@getorder.com' }, transaction: t });
  const hoje = agoraNoRestaurante().data;

  for (const { diasAtras, ...dados } of comprasDemo) {
    const [compra, criada] = await Compra.findOrCreate({
      where: { registradoPorId: admin.id, descricao: dados.descricao },
      defaults: { ...dados, registradoPorId: admin.id, data_compra: somarDias(hoje, -diasAtras) },
      transaction: t,
    });

    console.log(`  ${criada ? 'criada' : 'já existia'}: #${compra.id} ${compra.data_compra} R$ ${compra.valor} ${compra.descricao}`);
  }
}

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco OK.');

    await sequelize.transaction(async (t) => {
      await semearUsuarios(t);
      await semearMesas(t);
      await semearReservas(t);
      await semearCardapio(t);
      await semearPedidos(t);
      await semearCompras(t);
    });

    console.log(`Seed finalizado. Senha demo de todos: ${SENHA_DEMO}`);
  } catch (error) {
    console.error('Falha no seed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seed();
