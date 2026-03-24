'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: '注册后可以获得多少次免费使用？',
    answer: '新用户注册后立即获得 3 积分，可以永久使用。此外，每月还有 5 次免费额度（每月重置）。'
  },
  {
    question: '积分和月度额度有什么区别？',
    answer: '积分是永久有效的，购买积分包后不会过期。月度额度是每月重置的免费次数，适合轻度使用者。处理图片时会优先扣除积分，再用月度额度。'
  },
  {
    question: '积分包有什么优惠？',
    answer: '积分包 S（10积分 ¥7）、M（50积分 ¥35）、L（120积分 ¥69）。买的越多越划算，积分永久有效。'
  },
  {
    question: '支持哪些图片格式？',
    answer: '支持 JPG、PNG 和 WebP 格式的图片。最大支持 25MB 的图片文件。'
  },
  {
    question: '我的图片会被保存吗？',
    answer: '不会。我们非常重视用户隐私。您的图片在处理完成后会立即删除，不会存储在我们的服务器上。'
  },
  {
    question: '如何购买积分包？',
    answer: '点击"定价方案"页面，选择您需要的积分包，使用 PayPal 进行支付。支付成功后积分会立即到账。'
  },
  {
    question: '支付安全吗？',
    answer: '我们使用 PayPal 作为支付渠道，PayPal 是全球领先的在线支付平台，您的支付信息安全由 PayPal 保障，我们不会存储您的支付信息。'
  },
  {
    question: '积分可以转让给他人吗？',
    answer: '目前积分不支持转让，仅限注册账户本人使用。'
  },
  {
    question: '月度额度会累积吗？',
    answer: '不会。月度额度每月重置，不会累积到下个月。建议在额度充足时使用积分。'
  },
  {
    question: '处理后的图片有商用授权吗？',
    answer: '免费用户和积分包用户默认仅有个人使用授权。订阅用户（即将推出）可获得商用授权。'
  },
  {
    question: 'API 调用失败怎么办？',
    answer: '如果遇到 API 调用失败，请稍后重试。如果问题持续存在，请通过页面底部的联系方式联系我们。'
  },
  {
    question: '如何联系客服？',
    answer: '您可以通过页面底部的联系方式或发送邮件至 support@imagebackgroundsremover.shop 联系我们。'
  }
];

export default function FAQPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🖼️</span>
              <span className="text-xl font-bold text-gray-800">BG Remover</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                定价
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

      {/* FAQ Content */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">常见问题</h1>
          <p className="text-lg text-gray-600">
            找到您想了解的问题答案
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                <span className={`text-gray-400 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-blue-50 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">还有其他问题？</h2>
          <p className="text-gray-600 mb-4">
            没能找到您想要的答案？请联系我们
          </p>
          <a
            href="mailto:support@imagebackgroundsremover.shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>✉️</span>
            发送邮件联系我们
          </a>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            ← 返回首页，开始使用
          </button>
        </div>
      </section>
    </main>
  );
}
