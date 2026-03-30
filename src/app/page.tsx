'use client';

import { useState, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';

type BackgroundType = 'transparent' | 'white' | 'black';

interface User {
  email: string;
  name: string;
  token: string;
}

interface QuotaInfo {
  credits: number;
  monthlyUsage: number;
  monthlyQuota: number;
}

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundType>('transparent');
  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [quota, setQuota] = useState<QuotaInfo>({ credits: 0, monthlyUsage: 0, monthlyQuota: 5 });

  // Check for auth token on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const name = urlParams.get('name');
    const email = urlParams.get('email');

    if (token && (name || email)) {
      // Decode token to get user info if name/email not provided
      try {
        const decoded = JSON.parse(atob(token));
        const userData: User = {
          email: email || decoded.email,
          name: name || decoded.name,
          token: token
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        window.history.replaceState({}, '', '/');
      } catch {
        // Invalid token, clear it
        window.history.replaceState({}, '', '/');
      }
    } else {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
  }, []);

  const handleLogin = useCallback(() => {
    const clientId = '404300094669-raplltqofch4kq0bco3hokten7plh0to.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent('https://imagebackgroundsremover.shop/api/auth/callback');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setResultImage(null);
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('请上传 JPG、PNG 或 WebP 格式的图片');
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('图片大小不能超过 25MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setOriginalFileName(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      if (user) {
        formData.append('token', user.token);
      }

      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        if (data.code === 'NOT_LOGGED_IN' || data.code === 'TOKEN_EXPIRED') {
          setError('请先登录后再使用');
          setUser(null);
          localStorage.removeItem('user');
          return;
        }
        if (data.code === 'QUOTA_EXCEEDED') {
          setError(`额度已用完！今日免费额度 (${quota.monthlyQuota}次) 已用尽，请明天再来或购买积分包`);
          return;
        }
        setError(data.error || '处理失败，请稍后重试');
        return;
      }

      setResultImage(data.imageBase64);
      
      // 更新额度信息
      if (data.remainingCredits !== undefined || data.remainingMonthly !== undefined) {
        setQuota(prev => ({
          ...prev,
          credits: data.remainingCredits ?? prev.credits,
          monthlyUsage: prev.monthlyQuota - (data.remainingMonthly ?? prev.monthlyQuota - 1)
        }));
      }
    } catch (err) {
      setError('网络错误，请检查连接后重试');
    } finally {
      setIsLoading(false);
    }
  }, [user, quota]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDownload = useCallback(() => {
    if (!resultImage) return;
    
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `${originalFileName}-removed-bg.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [resultImage, originalFileName]);

  const handleReset = useCallback(() => {
    setOriginalImage(null);
    setOriginalFileName('');
    setResultImage(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const getBackgroundStyle = () => {
    switch (background) {
      case 'white':
        return { backgroundColor: '#ffffff' };
      case 'black':
        return { backgroundColor: '#000000' };
      default:
        return {
          backgroundImage: `
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          backgroundColor: '#fff',
        };
    }
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
            
            {/* Auth Section */}
            <div>
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <span>👋 {user.name}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      积分: {quota.credits} | 月度: {Math.max(0, quota.monthlyQuota - quota.monthlyUsage)}/{quota.monthlyQuota}
                    </span>
                  </div>
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    个人中心
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  登录 Google
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Remove Image Background <span className="text-blue-600">Free</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          上传图片，自动去除背景。支持 JPG、PNG、WebP 格式。
        </p>
        {user ? (
          <div className="mt-4 flex items-center justify-center gap-4">
            <p className="text-sm text-green-600">
              ✓ 已登录为 {user.email}
            </p>
            <p className="text-xs text-gray-500">
              剩余额度：{quota.credits > 0 ? `${quota.credits} 积分` : `${Math.max(0, quota.monthlyQuota - quota.monthlyUsage)}/${quota.monthlyQuota} 次月度免费`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-blue-600 mt-4">
            🎁 注册即送 3 次免费额度！登录即可使用
          </p>
        )}
      </section>

      {/* Upload Area */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        {!originalImage ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
              transition-all duration-300 bg-white
              ${isDragging 
                ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }
            `}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-xl font-medium text-gray-700 mb-2">
                拖拽图片到此处
              </p>
              <p className="text-gray-500 mb-4">或点击上传</p>
              <p className="text-sm text-gray-400">
                支持 JPG、PNG、WebP · 最大 25MB
              </p>
            </label>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                {error}
                <button
                  onClick={handleReset}
                  className="ml-4 underline hover:no-underline"
                >
                  重新上传
                </button>
              </div>
            )}

            {isLoading && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700">正在处理中，请稍候...</span>
                </div>
              </div>
            )}

            {resultImage && !isLoading && (
              <>
                <div className="flex justify-center gap-2 mb-6">
                  <button
                    onClick={() => setBackground('transparent')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      background === 'transparent'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🔲 透明
                  </button>
                  <button
                    onClick={() => setBackground('white')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      background === 'white'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⬜ 白色
                  </button>
                  <button
                    onClick={() => setBackground('black')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      background === 'black'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ⬛ 黑色
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-2 text-center font-medium">原图</p>
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={originalImage}
                        alt="原图"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2 text-center font-medium">去背景结果</p>
                    <div 
                      className="aspect-square relative rounded-lg overflow-hidden"
                      style={getBackgroundStyle()}
                    >
                      <Image
                        src={resultImage}
                        alt="去背景结果"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleDownload}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <span>⬇️</span>
                    下载 PNG
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    🔄 重新上传
                  </button>
                </div>
              </>
            )}

            {isLoading && !resultImage && (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2 text-center font-medium">原图</p>
                  <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={originalImage}
                      alt="原图"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2 text-center font-medium">处理中...</p>
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">
                      <div className="text-4xl mb-2">✨</div>
                      <p>AI 正在处理</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">快速处理</h3>
            <p className="text-gray-600">上传即处理，秒级出结果</p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">精准抠图</h3>
            <p className="text-gray-600">AI 驱动，业界顶级精度</p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">隐私安全</h3>
            <p className="text-gray-600">图片不存储，用完即销</p>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">需要更多额度？</h2>
          <p className="text-blue-100 mb-6 max-w-xl mx-auto">
            购买积分包享受更多处理次数，积分永久有效。<br/>
            月度免费额度用完？购买积分继续使用！
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = '/pricing'}
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>💎</span>
              查看定价方案
            </button>
            <button
              onClick={() => window.location.href = '/faq'}
              className="px-8 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors"
            >
              常见问题
            </button>
          </div>
          <div className="mt-6 flex justify-center gap-6 text-sm text-blue-100">
            <span>✓ 积分永久有效</span>
            <span>✓ 支付安全</span>
            <span>✓ 随时可用</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>© 2026 BG Remover. 您的图片不会被存储。</p>
        </div>
      </footer>
    </main>
  );
}
