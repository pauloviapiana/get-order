'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nome: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(160),
        allowNull: false,
        unique: true,
      },
      senha: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      telefone: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      perfil: {
        type: Sequelize.ENUM('admin', 'funcionario', 'cliente'),
        allowNull: false,
      },
      ativo: {
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

    await queryInterface.addIndex('usuarios', ['perfil']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_usuarios_perfil";');
  },
};
