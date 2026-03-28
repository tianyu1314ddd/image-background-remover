import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, updateLastLogin } from '@/lib/db';
import type { D1Database } from '@cloudflare/workers-types';

export async function GET(request: NextRequest) {
  try {
    const env = process.env as { DB?: D1Database };
    const db = env.DB;
    
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    // Handle error from Google OAuth
    if (error) {
      const errorDescriptions: Record<string, string> = {
        access_denied: '用户取消了登录',
        popup_closed: '登录窗口已关闭',
        server_error: 'Google 服务暂时不可用',
      };
      const message = errorDescriptions[error] || `登录失败: ${error}`;
      return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent(message)}`);
    }
    
    // If no code, redirect to Google login
    if (!code) {
      const clientId = '404300094669-raplltqofch4kq0bco3hokten7plh0to.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(`${url.origin}/api/auth/callback`);
      return NextResponse.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&access_type=offline`,
        302
      );
    }

    const clientSecret = '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';

    // Exchange code for tokens
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenParams = new URLSearchParams({
      code,
      client_id: '404300094669-raplltqofch4kq0bco3hokten7plh0to.apps.googleusercontent.com',
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    let tokens;
    try {
      tokens = await tokenResponse.json();
    } catch (e) {
      const text = await tokenResponse.text();
      return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Token exchange failed: ' + text)}`);
    }

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Failed to get access token: ' + JSON.stringify(tokens))}`);
    }

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let userInfo;
    try {
      userInfo = await userInfoResponse.json();
    } catch (e) {
      return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Failed to parse user info')}`);
    }

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Failed to get user info: ' + JSON.stringify(userInfo))}`);
    }

    // Create or update user in D1
    if (db) {
      const existingUser = await getUserByEmail(db, userInfo.email);
      if (existingUser) {
        await updateLastLogin(db, userInfo.email);
      } else {
        await createUser(db, crypto.randomUUID(), userInfo.email, userInfo.name || 'User', userInfo.picture || null);
      }
    }

    // Create session token
    const sessionToken = btoa(JSON.stringify({
      email: userInfo.email,
      name: userInfo.name || 'User',
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    }));

    // Redirect to home with token
    const redirectUrl = new URL(url.origin);
    redirectUrl.searchParams.set('token', sessionToken);
    redirectUrl.searchParams.set('name', userInfo.name || 'User');
    return NextResponse.redirect(redirectUrl.toString(), 302);

  } catch (error) {
    console.error('Auth callback error:', error);
    const url = new URL(request.url);
    return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('服务器内部错误')}`);
  }
}
