import { Router } from 'express';
import { atualizar, buscarPorId, criar, listar, remover } from '../controllers/comprasController.js';
import { autenticar } from '../middlewares/auth.js';
import { autorizarPerfil } from '../middlewares/autorizar.js';

const router = Router();

// Despesas: tudo só admin. DELETE físico (nenhuma tabela referencia compras).
router.use(autenticar, autorizarPerfil('admin'));

router.get('/', listar);
router.get('/:id', buscarPorId);
router.post('/', criar);
router.put('/:id', atualizar);
router.patch('/:id', atualizar);
router.delete('/:id', remover);

export default router;
