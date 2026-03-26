// API Route: PayPal Webhook Handler
// POST /api/paypal/webhook
// Handles payment confirmations and subscription events

import { NextRequest, NextResponse } from 'next/server';
import type { D1Database } from '@cloudflare/workers-types';
import { CREDIT_PACKAGES } from '@/lib/paypal';

export const runtime = 'edge';

// PayPal webhook event types we handle
type WebhookEventType = 
  | 'PAYMENT.CAPTURE.COMPLETED'
  | 'CHECKOUT.ORDER.APPROVED'
  | 'BILLING.SUBSCRIPTION.CREATED'
  | 'BILLING.SUBSCRIPTION.ACTIVATED'
  | 'BILLING.SUBSCRIPTION.CANCELLED'
  | 'BILLING.SUBSCRIPTION.EXPIRED'
  | 'BILLING.SUBSCRIPTION.SUSPENDED';

interface WebhookPayload {
  id: string;
  event_type: WebhookEventType;
  resource: any;
  create_time: string;
}

// Add credits to user account
async function addCreditsToUser(db: D1Database, email: string, credits: number, transactionId: string) {
  try {
    // Check if user exists
    const user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (user) {
      // Add credits to existing user
      await db
        .prepare('UPDATE users SET credits = credits + ? WHERE email = ?')
        .bind(credits, email)
        .run();
      
      console.log(`Added ${credits} credits to user ${email}, transaction: ${transactionId}`);
    } else {
      console.log(`User ${email} not found, skipping credit addition`);
    }

    // Record transaction
    try {
      await db
        .prepare(`
          INSERT INTO paypal_transactions (transaction_id, user_email, package_type, credits, amount_cny, amount_usd, status, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
        `)
        .bind(transactionId, email, 'credit_package', credits, 0, 0)
        .run();
    } catch (e) {
      // Transaction table might not exist yet, log but don't fail
      console.log('Could not record transaction:', e);
    }

  } catch (error) {
    console.error('Error adding credits:', error);
    throw error;
  }
}

// Activate subscription for user
async function activateSubscription(db: D1Database, email: string, subscriptionId: string, planType: string) {
  try {
    // Check if user exists
    const user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      console.log(`User ${email} not found for subscription activation`);
      return;
    }

    // Record subscription (for now just log)
    console.log(`Activating subscription ${subscriptionId} for user ${email}, plan: ${planType}`);

  } catch (error) {
    console.error('Error activating subscription:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();
    const eventType = payload.event_type;

    console.log('PayPal Webhook received:', eventType, payload.id);

    // Get database
    const env = process.env as { DB?: D1Database } & { [key: string]: unknown };
    const db = env.DB;

    // Handle different event types
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.APPROVED': {
        // One-time payment completed - add credits to user
        const customId = payload.resource?.custom_id || '';
        const transactionId = payload.resource?.id || '';
        
        // Parse custom ID: userId-planType-timestamp or email-planType-timestamp
        const parts = customId.split('-');
        if (parts.length < 2) {
          console.error('Invalid custom_id format:', customId);
          break;
        }

        // Handle email containing hyphens (rare but possible)
        let userEmail, packageType;
        if (parts[0].includes('@')) {
          // Email is first part (no hyphens in email)
          userEmail = parts[0];
          packageType = parts[1];
        } else {
          // Could be userId-planType-timestamp format
          // Try to find the package type part
          const validPackages = ['S', 'M', 'L', 'starter_monthly', 'pro_monthly', 'pro_yearly'];
          const packageIndex = parts.findIndex((p: string) => validPackages.includes(p));
          if (packageIndex > 0) {
            userEmail = parts.slice(0, packageIndex).join('-');
            packageType = parts[packageIndex];
          } else {
            console.error('Could not parse custom_id:', customId);
            break;
          }
        }

        const credits = CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES]?.credits || 0;
        
        if (db && userEmail) {
          await addCreditsToUser(db, userEmail, credits, transactionId);
        } else {
          console.log('DB not available or no email, logging transaction:', { customId, transactionId, credits });
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        // Subscription started - activate monthly quota
        const subscriptionId = payload.resource?.id || '';
        const customId = payload.resource?.subscriber?.custom_id || '';
        const planType = customId.split('-')[1] || '';

        if (db && customId) {
          const email = customId.split('-')[0];
          if (email.includes('@')) {
            await activateSubscription(db, email, subscriptionId, planType);
          }
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log('Subscription cancelled:', payload.resource?.id);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        console.log('Subscription ended:', payload.resource?.id);
        break;

      default:
        console.log('Unhandled webhook event:', eventType);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
