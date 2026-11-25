import { Router } from 'express';
import {
  alterarDisponivel,
  atualizar,
  buscarPorId,
  criar,
  listar,
} from '../controllers/itensMenuController.js';
import { autenticar } from '../middlewares/auth.js';
import { autorizarPerfil } from '../middlewares/autorizar.js';

const router = Router();

const soAdmin = autorizarPerfil('admin');

// Leitura: os 3 perfis (funcionario/cliente só veem disponíveis de categoria ativa). Escrita: só admin.
// Sem DELETE: pedidos (Fase 5) referenciam itens_menu; retirar do cardápio via PATCH /:id/disponivel.
router.use(autenticar);

router.get('/', listar);
router.get('/:id', buscarPorId);
router.post('/', soAdmin, criar);
router.put('/:id', soAdmin, atualizar);
router.patch('/:id', soAdmin, atualizar);
router.patch('/:id/disponivel', soAdmin, alterarDisponivel);

export default router;
