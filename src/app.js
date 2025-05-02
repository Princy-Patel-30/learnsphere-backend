import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './config/Passport.js';
import authRoutes from './Routes/auth.routes.js';
import courseRoutes from './Routes/course.routes.js';
import studentRoutes from './Routes/student.routes.js';
import instructorRoutes from './Routes/instructor.routes.js';

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/instructor', instructorRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;