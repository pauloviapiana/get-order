'use strict';

/**
 * FK categoriaId ON DELETE RESTRICT: categoria com itens não pode ser apagada
 * (desativar via `ativa=false`). Pedidos futuros referenciam itens_menu da mesma forma.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('itens_menu', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      categoriaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'categorias_menu', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      preco: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      disponivel: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addConstraint('itens_menu', {
      fields: ['preco'],
      type: 'check',
      where: { preco: { [Sequelize.Op.gte]: 0 } },
      name: 'itens_menu_preco_nao_negativo',
    });

    await queryInterface.addIndex('itens_menu', ['categoriaId']);
    await queryInterface.addIndex('itens_menu', ['disponivel']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('itens_menu');
  },
};
