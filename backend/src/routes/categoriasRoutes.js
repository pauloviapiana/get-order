import { Router } from 'express';
import {
  alterarAtiva,
  atualizar,
  buscarPorId,
  criar,
  listar,
  listarItens,
} from '../controllers/categoriasController.js';
import { autenticar } from '../middlewares/auth.js';
import { autorizarPerfil } from '../middlewares/autorizar.js';

const router = Router();

const soAdmin = autorizarPerfil('admin');

// Leitura: os 3 perfis (funcionario/cliente só veem ativas, filtrado no service). Escrita: só admin.
// Sem DELETE: desativar via PATCH /:id/ativa preserva itens (FK RESTRICT) e o histórico.
router.use(autenticar);

router.get('/', listar);
router.get('/:id', buscarPorId);
router.get('/:id/itens', listarItens);
router.post('/', soAdmin, criar);
router.put('/:id', soAdmin, atualizar);
router.patch('/:id', soAdmin, atualizar);
router.patch('/:id/ativa', soAdmin, alterarAtiva);

export default router;
