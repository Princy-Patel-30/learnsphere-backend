import { verifyToken } from "../Utils/jwt.js";

export const authenticateToken = (role) => {
  return (req, res, next) => {
    const cookieName = role === 'INSTRUCTOR' ? 'instructor_token' : 'student_token';
    const refreshTokenName = role === 'INSTRUCTOR' ? 'instructor_refresh_token' : 'student_refresh_token';
    const token = req.cookies[cookieName] || req.cookies[refreshTokenName];

    if (!token) {
      console.log(`Missing token for role: ${role}`);
      return res.status(401).json({ message: `${role} token missing` });
    }

    const user = verifyToken(token);
    if (!user) {
      console.log('Invalid or expired token');
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    if (user.role !== role) {
      console.log(`Role mismatch: Expected ${role}, got ${user.role}`);
      return res.status(403).json({ message: `Requires ${role} role` });
    }

    req.user = user;
    next();
  };
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      console.log('Unauthorized: No user found in request');
      return res.status(401).json({ message: 'Unauthorized: No user found' });
    }
    if (!allowedRoles.includes(user.role)) {
      console.log(`Forbidden: User ${user.id} with role ${user.role} tried to access ${req.originalUrl}`);
      return res.status(403).json({
        message: `Forbidden: Requires role(s): ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
};

export const authenticateAnyToken = (req, res, next) => {
  const studentToken = req.cookies['student_token'] || req.cookies['student_refresh_token'];
  const instructorToken = req.cookies['instructor_token'] || req.cookies['instructor_refresh_token'];
  const token = studentToken || instructorToken;

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Token missing' });
  }

  const user = verifyToken(token);
  if (!user) {
    console.log('Invalid or expired token');
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};