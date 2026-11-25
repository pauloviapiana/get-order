import sequelize from '../config/database.js';
import CategoriaMenu from './CategoriaMenu.js';
import ItemMenu from './ItemMenu.js';
import Mesa from './Mesa.js';
import Pedido from './Pedido.js';
import PedidoItem from './PedidoItem.js';
import Reserva from './Reserva.js';
import Usuario from './Usuario.js';

Usuario.hasMany(Reserva, { foreignKey: 'clienteId', as: 'reservas' });
Mesa.hasMany(Reserva, { foreignKey: 'mesaId', as: 'reservas' });
Reserva.belongsTo(Usuario, { foreignKey: 'clienteId', as: 'cliente' });
Reserva.belongsTo(Mesa, { foreignKey: 'mesaId', as: 'mesa' });

CategoriaMenu.hasMany(ItemMenu, { foreignKey: 'categoriaId', as: 'itens' });
ItemMenu.belongsTo(CategoriaMenu, { foreignKey: 'categoriaId', as: 'categoria' });

Usuario.hasMany(Pedido, { foreignKey: 'clienteId', as: 'pedidos' });
Usuario.hasMany(Pedido, { foreignKey: 'garcomId', as: 'atendimentos' });
Reserva.hasMany(Pedido, { foreignKey: 'reservaId', as: 'pedidos' });
Pedido.belongsTo(Usuario, { foreignKey: 'clienteId', as: 'cliente' });
Pedido.belongsTo(Usuario, { foreignKey: 'garcomId', as: 'garcom' });
Pedido.belongsTo(Reserva, { foreignKey: 'reservaId', as: 'reserva' });

Pedido.hasMany(PedidoItem, { foreignKey: 'pedidoId', as: 'itens' });
PedidoItem.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });
ItemMenu.hasMany(PedidoItem, { foreignKey: 'itemMenuId', as: 'pedidoItens' });
PedidoItem.belongsTo(ItemMenu, { foreignKey: 'itemMenuId', as: 'item' });

// Compras (financeiro) entram na Fase 6.

export { sequelize, CategoriaMenu, ItemMenu, Mesa, Pedido, PedidoItem, Reserva, Usuario };
