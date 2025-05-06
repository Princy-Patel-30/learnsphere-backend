import express from 'express';
import { login, register, refresh, logout, googleLogin, googleCallback, updateRole } from '../controllers/auth.controller.js';
import passport from 'passport';
import { authenticateAnyToken } from '../Middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/refresh-token', refresh);
router.post('/logout', logout);
router.get('/google', googleLogin);
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
  googleCallback
);
router.put('/update-role',authenticateAnyToken, updateRole);

export default router;