import { Router } from 'express';
import {
  alterarStatus,
  atualizar,
  buscarPorId,
  criar,
  listar,
} from '../controllers/reservasController.js';
import { autenticar } from '../middlewares/auth.js';

const router = Router();

// Os 3 perfis acessam; posse (cliente só as próprias) e "só equipe confirma/conclui"
// são checadas no reservaService. Sem DELETE: cancelar via PATCH /:id/status.
router.use(autenticar);

router.get('/', listar);
router.post('/', criar);
router.get('/:id', buscarPorId);
router.put('/:id', atualizar);
router.patch('/:id', atualizar);
router.patch('/:id/status', alterarStatus);

export default router;
