'use strict';

/**
 * Sem UNIQUE(pedidoId, itemMenuId): o pedidoService soma a quantidade quando o mesmo
 * item é adicionado de novo. `preco_unitario` é o snapshot de itens_menu.preco.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pedido_itens', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      pedidoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'pedidos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      itemMenuId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'itens_menu', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantidade: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      preco_unitario: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
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

    await queryInterface.addConstraint('pedido_itens', {
      fields: ['quantidade'],
      type: 'check',
      where: { quantidade: { [Sequelize.Op.gt]: 0 } },
      name: 'pedido_itens_quantidade_positiva',
    });

    await queryInterface.addConstraint('pedido_itens', {
      fields: ['preco_unitario'],
      type: 'check',
      where: { preco_unitario: { [Sequelize.Op.gte]: 0 } },
      name: 'pedido_itens_preco_unitario_nao_negativo',
    });

    await queryInterface.addConstraint('pedido_itens', {
      fields: ['subtotal'],
      type: 'check',
      where: { subtotal: { [Sequelize.Op.gte]: 0 } },
      name: 'pedido_itens_subtotal_nao_negativo',
    });

    await queryInterface.addIndex('pedido_itens', ['pedidoId']);
    await queryInterface.addIndex('pedido_itens', ['itemMenuId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pedido_itens');
  },
};
