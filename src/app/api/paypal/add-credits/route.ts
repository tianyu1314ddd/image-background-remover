// API Route: Add credits directly (called after successful PayPal payment)
// POST /api/paypal/add-credits

import { NextRequest, NextResponse } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';
import { CREDIT_PACKAGES } from '@/lib/paypal';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { orderId, customId, transactionId, amount } = await request.json();

    if (!customId && !orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const env = process.env as { DB?: D1Database } & { [key: string]: unknown };
    const db = env.DB;

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }

    // Parse customId: email-packageType-timestamp
    let userEmail: string;
    let packageType: string;

    if (customId) {
      const parts = customId.split('-');
      if (parts.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Invalid customId format' },
          { status: 400 }
        );
      }

      // Handle email containing hyphens (rare but possible)
      if (parts[0].includes('@')) {
        userEmail = parts[0];
        packageType = parts[1];
      } else {
        const validPackages = ['S', 'M', 'L', 'starter_monthly', 'pro_monthly', 'pro_yearly'];
        const packageIndex = parts.findIndex((p: string) => validPackages.includes(p));
        if (packageIndex > 0) {
          userEmail = parts.slice(0, packageIndex).join('-');
          packageType = parts[packageIndex];
        } else {
          return NextResponse.json(
            { success: false, error: 'Could not parse customId' },
            { status: 400 }
          );
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'customId is required' },
        { status: 400 }
      );
    }

    const packageInfo = CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES];

    if (!packageInfo) {
      return NextResponse.json(
        { success: false, error: 'Unknown package type' },
        { status: 400 }
      );
    }

    const credits = packageInfo.credits;

    // Check if user exists
    const user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(userEmail)
      .first();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Add credits
    await db
      .prepare('UPDATE users SET credits = credits + ? WHERE email = ?')
      .bind(credits, userEmail)
      .run();

    console.log(`Added ${credits} credits to user ${userEmail} via direct API call`);

    // Record transaction
    try {
      // Get package name from CREDIT_PACKAGES
      const packageName = CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES]?.name || packageType;
      
      await db
        .prepare(`
          INSERT INTO paypal_transactions (transaction_id, user_email, package_type, package_name, credits, amount_cny, amount_usd, status, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
        `)
        .bind(transactionId || orderId, userEmail, packageType, packageName, credits, amount || 0, amount || 0)
        .run();
      console.log(`Transaction recorded for ${userEmail}: ${credits} credits`);
    } catch (e) {
      console.log('Could not record transaction (non-fatal):', e);
    }

    return NextResponse.json({
      success: true,
      message: `Added ${credits} credits to ${userEmail}`,
      creditsAdded: credits,
      userEmail,
      packageType,
    });

  } catch (error) {
    console.error('Add credits API error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
