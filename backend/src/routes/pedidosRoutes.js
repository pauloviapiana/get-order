import { Router } from 'express';
import {
  adicionarItem,
  alterarQuantidadeItem,
  alterarStatus,
  atribuirGarcom,
  buscarPorId,
  criar,
  listar,
  listarGarcons,
  removerItem,
} from '../controllers/pedidosController.js';
import { autenticar } from '../middlewares/auth.js';
import { autorizarPerfil } from '../middlewares/autorizar.js';

const router = Router();

const soEquipe = autorizarPerfil('admin', 'funcionario');

// Os 3 perfis acessam; posse (cliente só os próprios) e quem aplica cada transição
// são checados no pedidoService. Sem DELETE de pedido: cancelar via PATCH /:id/status.
router.use(autenticar);

router.get('/', listar);
router.post('/', criar);
router.get('/garcons', soEquipe, listarGarcons);
router.get('/:id', buscarPorId);
router.post('/:id/itens', adicionarItem);
router.patch('/:id/itens/:pedidoItemId', alterarQuantidadeItem);
router.delete('/:id/itens/:pedidoItemId', removerItem);
router.patch('/:id/garcom', soEquipe, atribuirGarcom);
router.patch('/:id/status', alterarStatus);

export default router;
