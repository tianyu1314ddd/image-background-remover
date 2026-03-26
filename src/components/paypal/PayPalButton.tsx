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
    if (!clientId) {
      setStatus('error');
      setErrorMsg('PayPal Client ID not configured');
      return;
    }

    // Already loaded
    if (window.paypal) {
      setStatus('ready');
      return;
    }

    setStatus('loading');

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
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

        paypalWindow
          .Buttons({
            style: {
              layout: 'vertical',
              color: 'blue',
              shape: 'rect',
              label: 'pay',
            },
            createOrder: (_data: unknown, actions: { order: { create: (config: Record<string, unknown>) => Promise<string> } }) => {
              return actions.order.create({
                purchase_units: [
                  {
                    description: `${packageName} - ${credits} Credits`,
                    amount: {
                      currency_code: 'USD',
                      value: amountUSD.toFixed(2),
                    },
                  },
                ],
              });
            },
            onApprove: async (_data: { orderID: string }, actions: { order: { capture: () => Promise<Record<string, unknown>> } }) => {
              try {
                const result = await actions.order.capture();
                const purchaseUnits = result.purchase_units as Array<{ payments?: { captures?: Array<{ id: string }> } }>;
                const transactionId = purchaseUnits?.[0]?.payments?.captures?.[0]?.id || '';
                onSuccess?.(transactionId);
              } catch {
                onError?.('Payment capture failed');
              }
            },
            onCancel: () => {
              onCancel?.();
            },
            onError: (err: unknown) => {
              console.error('PayPal error:', err);
              onError?.('Payment failed');
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
          ¥{amount} ≈ ${amountUSD.toFixed(2)} USD
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
        ¥{amount} ≈ ${amountUSD.toFixed(2)} USD
      </div>
      <div id={containerId} className="min-h-[44px]" />
    </div>
  );
}
