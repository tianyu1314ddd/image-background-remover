// API Route: Create PayPal order for credit package purchase
// POST /api/paypal/create-order

import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, createOrder, CREDIT_PACKAGES, cnyToUsd } from '@/lib/paypal';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { packageType, userId, userEmail } = await request.json();

    // Validate package type
    if (!packageType || !CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES]) {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    const pkg = CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES];
    
    // Get PayPal credentials
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'PayPal not configured' },
        { status: 500 }
      );
    }

    // Get exchange rate (default 0.14 if not set)
    const rate = parseFloat(process.env.CNY_TO_USD_RATE || '0.14');
    const amountUSD = cnyToUsd(pkg.priceCNY, rate);

    // Generate unique order ID
    const customId = `${userId || 'anonymous'}-${packageType}-${Date.now()}`;

    // Create PayPal order
    const { orderId, approvalUrl } = await createOrder(
      await getAccessToken(clientId, clientSecret),
      amountUSD,
      `${pkg.name} - ${pkg.credits} Credits`,
      customId
    );

    return NextResponse.json({
      orderId,
      approvalUrl,
      amountUSD,
      packageDetails: {
        type: packageType,
        name: pkg.name,
        credits: pkg.credits,
        priceCNY: pkg.priceCNY,
      },
    });

  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
