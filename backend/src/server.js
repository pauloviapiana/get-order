import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sequelize from './config/database.js';
import './models/index.js';
import routes from './routes/index.js';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros.js';
import { limiteGeral } from './middlewares/rateLimit.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const clientOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Lista explícita. Vazio ou "*" derruba o boot: a demo não sobe com CORS aberto ou quebrado.
if (clientOrigins.length === 0 || clientOrigins.includes('*')) {
  console.error(
    'CLIENT_ORIGINS deve listar as origens explícitas dos frontends (ex.: http://localhost:5173,http://localhost:5174). Lista vazia ou "*" impede o boot.'
  );
  process.exit(1);
}

// Helmet com CSP desligado: os frontends Vite em outras origens não servem HTML da API.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: clientOrigins,
  })
);
app.use(express.json());
app.use('/api', limiteGeral, routes);
app.use(rotaNaoEncontrada);
app.use(tratarErros);

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco OK');

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`CORS: ${clientOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('Não foi possível conectar ao banco:', error.message);
    process.exit(1);
  }
}

start();
