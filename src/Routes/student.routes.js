import express from 'express';
import {
  getAllPublishedCourses,
  getCourseById,
  enrollInCourse,
  getEnrolledCourses,
  getCourseSessions,
  markSessionComplete,
  getCourseProgress,
  createRating,
  getCourseRatings,
  addComment,
  getComments,
} from '../Controllers/student.controller.js';
import { authenticateToken, authorizeRoles } from '../Middleware/auth.middleware.js';

const router = express.Router();

router.get('/courses', getAllPublishedCourses);
router.get('/courses/:id', getCourseById);
router.post('/enroll/:courseId', authenticateToken('STUDENT'), authorizeRoles('STUDENT'), enrollInCourse);
router.get('/my-courses', authenticateToken('STUDENT'), authorizeRoles('STUDENT'), getEnrolledCourses);
router.get('/course-sessions/:courseId', authenticateToken('STUDENT'), authorizeRoles('STUDENT'), getCourseSessions);
router.get('/course-progress/:courseId', authenticateToken('STUDENT'), authorizeRoles('STUDENT'), getCourseProgress);
router.post('/complete-session/:sessionId', authenticateToken('STUDENT'), authorizeRoles('STUDENT'), markSessionComplete);
router.post('/courses/:courseId/rate', authenticateToken('STUDENT'), authorizeRoles('STUDENT'), createRating);
router.get('/courses/:courseId/ratings', getCourseRatings);
router.post('/ratings/:ratingId/comment', authenticateToken('STUDENT'), authorizeRoles('STUDENT'), addComment);
router.get('/ratings/:ratingId/comments', getComments);

export default router;