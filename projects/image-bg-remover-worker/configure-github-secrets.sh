#!/bin/bash

# GitHub Secrets 配置脚本
# 用于配置 NextAuth.js 和 Cloudflare 相关的环境变量

echo "=== GitHub Secrets 配置脚本 ==="
echo

# 生成 NEXTAUTH_SECRET
if [ -z "$NEXTAUTH_SECRET" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "生成 NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
fi

echo
echo "=== 需要配置的 GitHub Secrets ==="
echo "请将以下环境变量配置到 GitHub 仓库的 Secrets 中："
echo
echo "1. GOOGLE_CLIENT_ID"
echo "   值: 404300094669-raplltqofch4kq0bco3hokten7plh0to.apps.googleusercontent.com"
echo
echo "2. GOOGLE_CLIENT_SECRET" 
echo "   值: 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"
echo
echo "3. NEXTAUTH_SECRET"
echo "   值: $NEXTAUTH_SECRET"
echo
echo "4. CLOUDFLARE_API_TOKEN"
echo "   值: [请手动配置您的 Cloudflare API Token]"
echo
echo "5. CLOUDFLARE_ACCOUNT_ID" 
echo "   值: 5028df5b5a30cfaa9740f9770cd87ded"
echo
echo "=== 配置步骤 ==="
echo "1. 进入 GitHub 仓库页面"
echo "2. 点击 Settings > Secrets and variables > Actions"
echo "3. 点击 'New repository secret'"
echo "4. 输入 Secret 名称和对应的值"
echo "5. 重复步骤 3-4 直到所有 Secrets 都配置完成"
echo
echo "=== 本地开发环境变量配置 ==="
echo "创建 .env.local 文件用于本地开发..."
echo

# 创建 .env.local 文件
cat > .env.local << EOF
GOOGLE_CLIENT_ID=404300094669-raplltqofch4kq0bco3hokten7plh0to.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
CLOUDFLARE_API_TOKEN=[请手动配置]
CLOUDFLARE_ACCOUNT_ID=5028df5b5a30cfaa9740f9770cd87ded
EOF

echo "已创建 .env.local 文件"
echo
echo "=== 验证配置 ==="
echo "请确保以下文件已正确配置："
echo "- wrangler.toml (已配置 database_id)"
echo "- .env.local (已创建，包含本地开发环境变量)"
echo
echo "=== 下一步 ==="
echo "1. 配置 GitHub Secrets 后，推送代码到 GitHub"
echo "2. 等待 GitHub Actions 自动部署到 Cloudflare Pages"
echo "3. 访问部署地址: https://imagebackgroundsremover.shop"
echo
echo "脚本执行完成！"