import { Router } from 'express';
import {
  alterarAtivo,
  atualizar,
  buscarPorId,
  criar,
  listar,
  remover,
} from '../controllers/usuariosController.js';
import { autenticar } from '../middlewares/auth.js';
import { autorizarPerfil } from '../middlewares/autorizar.js';

const router = Router();

const soAdmin = autorizarPerfil('admin');
// Cliente só no próprio id (checado no service); funcionario usa /auth/me
const adminOuCliente = autorizarPerfil('admin', 'cliente');

router.use(autenticar);

router.get('/', soAdmin, listar);
router.post('/', soAdmin, criar);
router.get('/:id', adminOuCliente, buscarPorId);
router.put('/:id', adminOuCliente, atualizar);
router.patch('/:id', adminOuCliente, atualizar);
router.patch('/:id/ativo', soAdmin, alterarAtivo);
router.delete('/:id', soAdmin, remover);

export default router;
