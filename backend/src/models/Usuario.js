import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const PERFIS = ['admin', 'funcionario', 'cliente'];

const Usuario = sequelize.define(
  'Usuario',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    telefone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    perfil: {
      type: DataTypes.ENUM(...PERFIS),
      allowNull: false,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'usuarios',
    // Hash da senha só é carregado quando pedido explicitamente: Usuario.scope('comSenha')
    defaultScope: {
      attributes: { exclude: ['senha'] },
    },
    scopes: {
      comSenha: {},
    },
  }
);

// Garante que o hash nunca vaze em res.json(), mesmo após create()/save()
Usuario.prototype.toJSON = function toJSON() {
  const dados = { ...this.get() };
  delete dados.senha;
  return dados;
};

export default Usuario;
