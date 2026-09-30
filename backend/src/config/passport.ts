import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { pool } from '../db/database';

export function configurePassport(): void {
  // Serialize user
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as { id: string }).id);
  });

  // Deserialize user
  passport.deserializeUser(async (id: string, done) => {
    try {
      const result = await pool.query(
        'SELECT id, email, name, avatar_url FROM users WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return done(null, false);
      }
      done(null, result.rows[0]);
    } catch (error) {
      done(error);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email from Google'), undefined);
            }

            // Upsert user
            const result = await pool.query(
              `INSERT INTO users (email, name, avatar_url, google_id)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (google_id) DO UPDATE
               SET name = $2, avatar_url = $3, updated_at = NOW()
               RETURNING id, email, name, avatar_url`,
              [email, profile.displayName, profile.photos?.[0]?.value, profile.id]
            );

            return done(null, result.rows[0]);
          } catch (error) {
            return done(error as Error, undefined);
          }
        }
      )
    );
  }

  // Local Strategy (email/password)
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
          );

          if (result.rows.length === 0) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const user = result.rows[0];
          if (!user.password_hash) {
            return done(null, false, { message: 'Please login with Google' });
          }

          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}
