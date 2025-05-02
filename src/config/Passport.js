import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './db.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.user.findUnique({
          where: { email: profile.emails[0].value },
        });

        let isNewUser = false;
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: profile.displayName,
              email: profile.emails[0].value,
              password: null,
              role: 'STUDENT', // Temporary default
            },
          });
          isNewUser = true;
        }

        // Attach isNewUser flag to user object
        done(null, { ...user, isNewUser });
      } catch (error) {
        console.error('Google Auth Error:', error);
        done(error, null);
      }
    }
  )
);

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;