'use client';

import { useEffect, useState } from 'react';
import { cnyToUsd } from '@/lib/paypal';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: Record<string, unknown>) => { render: (selector: string) => void };
    };
  }
}

interface PayPalButtonProps {
  amount: number;
  packageType: string;
  packageName: string;
  credits: number;
  userEmail?: string; // Required to identify user in webhook
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export default function PayPalButton({
  amount,
  packageType,
  packageName,
  credits,
  userEmail,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}: PayPalButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [containerId] = useState(() => `paypal-btn-${packageType}-${Math.random().toString(36).slice(2, 9)}`);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const amountUSD = cnyToUsd(amount, 0.14);

  // Load PayPal SDK once
  useEffect(() => {
    console.log('[PayPalButton] Mounting, clientId:', clientId ? `${clientId.slice(0, 10)}...` : 'EMPTY/MISSING');
    
    if (!clientId) {
      console.error('[PayPalButton] Client ID is empty!');
      setStatus('error');
      setErrorMsg('PayPal Client ID not configured - build env var missing');
      return;
    }

    // Already loaded
    if (window.paypal) {
      console.log('[PayPalButton] SDK already loaded');
      setStatus('ready');
      return;
    }

    console.log('[PayPalButton] Loading PayPal SDK...');
    setStatus('loading');

    const script = document.createElement('script');
    const mode = process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox';
    const baseUrl = mode === 'sandbox'
      ? 'https://www.sandbox.paypal.com/sdk/js'
      : 'https://www.paypal.com/sdk/js';
    script.src = `${baseUrl}?client-id=${clientId}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => {
      setStatus('ready');
    };
    script.onerror = () => {
      setStatus('error');
      setErrorMsg('Failed to load PayPal SDK');
    };
    document.body.appendChild(script);
  }, [clientId]);

  // Render buttons when SDK is ready
  useEffect(() => {
    if (status !== 'ready' || disabled) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Small delay to ensure container is in DOM
    const timeout = setTimeout(() => {
      try {
        const paypalWindow = window.paypal;
        if (!paypalWindow) {
          setStatus('error');
          setErrorMsg('PayPal SDK not available');
          return;
        }

        // Store customId in closure so we can use it in onApprove
        let storedCustomId = '';
        
        paypalWindow
          .Buttons({
            style: {
              layout: 'vertical',
              color: 'blue',
              shape: 'rect',
              label: 'pay',
            },
            createOrder: (_data: unknown, actions: { order: { create: (config: Record<string, unknown>) => Promise<string> } }) => {
              // Build custom_id: email-packageType-timestamp
              // This is critical for webhook to identify the user and package
              const timestamp = Date.now();
              storedCustomId = userEmail 
                ? `${userEmail}-${packageType}-${timestamp}`
                : `unknown-${packageType}-${timestamp}`;
              
              const orderConfig = {
                intent: 'CAPTURE',
                purchase_units: [
                  {
                    description: `${packageName} - ${credits} Credits`,
                    amount: {
                      currency_code: 'USD',
                      value: amountUSD.toFixed(2),
                    },
                    custom_id: storedCustomId, // Critical: links payment to user
                  },
                ],
              };
              console.log('[PayPal] createOrder called with:', JSON.stringify(orderConfig));
              return actions.order.create(orderConfig).catch((err: unknown) => {
                console.error('[PayPal] createOrder error:', err);
                throw err;
              });
            },
            onApprove: async (_data: { orderID: string }, actions: { order: { capture: () => Promise<Record<string, unknown>> } }) => {
              console.log('[PayPal] onApprove, orderID:', _data.orderID);
              try {
                const result = await actions.order.capture();
                console.log('[PayPal] capture result:', JSON.stringify(result));
                const purchaseUnits = result.purchase_units as Array<{ payments?: { captures?: Array<{ id: string }> } }>;
                const transactionId = purchaseUnits?.[0]?.payments?.captures?.[0]?.id || '';
                
                // Call add-credits API directly as backup (in case webhook fails)
                if (storedCustomId && userEmail) {
                  try {
                    const addCreditsResponse = await fetch('/api/paypal/add-credits', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        orderId: _data.orderID,
                        customId: storedCustomId,
                        transactionId: transactionId,
                        amount: amountUSD,
                      }),
                    });
                    const addCreditsResult = await addCreditsResponse.json();
                    console.log('[PayPal] add-credits API result:', addCreditsResult);
                    
                    if (addCreditsResult.success) {
                      console.log('[PayPal] Credits added successfully via direct API');
                    } else {
                      console.log('[PayPal] add-credits API returned error:', addCreditsResult.error);
                    }
                  } catch (apiError) {
                    console.error('[PayPal] Failed to call add-credits API:', apiError);
                  }
                }
                
                onSuccess?.(transactionId);
              } catch {
                onError?.('Payment capture failed');
              }
            },
            onCancel: () => {
              console.log('[PayPal] onCancel');
              onCancel?.();
            },
            onError: (err: unknown) => {
              console.error('[PayPal] onError:', JSON.stringify(err));
              onError?.(String(err));
            },
          })
          .render(`#${containerId}`);
      } catch (err) {
        console.error('PayPal render error:', err);
        setStatus('error');
        setErrorMsg('Failed to render PayPal button');
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [status, disabled, containerId, packageName, credits, amountUSD, onSuccess, onError, onCancel]);

  if (disabled) {
    return (
      <button disabled className="w-full py-3 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed">
        即将推出
      </button>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full">
        {errorMsg && (
          <div className="text-red-500 text-xs mb-2 text-center">{errorMsg}</div>
        )}
        <button disabled className="w-full py-3 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed">
          PayPal 暂不可用
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="w-full">
        <div className="text-center mb-3 text-sm text-gray-500">
          ${amountUSD.toFixed(2)} USD
        </div>
        <div className="h-[44px] flex items-center justify-center bg-gray-100 rounded-lg">
          <span className="text-gray-500 text-sm">加载 PayPal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-3 text-sm text-gray-600">
        ${amountUSD.toFixed(2)} USD
      </div>
      <div id={containerId} className="min-h-[44px]" />
    </div>
  );
}
