import prisma from '../config/db.js';
import { hashPassword ,comparePassword } from '../Utils/hash.js';
import { generateToken } from '../Utils/jwt.js';


export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
        data: { name, email, password: hashed, role: role.toUpperCase() },
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });

    const match = await comparePassword(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
