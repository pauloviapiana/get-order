/**
 * Seed de demonstração — Fase 2 (somente usuários).
 *
 * Uso (dentro de backend/, depois de `npx sequelize-cli db:migrate`):
 *   npm run seed
 *
 * Reexecutável: `findOrCreate` por email não duplica nem sobrescreve registros.
 */
import bcrypt from 'bcrypt';
import { sequelize, Usuario } from '../models/index.js';

const SALT_ROUNDS = 10;
const SENHA_DEMO = '123456';

const usuariosDemo = [
  { nome: 'Admin Demo', email: 'admin@getorder.com', perfil: 'admin', telefone: '(11) 90000-0001' },
  { nome: 'Fernanda Garçom', email: 'funcionario1@getorder.com', perfil: 'funcionario', telefone: '(11) 90000-0002' },
  { nome: 'Gustavo Garçom', email: 'funcionario2@getorder.com', perfil: 'funcionario', telefone: '(11) 90000-0003' },
  { nome: 'Ana Cliente', email: 'cliente1@getorder.com', perfil: 'cliente', telefone: '(11) 98888-0001' },
  { nome: 'Bruno Cliente', email: 'cliente2@getorder.com', perfil: 'cliente', telefone: '(11) 98888-0002' },
  { nome: 'Carla Cliente', email: 'cliente3@getorder.com', perfil: 'cliente', telefone: null },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco OK.');

    await sequelize.transaction(async (t) => {
      const senhaHash = await bcrypt.hash(SENHA_DEMO, SALT_ROUNDS);

      console.log('Semeando usuários...');

      for (const dados of usuariosDemo) {
        const [usuario, criado] = await Usuario.findOrCreate({
          where: { email: dados.email },
          defaults: { ...dados, senha: senhaHash, ativo: true },
          transaction: t,
        });

        console.log(
          `  ${criado ? 'criado' : 'já existia'}: ${usuario.email} (${usuario.perfil})`
        );
      }
    });

    console.log(`Seed finalizado. Senha demo de todos: ${SENHA_DEMO}`);
  } catch (error) {
    console.error('Falha no seed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seed();
