/**
 * Cloudflare Worker for Image Background Remover
 * Handles OAuth login and stores user data in D1 database
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const path = url.pathname;

      if (path === '/api/user/login' && request.method === 'POST') {
        return handleLogin(request, env);
      } else if (path === '/api/user/profile' && request.method === 'GET') {
        return getProfile(request, env);
      } else if (path === '/api/user/delete' && request.method === 'DELETE') {
        return deleteUser(request, env);
      } else {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  },
};

/**
 * Handle user login
 */
async function handleLogin(request, env) {
  try {
    const { google_id, name, email, picture } = await request.json();

    // Check if user exists
    const existingUser = await env.DB.prepare(
      'SELECT * FROM users WHERE google_id = ?'
    ).bind(google_id).first();

    if (existingUser) {
      // Update last login time
      await env.DB.prepare(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE google_id = ?'
      ).bind(google_id).run();

      return new Response(JSON.stringify({ 
        success: true, 
        user: existingUser 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert new user
    const result = await env.DB.prepare(
      `INSERT INTO users (google_id, name, email, picture, created_at, last_login)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(google_id, name, email, picture).run();

    if (result.success) {
      return new Response(JSON.stringify({ 
        success: true,
        user: {
          google_id,
          name,
          email,
          picture
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Failed to create user');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Get user profile
 */
async function getProfile(request, env) {
  try {
    const url = new URL(request.url);
    const googleId = url.searchParams.get('google_id');

    if (!googleId) {
      return new Response(JSON.stringify({ error: 'Missing google_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE google_id = ?'
    ).bind(googleId).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, user }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Profile error:', error);
    throw error;
  }
}

/**
 * Delete user account
 */
async function deleteUser(request, env) {
  try {
    const { google_id } = await request.json();

    if (!google_id) {
      return new Response(JSON.stringify({ error: 'Missing google_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(
      'DELETE FROM users WHERE google_id = ?'
    ).bind(google_id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}
