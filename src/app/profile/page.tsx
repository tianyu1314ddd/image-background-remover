'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface UserData {
  email: string;
  name: string;
  credits: number;
  monthlyUsage: number;
  monthlyQuota: number;
  quotaResetDate: string;
  memberSince: string;
}

interface Transaction {
  id: string;
  packageType: string;
  credits: number;
  amountCNY: number;
  amountUSD: number;
  status: string;
  completedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/');
      return;
    }

    try {
      const userData = JSON.parse(stored);
      setToken(userData.token);
      setUser(userData);
    } catch {
      localStorage.removeItem('user');
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchQuota = async () => {
      try {
        const response = await fetch(`/api/user/quota?token=${token}`);
        const data = await response.json();
        
        if (data.success) {
          setUser(prev => prev ? { ...prev, ...data.data } : null);
        }
      } catch (error) {
        console.error('Failed to fetch quota:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuota();
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/user/transactions?token=${token}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, [token]);

  const handleShowTransactionHistory = useCallback(() => {
    if (!showTransactionHistory) {
      fetchTransactions();
    }
    setShowTransactionHistory(!showTransactionHistory);
  }, [showTransactionHistory, fetchTransactions]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    router.push('/');
  }, [router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  const remainingMonthly = Math.max(0, user.monthlyQuota - user.monthlyUsage);
  const totalCredits = user.credits;
  const totalRemaining = totalCredits + remainingMonthly;

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
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">个人中心</h1>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <p className="text-gray-400 text-xs mt-1">
                注册时间：{user.memberSince}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            退出登录
          </button>
        </div>

        {/* Quota Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Credits Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">💰</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">永久积分</span>
            </div>
            <p className="text-green-100 text-sm mb-1">购买积分</p>
            <p className="text-4xl font-bold mb-1">{totalCredits}</p>
            <p className="text-green-100 text-sm">积分永久有效，用完为止</p>
          </div>

          {/* Monthly Quota Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">📅</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">月度免费</span>
            </div>
            <p className="text-blue-100 text-sm mb-1">本月剩余</p>
            <p className="text-4xl font-bold mb-1">{remainingMonthly}</p>
            <p className="text-blue-100 text-sm">/{user.monthlyQuota} 次 · {user.quotaResetDate} 重置</p>
          </div>
        </div>

        {/* Total Remaining */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">可用总额</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-gray-900">{totalRemaining}</p>
              <p className="text-gray-500 text-sm">次处理可用</p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{totalCredits}</p>
                <p className="text-gray-400 text-xs">积分</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{remainingMonthly}</p>
                <p className="text-gray-400 text-xs">月度</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        {totalRemaining < 3 && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 text-white text-center">
            <h3 className="text-xl font-semibold mb-2">积分即将用完？</h3>
            <p className="text-purple-100 mb-4">购买积分包，享受更多处理次数！</p>
            <button
              onClick={() => router.push('/pricing')}
              className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              前往购买 →
            </button>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">充值记录</h3>
            <button
              onClick={handleShowTransactionHistory}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showTransactionHistory ? '收起' : '查看全部'}
            </button>
          </div>
          
          {showTransactionHistory && (
            <>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">📭</span>
                  <p>暂无充值记录</p>
                  <p className="text-sm">购买积分后将显示在这里</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b">
                        <th className="pb-3 font-medium">时间</th>
                        <th className="pb-3 font-medium">套餐</th>
                        <th className="pb-3 font-medium text-right">积分</th>
                        <th className="pb-3 font-medium text-right">金额</th>
                        <th className="pb-3 font-medium text-right">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="border-b last:border-0">
                          <td className="py-3 text-sm text-gray-600">
                            {new Date(tx.completedAt).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 text-sm text-gray-800">
                            {getPackageName(tx.packageType)}
                          </td>
                          <td className="py-3 text-sm text-green-600 text-right font-medium">
                            +{tx.credits}
                          </td>
                          <td className="py-3 text-sm text-gray-600 text-right">
                            {tx.amountCNY > 0 ? `¥${tx.amountCNY}` : `$${tx.amountUSD?.toFixed(2)}`}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              tx.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {tx.status === 'completed' ? '已完成' : tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactions.length > 10 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                      还有 {transactions.length - 10} 条记录...
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">快捷链接</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/pricing')}
              className="p-4 text-left border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl mb-2 block">💎</span>
              <p className="font-medium text-gray-800">定价方案</p>
              <p className="text-sm text-gray-500">查看积分包和订阅选项</p>
            </button>
            <button
              onClick={() => router.push('/faq')}
              className="p-4 text-left border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl mb-2 block">❓</span>
              <p className="font-medium text-gray-800">常见问题</p>
              <p className="text-sm text-gray-500">了解产品使用说明</p>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

// Helper function to get package display name
function getPackageName(packageType: string): string {
  const packageNames: Record<string, string> = {
    'S': '积分包 S',
    'M': '积分包 M',
    'L': '积分包 L',
    'starter_monthly': 'Starter 月付',
    'pro_monthly': 'Pro 月付',
    'pro_yearly': 'Pro 年付',
    'credit_package': '积分充值',
  };
  return packageNames[packageType] || packageType;
}
