import express from 'express';
import {
  createCourse,
  getInstructorCourses,
  updateCourse,
  deleteCourse,
} from '../Controllers/course.controller.js';
import { authenticateToken, authorizeRoles } from '../Middleware/auth.middleware.js';
import { getAllPublishedCourses, getCourseById } from '../Controllers/student.controller.js';

const router = express.Router();
router.get('/courses', getAllPublishedCourses);
router.get('/courses/:id', getCourseById);
router.post('/', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), createCourse);
router.get('/my-courses', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), getInstructorCourses);
router.put('/:id', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), updateCourse);
router.delete('/:id', authenticateToken('INSTRUCTOR'), authorizeRoles('INSTRUCTOR'), deleteCourse);

export default router;