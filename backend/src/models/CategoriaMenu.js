import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CategoriaMenu = sequelize.define(
  'CategoriaMenu',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    ativa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'categorias_menu',
  }
);

export default CategoriaMenu;
