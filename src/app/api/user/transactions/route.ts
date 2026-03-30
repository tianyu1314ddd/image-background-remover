// API Route: Get user transaction history
// GET /api/user/transactions?token=xxx

import { NextRequest, NextResponse } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';

interface ParsedToken {
  email: string;
  name: string;
  exp: number;
}

interface Transaction {
  transaction_id: string;
  user_email: string;
  package_type: string;
  credits: number;
  amount_cny: number;
  amount_usd: number;
  status: string;
  completed_at: string;
}

// Verify session token
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

    if (!db) {
      return Response.json({
        success: true,
        data: {
          transactions: [],
          message: '数据库暂不可用'
        }
      });
    }

    // Fetch transactions for this user
    const result = await db
      .prepare(`
        SELECT transaction_id, user_email, package_type, credits, 
               amount_cny, amount_usd, status, completed_at
        FROM paypal_transactions 
        WHERE user_email = ? 
        ORDER BY completed_at DESC 
        LIMIT 50
      `)
      .bind(user.email)
      .all<Transaction>();

    const transactions = result.results || [];

    // Format transactions for display
    const formattedTransactions = transactions.map(t => ({
      id: t.transaction_id,
      packageType: t.package_type,
      credits: t.credits,
      amountCNY: t.amount_cny,
      amountUSD: t.amount_usd,
      status: t.status,
      completedAt: t.completed_at,
    }));

    return Response.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        totalCount: transactions.length,
      }
    });

  } catch (error) {
    console.error('Transaction history API error:', error);
    return Response.json(
      { success: false, error: '获取充值记录失败' },
      { status: 500 }
    );
  }
}
