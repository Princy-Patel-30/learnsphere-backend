import express from 'express';
import {
  getAnalytics,
  getCourseAnalytics,
  getStudentAnalytics,
  getRatingsOverTime,
  getCommentAnalytics,
} from '../Controllers/instructor.controller.js';
import { authenticateToken, authorizeRoles } from '../Middleware/auth.middleware.js';

const router = express.Router();

// General analytics dashboard data
router.get('/analytics', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), getAnalytics);

// Course-specific analytics
router.get('/analytics/course/:courseId', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), getCourseAnalytics);

// Student-specific analytics
router.get('/analytics/student/:userId', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), getStudentAnalytics);

// Ratings over time (time-series data)
router.get('/analytics/ratings-over-time', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), getRatingsOverTime);

// Comment analytics
router.get('/analytics/comments', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), getCommentAnalytics);

export default router;