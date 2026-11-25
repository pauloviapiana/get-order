'use strict';

/**
 * Sem UNIQUE(mesaId, data_reserva, horario): reservas canceladas/concluídas liberam o slot.
 * O conflito entre pendente/confirmada é checado no reservaService, em transação.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reservas', {
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
      mesaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'mesas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      data_reserva: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      horario: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      quantidade_pessoas: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pendente', 'confirmada', 'cancelada', 'concluida'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      observacoes: {
        type: Sequelize.TEXT,
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

    await queryInterface.addConstraint('reservas', {
      fields: ['quantidade_pessoas'],
      type: 'check',
      where: { quantidade_pessoas: { [Sequelize.Op.gt]: 0 } },
      name: 'reservas_quantidade_pessoas_positiva',
    });

    await queryInterface.addIndex('reservas', ['data_reserva', 'horario']);
    await queryInterface.addIndex('reservas', ['mesaId', 'data_reserva', 'horario']);
    await queryInterface.addIndex('reservas', ['clienteId']);
    await queryInterface.addIndex('reservas', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reservas');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_reservas_status";');
  },
};
