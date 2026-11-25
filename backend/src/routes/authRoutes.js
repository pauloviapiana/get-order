import { Router } from 'express';
import { login, logout, me, refresh, register } from '../controllers/authController.js';
import { autenticar } from '../middlewares/auth.js';
import { limiteAuth } from '../middlewares/rateLimit.js';

const router = Router();

router.post('/register', limiteAuth, register);
router.post('/login', limiteAuth, login);
router.post('/refresh', limiteAuth, refresh);
router.post('/logout', logout);
router.get('/me', autenticar, me);

export default router;
