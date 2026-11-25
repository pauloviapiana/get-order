import sequelize from '../config/database.js';
import CategoriaMenu from './CategoriaMenu.js';
import ItemMenu from './ItemMenu.js';
import Mesa from './Mesa.js';
import Reserva from './Reserva.js';
import Usuario from './Usuario.js';

Usuario.hasMany(Reserva, { foreignKey: 'clienteId', as: 'reservas' });
Mesa.hasMany(Reserva, { foreignKey: 'mesaId', as: 'reservas' });
Reserva.belongsTo(Usuario, { foreignKey: 'clienteId', as: 'cliente' });
Reserva.belongsTo(Mesa, { foreignKey: 'mesaId', as: 'mesa' });

CategoriaMenu.hasMany(ItemMenu, { foreignKey: 'categoriaId', as: 'itens' });
ItemMenu.belongsTo(CategoriaMenu, { foreignKey: 'categoriaId', as: 'categoria' });

// Demais models (pedidos, compras) entram nas fases seguintes.

export { sequelize, CategoriaMenu, ItemMenu, Mesa, Reserva, Usuario };
