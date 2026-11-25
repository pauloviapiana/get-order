'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mesas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      identificacao: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
      },
      capacidade: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ativa: {
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

    await queryInterface.addConstraint('mesas', {
      fields: ['capacidade'],
      type: 'check',
      where: { capacidade: { [Sequelize.Op.gt]: 0 } },
      name: 'mesas_capacidade_positiva',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mesas');
  },
};
