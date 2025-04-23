import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 123_45;

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};