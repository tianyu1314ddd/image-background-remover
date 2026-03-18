# Image Background Remover

一款在线 AI 图片背景去除工具，用户上传图片后自动去除背景，支持下载透明背景或替换为纯色背景的图片。

## 功能特性

- ⚡ **快速处理** - 上传即处理，秒级出结果
- 🎯 **精准抠图** - Remove.bg API，业界顶级精度
- 🔒 **隐私安全** - 图片不存储，用完即销
- 📱 **响应式设计** - 完美适配移动端和桌面端

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **AI 能力**: Remove.bg API
- **部署**: Cloudflare Pages + Workers (推荐)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填入你的 Remove.bg API Key：

```bash
cp .env.example .env.local
```

在 `.env.local` 中填入：

```
REMOVE_BG_API_KEY=your_api_key_here
```

> 获取 API Key: https://www.remove.bg/api

### 3. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 查看效果。

## 部署

### Cloudflare Pages

1. 连接 GitHub 仓库到 Cloudflare Pages
2. 设置环境变量 `REMOVE_BG_API_KEY`
3. 部署

### Vercel

```bash
npm run build
vercel --prod
```

## 使用说明

1. 点击或拖拽上传图片（支持 JPG、PNG、WebP，最大 25MB）
2. 等待 AI 自动处理（通常几秒钟）
3. 预览去背景效果，可切换背景色查看
4. 点击下载按钮保存透明 PNG 图片

## License

MIT

---

Made with ❤️ using Next.js and Remove.bg API
