// API Route: Create PayPal subscription for monthly plans
// POST /api/paypal/create-subscription

import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, createSubscription, SUBSCRIPTION_PLANS, cnyToUsd } from '@/lib/paypal';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { planType, userId, userEmail } = await request.json();

    // Validate plan type
    if (!planType || !SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid subscription plan type' },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS];

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'PayPal not configured' },
        { status: 500 }
      );
    }

    // Generate unique subscription ID
    const customId = `${userId || 'anonymous'}-${planType}-${Date.now()}`;

    // Create PayPal subscription
    const { subscriptionId, approvalUrl } = await createSubscription(
      await getAccessToken(clientId, clientSecret),
      planType, // This should be the PayPal Plan ID created in PayPal Dashboard
      `${plan.name} - ${plan.monthlyQuota} credits/month`,
      customId
    );

    return NextResponse.json({
      subscriptionId,
      approvalUrl,
      planDetails: {
        type: planType,
        name: plan.name,
        monthlyQuota: plan.monthlyQuota,
        priceCNY: plan.priceCNY,
      },
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
