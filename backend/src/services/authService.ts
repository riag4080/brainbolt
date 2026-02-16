import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: string;
  username: string;
  email: string;
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  // Check if user exists
  const existing = await query(
    `SELECT id FROM users WHERE username = $1 OR email = $2`,
    [username, email]
  );

  if (existing.rows.length > 0) {
    throw new Error('Username or email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const result = await query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email`,
    [username, email, passwordHash]
  );

  const user = result.rows[0];

  // Generate token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    token,
  };
}

export async function loginUser(
  usernameOrEmail: string,
  password: string
): Promise<{ user: User; token: string }> {
  // Find user
  const result = await query(
    `SELECT id, username, email, password_hash
     FROM users
     WHERE username = $1 OR email = $1`,
    [usernameOrEmail]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    token,
  };
}

export function verifyToken(token: string): { userId: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await query(
    `SELECT id, username, email FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
