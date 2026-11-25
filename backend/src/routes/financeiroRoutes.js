import { Router } from 'express';
import { comissoes, resumo } from '../controllers/financeiroController.js';
import { autenticar } from '../middlewares/auth.js';
import { autorizarPerfil } from '../middlewares/autorizar.js';

const router = Router();

// Resumo consolidado só admin; comissões também para funcionário (só as próprias, no financeiroService)
router.use(autenticar);

router.get('/resumo', autorizarPerfil('admin'), resumo);
router.get('/comissoes', autorizarPerfil('admin', 'funcionario'), comissoes);

export default router;
