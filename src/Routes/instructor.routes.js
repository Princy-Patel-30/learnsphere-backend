import express from 'express';
import { getAnalytics } from '../Controllers/instructor.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/analytics', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), getAnalytics);

export default router;