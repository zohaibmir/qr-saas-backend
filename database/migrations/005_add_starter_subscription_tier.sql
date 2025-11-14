-- ===============================================
-- ADD STARTER SUBSCRIPTION TIER MIGRATION
-- Migration: 005_add_starter_subscription_tier
-- Date: 14 November 2025
-- ===============================================

-- Add the missing Starter tier to subscription_plans table
-- Based on optimized subscription tiers in development-instructions.md

INSERT INTO subscription_plans (name, price, currency, qr_limit, analytics_retention_days, features, is_active) 
VALUES (
    'Starter', 
    9.00, 
    'USD', 
    50, 
    30, 
    '{"customization": "advanced", "api_access": false, "team_features": false, "password_protection": true}',
    true
) 
ON CONFLICT (name) DO UPDATE SET 
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    qr_limit = EXCLUDED.qr_limit,
    analytics_retention_days = EXCLUDED.analytics_retention_days,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active;

-- Verify the insertion
SELECT 
    name, 
    price, 
    currency, 
    qr_limit, 
    analytics_retention_days, 
    features 
FROM subscription_plans 
WHERE name = 'Starter';

-- Show all subscription tiers ordered by price
SELECT 
    name, 
    price, 
    qr_limit, 
    analytics_retention_days 
FROM subscription_plans 
WHERE is_active = true 
ORDER BY price ASC;