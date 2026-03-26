-- Migration: Add payment transactions table for PayPal purchases
-- Run this to track all payment transactions

-- Transactions table
CREATE TABLE IF NOT EXISTS paypal_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  user_email TEXT,
  order_id TEXT,
  package_type TEXT NOT NULL,
  package_name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount_cny REAL NOT NULL,
  amount_usd REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  payer_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_user ON paypal_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_email ON paypal_transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON paypal_transactions(order_id);

-- Subscriptions table (for monthly plans)
CREATE TABLE IF NOT EXISTS paypal_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  user_email TEXT,
  plan_type TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  monthly_quota INTEGER NOT NULL,
  amount_cny REAL NOT NULL,
  status TEXT DEFAULT 'active',
  start_date TEXT,
  next_billing_date TEXT,
  cancelled_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON paypal_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON paypal_subscriptions(status);
