import { NextRequest } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';

export const runtime = 'edge';

// 每月免费额度
const FREE_MONTHLY_QUOTA = 5;

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
      return null; // token 过期
    }
    return decoded;
  } catch {
    return null;
  }
}

// 检查用户额度的辅助函数
async function checkQuota(db: D1Database, email: string): Promise<{
  hasQuota: boolean;
  remainingCredits: number;
  remainingMonthly: number;
}> {
  const user = await db
    .prepare('SELECT credits, monthly_usage, monthly_quota_reset FROM users WHERE email = ?')
    .bind(email)
    .first<{ credits: number; monthly_usage: number; monthly_quota_reset: string }>();
  
  if (!user) {
    return { hasQuota: false, remainingCredits: 0, remainingMonthly: 0 };
  }

  // 优先使用积分
  if (user.credits > 0) {
    return {
      hasQuota: true,
      remainingCredits: user.credits,
      remainingMonthly: 0
    };
  }

  // 检查月度额度是否需要重置
  const lastReset = new Date(user.monthly_quota_reset);
  const now = new Date();
  const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));

  let monthlyUsage = user.monthly_usage;
  
  // 超过30天，重置月度额度
  if (daysSinceReset >= 30) {
    await db
      .prepare('UPDATE users SET monthly_usage = 0, monthly_quota_reset = CURRENT_TIMESTAMP WHERE email = ?')
      .bind(email)
      .run();
    monthlyUsage = 0;
  }

  const remaining = Math.max(0, FREE_MONTHLY_QUOTA - monthlyUsage);
  
  return {
    hasQuota: remaining > 0 || user.credits > 0,
    remainingCredits: user.credits,
    remainingMonthly: remaining
  };
}

// 扣除额度
async function useQuota(db: D1Database, email: string): Promise<boolean> {
  const user = await db
    .prepare('SELECT credits, monthly_usage FROM users WHERE email = ?')
    .bind(email)
    .first<{ credits: number; monthly_usage: number }>();
  
  if (!user) return false;

  // 优先使用积分
  if (user.credits > 0) {
    await db
      .prepare('UPDATE users SET credits = credits - 1 WHERE email = ?')
      .bind(email)
      .run();
    return true;
  }

  // 使用月度额度
  await db
    .prepare('UPDATE users SET monthly_usage = monthly_usage + 1 WHERE email = ?')
    .bind(email)
    .run();
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const env = process.env as { DB?: D1Database } & { [key: string]: unknown };
    const db = env.DB;

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const token = formData.get('token') as string | null;
    
    if (!image) {
      return Response.json(
        { success: false, error: '请上传图片', code: 'NO_IMAGE' },
        { status: 400 }
      );
    }

    // 验证用户登录状态
    if (!token) {
      return Response.json(
        { success: false, error: '请先登录', code: 'NOT_LOGGED_IN' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return Response.json(
        { success: false, error: '登录已过期，请重新登录', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }

    // 检查用户额度
    if (db) {
      const quota = await checkQuota(db, user.email);
      
      if (!quota.hasQuota) {
        return Response.json(
          { 
            success: false, 
            error: '今日免费额度已用完，请明天再来或购买积分包',
            code: 'QUOTA_EXCEEDED',
            remainingCredits: 0,
            remainingMonthly: 0
          },
          { status: 403 }
        );
      }
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return Response.json(
        { success: false, error: '请上传 JPG、PNG 或 WebP 格式的图片', code: 'INVALID_TYPE' },
        { status: 400 }
      );
    }

    // 检查文件大小 (25MB)
    const maxSize = 25 * 1024 * 1024;
    if (image.size > maxSize) {
      return Response.json(
        { success: false, error: '图片大小不能超过 25MB', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;
    
    if (!apiKey) {
      return Response.json(
        { success: false, error: 'API Key 未配置，请联系管理员', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // 转发到 Remove.bg API
    const buffer = Buffer.from(await image.arrayBuffer());
    
    const removeBgFormData = new FormData();
    removeBgFormData.append('image_file_b64', buffer.toString('base64'));
    removeBgFormData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgFormData,
    });

    if (!response.ok) {
      if (response.status === 402 || response.status === 403) {
        return Response.json(
          { success: false, error: '上游API额度已用完，请稍后再试', code: 'UPSTREAM_QUOTA_EXCEEDED' },
          { status: 429 }
        );
      }
      
      if (response.status === 400) {
        return Response.json(
          { success: false, error: '图片处理失败，请尝试其他图片', code: 'PROCESSING_ERROR' },
          { status: 400 }
        );
      }
      
      return Response.json(
        { success: false, error: '处理失败，请稍后重试', code: 'SERVER_ERROR' },
        { status: 500 }
      );
    }

    // 处理成功，扣除额度
    if (db) {
      await useQuota(db, user.email);
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    const base64 = resultBuffer.toString('base64');
    
    // 返回剩余额度信息
    let remainingInfo = {};
    if (db) {
      const quota = await checkQuota(db, user.email);
      remainingInfo = {
        remainingCredits: quota.remainingCredits,
        remainingMonthly: quota.remainingMonthly
      };
    }
    
    return Response.json({
      success: true,
      imageBase64: `data:image/png;base64,${base64}`,
      ...remainingInfo
    });
    
  } catch (error) {
    console.error('Remove background error:', error);
    return Response.json(
      { success: false, error: '处理超时，请检查网络后重试', code: 'TIMEOUT' },
      { status: 500 }
    );
  }
}
