#!/bin/bash

# 完整部署脚本
# 用于部署 Image Background Remover 项目到 Cloudflare Pages

echo "=== Image Background Remover 部署脚本 ==="
echo

# 检查当前目录
echo "当前目录: $(pwd)"
echo

# 检查文件是否存在
echo "=== 检查必要文件 ==="
files=("index.js" "package.json" "wrangler.toml" "schema.sql")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
        exit 1
    fi
done
echo

# 检查 Git 状态
echo "=== Git 状态检查 ==="
if git status --porcelain; then
    echo "✅ Git 工作区干净"
else
    echo "⚠️  Git 工作区有未提交的更改"
    echo "准备添加所有文件到 Git..."
    git add .
    echo "✅ 所有文件已添加到 Git"
fi
echo

# 检查是否连接到远程仓库
echo "=== 远程仓库检查 ==="
if git remote -v; then
    echo "✅ 已配置远程仓库"
else
    echo "❌ 未配置远程仓库"
    echo "请先配置远程仓库："
    echo "git remote add origin <your-github-repo-url>"
    echo "git push -u origin main"
    exit 1
fi
echo

# 提交代码
echo "=== 提交代码 ==="
git commit -m "feat: 初始部署配置完成

- 配置了 GitHub Secrets 脚本
- 更新了 wrangler.toml 配置
- 添加了环境变量配置
- 准备部署到 Cloudflare Pages

🤖 Generated with OpenClaw"

if [ $? -eq 0 ]; then
    echo "✅ 代码提交成功"
else
    echo "⚠️  没有需要提交的更改"
fi
echo

# 推送到远程仓库
echo "=== 推送到远程仓库 ==="
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功"
    echo "🔄 等待 GitHub Actions 自动部署..."
    echo
    echo "=== 部署状态检查 ==="
    echo "您可以访问以下链接查看部署状态："
    echo "https://github.com/$(git remote get-url origin | sed 's/.*://' | sed 's/\.git$//')/actions"
    echo
    echo "=== 预期部署地址 ==="
    echo "部署完成后，访问地址："
    echo "https://imagebackgroundsremover.shop"
    echo
    echo "=== 后续步骤 ==="
    echo "1. 等待 GitHub Actions 完成部署"
    echo "2. 检查部署日志是否有错误"
    echo "3. 访问部署地址测试功能"
    echo "4. 如有问题，请检查 GitHub Secrets 配置"
else
    echo "❌ 代码推送失败"
    echo "请检查网络连接和远程仓库配置"
    exit 1
fi
echo

echo "=== 部署脚本执行完成 ==="