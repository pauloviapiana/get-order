'use strict';

/**
 * Despesas operacionais (alimentos/insumos). Não entram na base dos 10% do garçom.
 * FK registradoPorId ON DELETE RESTRICT: usuário que registrou compras não pode ser apagado.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('compras', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      descricao: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      valor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      data_compra: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      fornecedor: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      registradoPorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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

    await queryInterface.addConstraint('compras', {
      fields: ['valor'],
      type: 'check',
      where: { valor: { [Sequelize.Op.gte]: 0 } },
      name: 'compras_valor_nao_negativo',
    });

    await queryInterface.addIndex('compras', ['data_compra']);
    await queryInterface.addIndex('compras', ['registradoPorId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('compras');
  },
};
