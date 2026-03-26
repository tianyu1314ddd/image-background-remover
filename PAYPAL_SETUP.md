# PayPal 接入配置指南

## 1. PayPal 开发者账号注册

1. 访问 https://developer.paypal.com/
2. 登录或注册 PayPal 全球账号 (paypal.com，不是 paypal.cn)
3. 进入 **My Apps & Credentials** 页面

## 2. 获取 API 凭证

### 2.1 创建应用
1. 点击 **Create App**
2. 选择 **Default** environment
3. App Name: `BG Remover` (或你喜欢的名称)
4. 点击 Create

### 2.2 获取凭证
复制以下信息：
- **Client ID** → 用于前端 `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
- **Client Secret** → 用于后端 `PAYPAL_CLIENT_SECRET`

## 3. 配置 Webhook（可选，用于生产环境）

1. 在 App 设置中，点击 **Webhooks**
2. Add Webhook
3. Webhook URL: `https://your-domain.com/api/paypal/webhook`
4. 选择事件：
   - `PAYMENT.CAPTURE.COMPLETED`
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.EXPIRED`

## 4. 配置订阅计划（用于月付功能）

### 4.1 在 PayPal Dashboard 创建产品
1. 进入 **Catalog Products**
2. 点击 **Create Product**
3. 填写：
   - Name: `Pro Monthly` (等)
   - Type: `Service`
   - Category: `Software`

### 4.2 创建定价计划
1. 进入创建的产品的 **Pricing** 标签
2. 点击 **Create Pricing**
3. 选择 ** recurring billing**
4. 设置：
   - Billing type: `Monthly`
   - Amount: `$4.99 USD` (对应 ¥35 CNY)
   - Cycle: `Monthly`

## 5. 配置环境变量

### 5.1 GitHub Secrets
在 GitHub 仓库 Settings → Secrets 中添加：

| Secret Name | Value |
|-------------|-------|
| `PAYPAL_CLIENT_SECRET` | 你的 Client Secret |
| `PAYPAL_MODE` | `sandbox` 或 `production` |
| `CNY_TO_USD_RATE` | `0.14` (或当前汇率) |
| `PAYPAL_BUSINESS_EMAIL` | 你的收款邮箱 |

### 5.2 本地 .env 文件（开发用）
```bash
cp .env.example .env.local
# 编辑 .env.local 填入真实值
```

## 6. 沙箱测试

### 6.1 测试账号
在 https://developer.paypal.com/ 的 **Sandbox** → **Accounts` 中：
- 已有一个 Business 测试账号（收款方）
- 创建一个 Personal 测试账号（付款方）

### 6.2 测试流程
1. 用沙箱 Client ID 配置应用
2. 使用 Personal 测试账号登录 PayPal 完成支付
3. 观察 webhook 回调和数据库记录

### 6.3 切换到生产
1. 在 PayPal Dashboard 创建 Live 应用
2. 获取新的 Live Client ID 和 Secret
3. 更新 GitHub Secrets
4. 将 `PAYPAL_MODE` 改为 `production`

## 7. 汇率配置

当前汇率: `CNY × 0.14 = USD`

如需更新：
1. 修改 `CNY_TO_USD_RATE` 环境变量
2. 或使用实时汇率 API

## 8. 注意事项

### 沙箱 vs 生产
- 沙箱 API: `https://api-m.sandbox.paypal.com`
- 生产 API: `https://api-m.paypal.com`
- 前端 SDK: `https://www.paypal.com/sdk/js`

### 货币
- 前端显示: USD（PayPal 实际收款）
- 后端记录: CNY（原定价）和 USD（实际金额）

### 安全
- `PAYPAL_CLIENT_SECRET` 绝不能暴露到前端
- Webhook 回调应验证签名（生产环境）
- 所有金额在后端计算，前端仅用于显示
