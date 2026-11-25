import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Mesa = sequelize.define(
  'Mesa',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    identificacao: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
    },
    capacidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'mesas',
  }
);

export default Mesa;
