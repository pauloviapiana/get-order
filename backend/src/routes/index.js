import { Router } from 'express';
import authRoutes from './authRoutes.js';
import categoriasRoutes from './categoriasRoutes.js';
import itensMenuRoutes from './itensMenuRoutes.js';
import mesasRoutes from './mesasRoutes.js';
import reservasRoutes from './reservasRoutes.js';
import usuariosRoutes from './usuariosRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/mesas', mesasRoutes);
router.use('/reservas', reservasRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/itens-menu', itensMenuRoutes);

export default router;
