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
  credits: number;
  monthly_quota_reset: string;
  monthly_usage: number;
}

// 新用户注册赠送积分
export const REGISTRATION_BONUS = 3;

// 免费用户每月额度
export const FREE_MONTHLY_QUOTA = 5;

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
      'INSERT INTO users (id, email, name, picture, credits) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(id, email, name, picture, REGISTRATION_BONUS)
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

// 检查用户是否还有额度（积分或月度免费额度）
export async function checkUserQuota(db: D1Database, email: string): Promise<{
  hasQuota: boolean;
  remainingCredits: number;
  remainingMonthly: number;
  quotaType: 'credits' | 'monthly' | 'none';
}> {
  const user = await getUserByEmail(db, email);
  
  if (!user) {
    return { hasQuota: false, remainingCredits: 0, remainingMonthly: 0, quotaType: 'none' };
  }

  // 优先使用积分（永久有效）
  if (user.credits > 0) {
    return {
      hasQuota: true,
      remainingCredits: user.credits,
      remainingMonthly: FREE_MONTHLY_QUOTA - user.monthly_usage,
      quotaType: 'credits'
    };
  }

  // 检查月度免费额度是否重置
  const lastReset = new Date(user.monthly_quota_reset);
  const now = new Date();
  const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

  // 每月1号重置或首次使用
  if (daysSinceReset >= 30 || user.monthly_usage < FREE_MONTHLY_QUOTA) {
    return {
      hasQuota: true,
      remainingCredits: 0,
      remainingMonthly: Math.max(0, FREE_MONTHLY_QUOTA - user.monthly_usage),
      quotaType: 'monthly'
    };
  }

  return { hasQuota: false, remainingCredits: 0, remainingMonthly: 0, quotaType: 'none' };
}

// 扣除积分
export async function deductCredit(db: D1Database, email: string): Promise<boolean> {
  const user = await getUserByEmail(db, email);
  if (!user) return false;

  // 优先扣除积分
  if (user.credits > 0) {
    await db
      .prepare('UPDATE users SET credits = credits - 1 WHERE email = ?')
      .bind(email)
      .run();
    return true;
  }

  // 否则使用月度额度（先检查是否需要重置）
  const lastReset = new Date(user.monthly_quota_reset);
  const now = new Date();
  const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceReset >= 30) {
    // 重置月度额度
    await db
      .prepare('UPDATE users SET monthly_usage = 0, monthly_quota_reset = CURRENT_TIMESTAMP WHERE email = ?')
      .bind(email)
      .run();
  }

  await db
    .prepare('UPDATE users SET monthly_usage = monthly_usage + 1 WHERE email = ?')
    .bind(email)
    .run();

  return true;
}

// 添加积分
export async function addCredits(db: D1Database, email: string, credits: number): Promise<boolean> {
  const user = await getUserByEmail(db, email);
  if (!user) return false;

  await db
    .prepare('UPDATE users SET credits = credits + ? WHERE email = ?')
    .bind(credits, email)
    .run();
  return true;
}

// 获取用户额度信息
export async function getUserQuotaInfo(db: D1Database, email: string): Promise<{
  credits: number;
  monthlyUsage: number;
  monthlyQuota: number;
  quotaResetDate: string;
}> {
  const user = await getUserByEmail(db, email);
  
  if (!user) {
    return { credits: 0, monthlyUsage: 0, monthlyQuota: FREE_MONTHLY_QUOTA, quotaResetDate: '' };
  }

  // 计算下次月度重置日期
  const lastReset = new Date(user.monthly_quota_reset);
  const nextReset = new Date(lastReset);
  nextReset.setDate(nextReset.getDate() + 30);

  return {
    credits: user.credits,
    monthlyUsage: user.monthly_usage,
    monthlyQuota: FREE_MONTHLY_QUOTA,
    quotaResetDate: nextReset.toISOString().split('T')[0]
  };
}
