'use client';

import { useState, useCallback, DragEvent, ChangeEvent } from 'react';
import Image from 'next/image';

type BackgroundType = 'transparent' | 'white' | 'black';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [background, setBackground] = useState<BackgroundType>('transparent');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    // 重置状态
    setError(null);
    setResultImage(null);
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('请上传 JPG、PNG 或 WebP 格式的图片');
      return;
    }

    // 验证文件大小
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('图片大小不能超过 25MB');
      return;
    }

    // 显示原图
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setOriginalFileName(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);

    // 调用 API
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || '处理失败，请稍后重试');
        return;
      }

      setResultImage(data.imageBase64);
    } catch (err) {
      setError('网络错误，请检查连接后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
          <div className="flex items-center gap-2">
            <span className="text-2xl">🖼️</span>
            <span className="text-xl font-bold text-gray-800">BG Remover</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Remove Image Background <span className="text-blue-600">Free</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          上传图片，自动去除背景。支持 JPG、PNG、WebP 格式，无需注册，完全免费。
        </p>
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
            {/* Error Message */}
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

            {/* Loading State */}
            {isLoading && (
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700">正在处理中，请稍候...</span>
                </div>
              </div>
            )}

            {/* Result Display */}
            {resultImage && !isLoading && (
              <>
                {/* Background Toggle */}
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

                {/* Image Comparison */}
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

                {/* Action Buttons */}
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

            {/* Processing state - show original only */}
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

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>© 2026 BG Remover. 您的图片不会被存储。</p>
        </div>
      </footer>
    </main>
  );
}
