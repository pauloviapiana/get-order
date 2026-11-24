import { Router } from 'express';
import { login, me, register } from '../controllers/authController.js';
import { autenticar } from '../middlewares/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', autenticar, me);

export default router;
