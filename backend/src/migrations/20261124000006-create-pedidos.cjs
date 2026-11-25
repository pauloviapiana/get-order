'use strict';

/**
 * Sem DELETE de pedido: cancelar via status preserva o histórico (e a comissão gravada).
 * FKs ON DELETE RESTRICT: usuário/reserva com pedidos não podem ser apagados.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedidos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      clienteId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      garcomId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      reservaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'reservas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('aberto', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado'),
        allowNull: false,
        defaultValue: 'aberto',
      },
      valor_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      valor_comissao: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      pago_em: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('pedidos', {
      fields: ['valor_total'],
      type: 'check',
      where: { valor_total: { [Sequelize.Op.gte]: 0 } },
      name: 'pedidos_valor_total_nao_negativo',
    });

    // NULL passa no CHECK do Postgres: só valida quando a comissão estiver preenchida
    await queryInterface.addConstraint('pedidos', {
      fields: ['valor_comissao'],
      type: 'check',
      where: { valor_comissao: { [Sequelize.Op.gte]: 0 } },
      name: 'pedidos_valor_comissao_nao_negativa',
    });

    // Pedido pago sempre tem garçom, comissão e data de pagamento (base do financeiro na Fase 6)
    await queryInterface.sequelize.query(`
      ALTER TABLE pedidos ADD CONSTRAINT pedidos_pago_consistente CHECK (
        status <> 'pago'
        OR ("garcomId" IS NOT NULL AND valor_comissao IS NOT NULL AND pago_em IS NOT NULL)
      );
    `);

    await queryInterface.addIndex('pedidos', ['clienteId']);
    await queryInterface.addIndex('pedidos', ['garcomId']);
    await queryInterface.addIndex('pedidos', ['reservaId']);
    await queryInterface.addIndex('pedidos', ['status']);
    await queryInterface.addIndex('pedidos', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pedidos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pedidos_status";');
  },
};
