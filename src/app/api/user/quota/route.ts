import { NextRequest, NextResponse } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';

interface ParsedToken {
  email: string;
  name: string;
  exp: number;
}

// 验证 session token
function verifyToken(token: string): ParsedToken | null {
  try {
    const decoded = JSON.parse(atob(token));
    if (decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const env = process.env as { DB?: D1Database } & { [key: string]: unknown };
    const db = env.DB;

    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return Response.json(
        { success: false, error: '请先登录', code: 'NOT_LOGGED_IN' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return Response.json(
        { success: false, error: '登录已过期', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }

    const FREE_MONTHLY_QUOTA = 5;

    if (db) {
      const result = await db
        .prepare('SELECT credits, monthly_usage, monthly_quota_reset, created_at FROM users WHERE email = ?')
        .bind(user.email)
        .first<{ credits: number; monthly_usage: number; monthly_quota_reset: string; created_at: string }>();

      if (result) {
        // 计算下次月度重置日期
        const lastReset = new Date(result.monthly_quota_reset);
        const nextReset = new Date(lastReset);
        nextReset.setDate(nextReset.getDate() + 30);

        return Response.json({
          success: true,
          data: {
            email: user.email,
            name: user.name,
            credits: result.credits,
            monthlyUsage: result.monthly_usage,
            monthlyQuota: FREE_MONTHLY_QUOTA,
            quotaResetDate: nextReset.toISOString().split('T')[0],
            memberSince: result.created_at.split('T')[0]
          }
        });
      }
    }

    // 如果没有DB或用户不存在，返回默认信息
    return Response.json({
      success: true,
      data: {
        email: user.email,
        name: user.name,
        credits: 3,
        monthlyUsage: 0,
        monthlyQuota: FREE_MONTHLY_QUOTA,
        quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        memberSince: new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Quota API error:', error);
    return Response.json(
      { success: false, error: '获取额度信息失败' },
      { status: 500 }
    );
  }
}
