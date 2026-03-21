import { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string;
  last_login: string;
  usage_count: number;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<User>();
  return result || null;
}

export async function createUser(
  db: D1Database,
  id: string,
  email: string,
  name: string | null,
  picture: string | null
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)'
    )
    .bind(id, email, name, picture)
    .run();
}

export async function updateLastLogin(db: D1Database, email: string): Promise<void> {
  await db
    .prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ?')
    .bind(email)
    .run();
}

export async function incrementUsageCount(db: D1Database, email: string): Promise<void> {
  await db
    .prepare('UPDATE users SET usage_count = usage_count + 1 WHERE email = ?')
    .bind(email)
    .run();
}
