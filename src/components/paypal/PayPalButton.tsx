'use client';

import { useEffect, useId, useState } from 'react';
import { cnyToUsd } from '@/lib/paypal';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => { render: (selector: string) => void };
    };
  }
}

interface PayPalButtonProps {
  amount: number; // Price in CNY
  currency?: string;
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
  currency = 'CNY',
  packageType,
  packageName,
  credits,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
}: PayPalButtonProps) {
  // Use React useId for stable ID that won't change between renders
  const reactId = useId();
  const containerId = `paypal-button-${reactId.replace(/:/g, '')}`;
  const [isLoading, setIsLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonsRendered, setButtonsRendered] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  const rate = 0.14; // CNY to USD rate
  const amountUSD = cnyToUsd(amount, rate);

  // Load PayPal SDK
  useEffect(() => {
    if (!clientId) {
      setError('PayPal not configured');
      return;
    }

    // Check if SDK already loaded
    if (window.paypal) {
      setSdkReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.async = true;

    script.onload = () => {
      setSdkReady(true);
    };

    script.onerror = () => {
      setError('Failed to load PayPal SDK');
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup not needed for SDK script
    };
  }, [clientId]);

  // Render PayPal buttons when SDK is ready
  useEffect(() => {
    if (!sdkReady || !window.paypal || disabled || buttonsRendered) {
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Clear any existing content
      container.innerHTML = '';

      window.paypal
        ?.Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay',
          },
          createOrder: async (data: any, actions: any) => {
            setIsLoading(true);
            try {
              // Call backend to create order
              const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  packageType,
                  userId: 'current-user', // TODO: Get from auth context
                  userEmail: 'user@example.com', // TODO: Get from auth context
                }),
              });

              if (!response.ok) {
                throw new Error('Failed to create order');
              }

              const { orderId } = await response.json();
              return orderId;
            } catch (err) {
              setError('Failed to create order');
              throw err;
            } finally {
              setIsLoading(false);
            }
          },
          onApprove: async (data: any, actions: any) => {
            try {
              // Capture the order
              const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: data.orderID }),
              });

              if (!response.ok) {
                throw new Error('Failed to capture order');
              }

              const result = await response.json();

              if (result.success) {
                onSuccess?.(result.transactionId || data.orderID);
              } else {
                throw new Error('Payment was not completed');
              }
            } catch (err) {
              onError?.(err instanceof Error ? err.message : 'Payment failed');
            }
          },
          onCancel: () => {
            onCancel?.();
          },
          onError: (err: any) => {
            console.error('PayPal button error:', err);
            onError?.('Payment failed');
          },
        })
        .render(`#${containerId}`);

      setButtonsRendered(true);
    }, 100);

    return () => clearTimeout(timer);

  }, [sdkReady, disabled, packageType, onSuccess, onError, onCancel, amountUSD, containerId, buttonsRendered]);

  if (disabled) {
    return (
      <button
        disabled
        className="w-full py-3 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
      >
        即将推出
      </button>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="text-red-500 text-sm mb-2">{error}</div>
        <button
          disabled
          className="w-full py-3 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
        >
          PayPal 暂不可用
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Price display */}
      <div className="text-center mb-3">
        <span className="text-gray-600 text-sm">
          ¥{amount} ≈ ${amountUSD.toFixed(2)} USD
        </span>
      </div>

      {/* PayPal buttons container */}
      <div 
        id={containerId}
        className={`min-h-[44px] ${isLoading ? 'opacity-50' : ''}`} 
      />

      {isLoading && (
        <div className="text-center text-sm text-gray-500 mt-2">
          处理中...
        </div>
      )}
    </div>
  );
}
