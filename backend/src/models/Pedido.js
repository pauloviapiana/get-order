import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const STATUS_PEDIDO = ['aberto', 'em_preparo', 'pronto', 'entregue', 'pago', 'cancelado'];

const Pedido = sequelize.define(
  'Pedido',
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
    // Funcionário que atendeu; obrigatório para ir a `pago`
    garcomId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Compra antecipada: vínculo opcional com uma reserva do mesmo cliente
    reservaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...STATUS_PEDIDO),
      allowNull: false,
      defaultValue: 'aberto',
    },
    // DECIMAL vem do pg como string ("140.00"); contas em centavos (utils/dinheiro.js)
    valor_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: '0.00',
    },
    valor_comissao: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    pago_em: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'pedidos',
  }
);

export default Pedido;
