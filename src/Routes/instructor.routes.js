import express from 'express';
import {
  getAnalytics,
  getCourseAnalytics,
  getCommentAnalytics,
} from '../Controllers/instructor.controller.js';
import { authenticateToken, authorizeRoles } from '../Middleware/auth.middleware.js';

const router = express.Router();

// Main analytics dashboard data
router.get(
  '/analytics',
  authenticateToken('INSTRUCTOR'),
  authorizeRoles('INSTRUCTOR'),
  getAnalytics
);

// Course-specific detailed analytics
router.get(
  '/analytics/courses/:courseId',
  authenticateToken('INSTRUCTOR'),
  authorizeRoles('INSTRUCTOR'),
  getCourseAnalytics
);

// Comment analytics data
router.get(
  '/analytics/comments',
  authenticateToken('INSTRUCTOR'),
  authorizeRoles('INSTRUCTOR'),
  getCommentAnalytics
);

export default router;