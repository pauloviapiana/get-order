import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sequelize from './config/database.js';
import './models/index.js';
import routes from './routes/index.js';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const clientOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: clientOrigins,
  })
);
app.use(express.json());
app.use('/api', routes);
app.use(rotaNaoEncontrada);
app.use(tratarErros);

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco OK');

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Não foi possível conectar ao banco:', error.message);
    process.exit(1);
  }
}

start();
