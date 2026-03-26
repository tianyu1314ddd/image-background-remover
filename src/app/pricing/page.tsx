'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PayPalButton from '@/components/paypal/PayPalButton';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceCNY: number;
  credits?: string;
  monthlyQuota?: string;
  features: string[];
  highlighted?: boolean;
  isFree?: boolean;
  buttonText?: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    priceCNY: 0,
    credits: '3',
    features: [
      '注册赠送 3 积分',
      '每月 5 次免费额度',
      '积分永久有效',
      '基础图片处理',
      '最大 25MB 图片'
    ],
    buttonText: '当前方案',
    isFree: true
  },
  {
    id: 'S',
    name: '积分包 S',
    price: '¥7',
    priceCNY: 7,
    credits: '10',
    features: [
      '10 积分永久有效',
      '不限制使用时间',
      '适合偶尔使用',
      '最大 25MB 图片',
      '优先处理队列'
    ],
    buttonText: '购买积分包'
  },
  {
    id: 'M',
    name: '积分包 M',
    price: '¥35',
    priceCNY: 35,
    credits: '50',
    features: [
      '50 积分永久有效',
      '不限制使用时间',
      '适合经常使用',
      '最大 25MB 图片',
      '优先处理队列'
    ],
    buttonText: '购买积分包',
    highlighted: true
  },
  {
    id: 'L',
    name: '积分包 L',
    price: '¥69',
    priceCNY: 69,
    credits: '120',
    features: [
      '120 积分永久有效',
      '不限制使用时间',
      '适合重度使用',
      '最大 25MB 图片',
      '优先处理队列'
    ],
    buttonText: '购买积分包'
  }
];

const subscriptionTiers: PricingTier[] = [
  {
    id: 'starter_monthly',
    name: 'Starter 月付',
    price: '¥14',
    priceCNY: 14,
    monthlyQuota: '50',
    features: [
      '每月 50 次处理',
      '自动续费',
      '商用授权',
      '优先处理队列'
    ]
  },
  {
    id: 'pro_monthly',
    name: 'Pro 月付',
    price: '¥35',
    priceCNY: 35,
    monthlyQuota: '200',
    features: [
      '每月 200 次处理',
      '自动续费',
      '商用授权',
      '优先处理队列'
    ],
    highlighted: true
  },
  {
    id: 'pro_yearly',
    name: 'Pro 年付',
    price: '¥336',
    priceCNY: 336,
    monthlyQuota: '200',
    features: [
      '每月 200 次处理',
      '年付 8 折优惠',
      '商用授权',
      '优先处理队列'
    ]
  }
];

function PurchaseModal({ 
  tier, 
  onClose, 
  onSuccess 
}: { 
  tier: PricingTier; 
  onClose: () => void; 
  onSuccess: (transactionId: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (transactionId: string) => {
    onSuccess(transactionId);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-2">{tier.name}</h3>
        
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-gray-900">¥{tier.priceCNY}</span>
          <span className="text-gray-500 text-sm">
            ≈ ${(tier.priceCNY * 0.14).toFixed(2)} USD
          </span>
        </div>

        {tier.credits && (
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm mb-4 inline-block">
            {tier.credits} 积分
          </div>
        )}

        {tier.monthlyQuota && (
          <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-sm mb-4 inline-block">
            {tier.monthlyQuota} 次/月
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="mt-4">
          <PayPalButton
            amount={tier.priceCNY}
            packageType={tier.id}
            packageName={tier.name}
            credits={parseInt(tier.credits || tier.monthlyQuota || '0')}
            onSuccess={handleSuccess}
            onError={handleError}
            onCancel={handleCancel}
          />
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          支付完成后积分将自动添加到您的账户
        </p>
      </div>
    </div>
  );
}

function SuccessModal({
  transactionId,
  packageName,
  onClose
}: {
  transactionId: string;
  packageName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">支付成功！</h3>
        <p className="text-gray-600 mb-4">
          您已成功购买 <strong>{packageName}</strong>
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500 mb-4">
          交易ID: {transactionId}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          积分已添加到您的账户，请刷新页面查看
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          完成
        </button>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [successData, setSuccessData] = useState<{transactionId: string; packageName: string} | null>(null);

  // Debug: Check PayPal configuration
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const isPaypalConfigured = !!paypalClientId;

  const handlePurchase = (tier: PricingTier) => {
    if (tier.isFree) return;
    setSelectedTier(tier);
  };

  const handleSuccess = (transactionId: string) => {
    if (selectedTier) {
      setSuccessData({
        transactionId,
        packageName: selectedTier.name
      });
      setSelectedTier(null);
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessData(null);
    // Refresh the page to show updated credits
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🖼️</span>
              <span className="text-xl font-bold text-gray-800">BG Remover</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/faq')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                FAQ
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Debug Banner */}
      <div className={`py-2 text-center text-sm font-mono ${isPaypalConfigured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {isPaypalConfigured 
          ? `✓ PayPal 配置正确 (Client ID: ${paypalClientId?.slice(0, 10)}...)` 
          : '✗ PayPal 未配置 (NEXT_PUBLIC_PAYPAL_CLIENT_ID 为空)'}
      </div>

      {/* Pricing Content */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">定价方案</h1>
          <p className="text-lg text-gray-600">
            选择适合您的方案，随时购买更多积分
          </p>
        </div>

        {/* Credit Packages */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">积分包（永久有效）</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`bg-white rounded-2xl shadow-lg p-6 ${
                  tier.highlighted ? 'ring-2 ring-blue-500 relative' : ''
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                    推荐
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                </div>
                {tier.credits && (
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm mb-4 inline-block">
                    {tier.credits} 积分
                  </div>
                )}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-600 text-sm">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePurchase(tier)}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    tier.isFree
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  disabled={tier.isFree}
                >
                  {tier.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Plans */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">月付订阅（自动续费）</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {subscriptionTiers.map((tier) => (
              <div
                key={tier.id}
                className={`bg-white rounded-2xl shadow-lg p-6 ${
                  tier.highlighted ? 'ring-2 ring-purple-500 relative' : ''
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                    最受欢迎
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{tier.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                </div>
                {tier.monthlyQuota && (
                  <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-sm mb-4 inline-block">
                    {tier.monthlyQuota} 次/月
                  </div>
                )}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-gray-600 text-sm">
                      <span className="text-purple-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed">
                  即将推出
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Notice */}
        <div className="mt-12 text-center">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-2xl mx-auto">
            <p className="text-green-800 text-sm">
              💳 支持 PayPal 支付（USD）<br/>
              <span className="text-green-600">价格已按实时汇率转换</span>
            </p>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            还有疑问？
            <button
              onClick={() => router.push('/faq')}
              className="text-blue-600 hover:underline ml-1"
            >
              查看常见问题
            </button>
          </p>
        </div>
      </section>

      {/* Purchase Modal */}
      {selectedTier && (
        <PurchaseModal
          tier={selectedTier}
          onClose={() => setSelectedTier(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Success Modal */}
      {successData && (
        <SuccessModal
          transactionId={successData.transactionId}
          packageName={successData.packageName}
          onClose={handleSuccessModalClose}
        />
      )}
    </main>
  );
}
