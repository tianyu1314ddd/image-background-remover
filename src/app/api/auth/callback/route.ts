import { NextRequest } from 'next/server';
import { createUser, getUserByEmail, updateLastLogin } from '@/lib/db';
import type { D1Database } from '@cloudflare/workers-types';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const env = process.env as { DB?: D1Database } & { [key: string]: unknown };
    const db = env as { DB?: D1Database } & { [key: string]: unknown };
    
    const url = new URL(request.url);
    
    // If no code, redirect to login
    const code = url.searchParams.get('code');
    if (!code) {
    const clientId = '404300094669-raplltqofch4kq0bco3hokten7plh0to.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(`${new URL(request.url).origin}/api/auth/callback`);
    return Response.redirect(
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
    redirect_uri: `${new URL(request.url).origin}/api/auth/callback`,
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
    return new Response(JSON.stringify({ error: 'Token exchange failed', details: text }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!tokenResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to get access token', details: tokens }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get user info
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  let userInfo;
  try {
    userInfo = await userInfoResponse.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to parse user info' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!userInfoResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to get user info', details: userInfo }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if user exists in DB, if not create with registration bonus
  if (db.DB) {
    const existingUser = await getUserByEmail(db.DB, userInfo.email);
    
    if (!existingUser) {
      // New user - create with registration bonus (3 credits)
      const userId = crypto.randomUUID();
      await createUser(db.DB, userId, userInfo.email, userInfo.name, userInfo.picture);
    } else {
      // Existing user - update last login
      await updateLastLogin(db.DB, userInfo.email);
    }
  }

  // Create a simple session token (in production, use proper JWT or secure session)
  const sessionToken = btoa(JSON.stringify({
    email: userInfo.email,
    name: userInfo.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }));

  // Redirect back to home with token
  const redirectUrl = new URL('https://imagebackgroundsremover.shop');
  redirectUrl.searchParams.set('token', sessionToken);
  redirectUrl.searchParams.set('name', userInfo.name || 'User');
  redirectUrl.searchParams.set('email', userInfo.email);

  return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
