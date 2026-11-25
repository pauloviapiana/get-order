import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const STATUS_RESERVA = ['pendente', 'confirmada', 'cancelada', 'concluida'];

const Reserva = sequelize.define(
  'Reserva',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mesaId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data_reserva: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    // "HH:MM" de HORARIOS_RESERVA (services/regrasReserva.js)
    horario: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
    quantidade_pessoas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    status: {
      type: DataTypes.ENUM(...STATUS_RESERVA),
      allowNull: false,
      defaultValue: 'pendente',
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'reservas',
  }
);

export default Reserva;
