import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Compra = sequelize.define(
  'Compra',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    // DECIMAL vem do pg como string ("85.50"); somas em centavos (utils/dinheiro.js)
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    data_compra: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fornecedor: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    // Admin que registrou: sempre o usuário autenticado, nunca o corpo da requisição
    registradoPorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: 'compras',
  }
);

export default Compra;
