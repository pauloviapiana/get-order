import { Router } from 'express';
import {
  alterarAtiva,
  atualizar,
  buscarPorId,
  criar,
  disponibilidade,
  listar,
} from '../controllers/mesasController.js';
import { autenticar } from '../middlewares/auth.js';
import { autorizarPerfil } from '../middlewares/autorizar.js';

const router = Router();

const soAdmin = autorizarPerfil('admin');

// Leitura: os 3 perfis (cliente só vê ativas, filtrado no service). Escrita: só admin.
// Sem DELETE: desativar via PATCH /:id/ativa preserva o histórico de reservas.
router.use(autenticar);

router.get('/', listar);
router.get('/disponibilidade', disponibilidade);
router.get('/:id', buscarPorId);
router.post('/', soAdmin, criar);
router.put('/:id', soAdmin, atualizar);
router.patch('/:id', soAdmin, atualizar);
router.patch('/:id/ativa', soAdmin, alterarAtiva);

export default router;
