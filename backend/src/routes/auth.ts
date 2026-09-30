import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/database';

const router = Router();

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated()) {
    return next();
  }

  // Check JWT token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      // Attach user info to request
      pool.query('SELECT id, email, name, avatar_url FROM users WHERE id = $1', [decoded.userId])
        .then(result => {
          if (result.rows.length > 0) {
            (req as Request & { user: unknown }).user = result.rows[0];
            next();
          } else {
            res.status(401).json({ error: 'User not found' });
          }
        })
        .catch(() => res.status(401).json({ error: 'Unauthorized' }));
      return;
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  }

  res.status(401).json({ error: 'Unauthorized' });
}

// GET /auth/me
router.get('/me', isAuthenticated, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, name || email.split('@')[0], passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    req.login(user, (err) => {
      if (err) console.error(err);
    });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: Error, user: Express.User, info: { message: string }) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);

      const token = jwt.sign(
        { userId: (user as { id: string }).id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      res.json({ user, token });
    });
  })(req, res, next);
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response) => {
  req.logout(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /auth/google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// GET /auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as { id: string };
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
  }
);

export default router;
