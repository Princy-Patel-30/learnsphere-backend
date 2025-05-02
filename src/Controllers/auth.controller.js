import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateAccessToken, generateRefreshToken } from '../Utils/jwt.js';
import passport from 'passport';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (!['STUDENT', 'INSTRUCTOR'].includes(role.toUpperCase())) {
    return res.status(400).json({ message: 'Role must be STUDENT or INSTRUCTOR' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role.toUpperCase() },
    });

    res.status(201).json({ message: 'User registered successfully', user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Invalid credentials' });

    if (!user.password) {
      return res.status(401).json({ message: 'Password-based login not supported for this account. Use Google login.' });
    }

    const match = await comparePassword(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const accessCookieName = user.role === 'INSTRUCTOR' ? 'instructor_token' : 'student_token';
    const refreshCookieName = user.role === 'INSTRUCTOR' ? 'instructor_refresh_token' : 'student_refresh_token';

    res.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const refresh = async (req, res) => {
  const instructorRefreshToken = req.cookies.instructor_refresh_token;
  const studentRefreshToken = req.cookies.student_refresh_token;
  const refreshToken = instructorRefreshToken || studentRefreshToken;

  if (!refreshToken) return res.status(401).json({ message: 'Refresh token missing' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const accessCookieName = user.role === 'INSTRUCTOR' ? 'instructor_token' : 'student_token';
    const refreshCookieName = user.role === 'INSTRUCTOR' ? 'instructor_refresh_token' : 'student_refresh_token';

    res.cookie(accessCookieName, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(refreshCookieName, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Refresh Error:', error);
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logout = (req, res) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    res.clearCookie('student_token', cookieOptions);
    res.clearCookie('student_refresh_token', cookieOptions);
    res.clearCookie('instructor_token', cookieOptions);
    res.clearCookie('instructor_refresh_token', cookieOptions);

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

export const googleLogin = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect('/login?error=auth_failed');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set cookie names based on role
    const accessCookie = user.role === 'INSTRUCTOR' ? 'instructor_token' : 'student_token';
    const refreshCookie = user.role === 'INSTRUCTOR' ? 'instructor_refresh_token' : 'student_refresh_token';

    // Set cookies
    res.cookie(accessCookie, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(refreshCookie, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect based on whether the user is new
    let redirectUrl;
    if (user.isNewUser) {
      redirectUrl = 'http://localhost:5173/select-role';
    } else {
      redirectUrl =
        user.role === 'INSTRUCTOR'
          ? 'http://localhost:5173/InstructorDashboard'
          : 'http://localhost:5173/StudentDashboard';
    }

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google Callback Error:', error);
    res.redirect('/login?error=server_error');
  }
};

export const updateRole = async (req, res) => {
  const { role } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  if (!['STUDENT', 'INSTRUCTOR'].includes(role)) {
    return res.status(400).json({ message: 'Role must be STUDENT or INSTRUCTOR' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Generate new tokens with updated role
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const accessCookieName = role === 'INSTRUCTOR' ? 'instructor_token' : 'student_token';
    const refreshCookieName = role === 'INSTRUCTOR' ? 'instructor_refresh_token' : 'student_refresh_token';

    res.cookie(accessCookieName, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: 'Role updated successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({ message: 'Failed to update role' });
  }
};