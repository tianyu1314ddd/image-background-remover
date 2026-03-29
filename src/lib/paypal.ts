// PayPal API utilities for Cloudflare Pages (Edge Runtime compatible)
// Uses native fetch instead of PayPal Node SDK

export interface Env {
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_MODE: string;
  CNY_TO_USD_RATE: string;
  PAYPAL_BUSINESS_EMAIL: string;
}

// Product and Price IDs for PayPal (created in PayPal Dashboard)
export interface ProductMapping {
  productId: string;
  priceId: string;
}

// Pricing configuration (CNY prices, will be converted to USD)
export const CREDIT_PACKAGES = {
  'S': { name: '积分包 S', credits: 10, priceCNY: 7 },
  'M': { name: '积分包 M', credits: 50, priceCNY: 35 },
  'L': { name: '积分包 L', credits: 120, priceCNY: 69 },
} as const;

export const SUBSCRIPTION_PLANS = {
  'starter_monthly': { name: 'Starter 月付', monthlyQuota: 50, priceCNY: 14 },
  'pro_monthly': { name: 'Pro 月付', monthlyQuota: 200, priceCNY: 35 },
  'pro_yearly': { name: 'Pro 年付', monthlyQuota: 200, priceCNY: 336 },
} as const;

// Get PayPal API base URL
function getPaypalBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.PAYPAL_MODE === 'production') {
    return 'https://api-m.paypal.com';
  }
  return 'https://api-m.sandbox.paypal.com';
}

// Get PayPal SDK URL
export function getPaypalSdkUrl(clientId: string): string {
  const baseUrl = typeof process !== 'undefined' && process.env.PAYPAL_MODE === 'production'
    ? 'https://paypal.com/sdk/js'
    : 'https://www.paypal.com/sdk/js';
  return `${baseUrl}?client-id=${clientId}&currency=USD&intent=capture`;
}

// Convert CNY to USD (2 decimal places)
export function cnyToUsd(cnyPrice: number, rate: number = 0.14): number {
  const usd = cnyPrice * rate;
  return Math.round(usd * 100) / 100; // Round to 2 decimal places
}

// Get Access Token for PayPal API
export async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const baseUrl = getPaypalBaseUrl();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Create a one-time payment order (for credit packages)
export async function createOrder(
  accessToken: string,
  amountUSD: number,
  description: string,
  customId: string // Unique order identifier (e.g., user email + package type)
): Promise<{ orderId: string; approvalUrl: string }> {
  const baseUrl = getPaypalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': customId,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amountUSD.toFixed(2),
          },
          description,
          custom_id: customId,
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal order: ${error}`);
  }

  const order = await response.json();
  
  // Find approval URL
  const approvalUrl = order.links?.find((link: any) => link.rel === 'approve')?.href || '';
  
  return { orderId: order.id, approvalUrl };
}

// Capture an order after user approval
export async function captureOrder(accessToken: string, orderId: string): Promise<{
  status: string;
  payerEmail?: string;
  transactionId?: string;
}> {
  const baseUrl = getPaypalBaseUrl();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to capture PayPal order: ${error}`);
  }

  const order = await response.json();
  
  return {
    status: order.status,
    payerEmail: order.payer?.email_address,
    transactionId: order.purchase_units?.[0]?.payments?.captures?.[0]?.id,
  };
}

// Create a subscription (for monthly plans)
export async function createSubscription(
  accessToken: string,
  planId: string,
  description: string,
  customId: string
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const baseUrl = getPaypalBaseUrl();

  const response = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': customId,
    },
    body: JSON.stringify({
      plan_id: planId,
      start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Start in 1 hour
      subscriber: {
        custom_id: customId,
      },
      application_context: {
        brand_name: 'BG Remover',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://imagebackgroundsremover.shop'}/payment/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://imagebackgroundsremover.shop'}/payment/cancel`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PayPal subscription: ${error}`);
  }

  const subscription = await response.json();
  
  const approvalUrl = subscription.links?.find((link: any) => link.rel === 'approve')?.href || '';
  
  return { subscriptionId: subscription.id, approvalUrl };
}

// Verify webhook signature (for production webhook validation)
export async function verifyWebhookSignature(
  accessToken: string,
  webhookId: string,
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const baseUrl = getPaypalBaseUrl();

  const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return result.verification_status === 'SUCCESS';
}
