// API Route: Capture PayPal order after user approval
// POST /api/paypal/capture-order

import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, captureOrder } from '@/lib/paypal';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'PayPal not configured' },
        { status: 500 }
      );
    }

    // Capture the order
    const result = await captureOrder(
      await getAccessToken(clientId, clientSecret),
      orderId
    );

    return NextResponse.json({
      success: result.status === 'COMPLETED',
      status: result.status,
      transactionId: result.transactionId,
      payerEmail: result.payerEmail,
    });

  } catch (error) {
    console.error('Capture order error:', error);
    return NextResponse.json(
      { error: 'Failed to capture order' },
      { status: 500 }
    );
  }
}
