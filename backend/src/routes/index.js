import { Router } from 'express';
import authRoutes from './authRoutes.js';
import usuariosRoutes from './usuariosRoutes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);

export default router;
