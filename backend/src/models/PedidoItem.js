import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PedidoItem = sequelize.define(
  'PedidoItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    pedidoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    itemMenuId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    // Snapshot de itens_menu.preco no momento da adição: mudar o cardápio não altera o histórico
    preco_unitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'pedido_itens',
  }
);

export default PedidoItem;
