#!/bin/bash

# Core QR SaaS Database Schema Deployment
# This script deploys only the core schema (users, QR codes, categories, etc.)

set -e  # Exit on any error

echo "📋 Starting Core QR SaaS Schema Deployment..."

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-qr_saas}
DB_USER=${DB_USER:-qr_user}

# Check if running in Docker
if [ -n "$DOCKER_POSTGRES_CONTAINER" ]; then
    PSQL_CMD="docker exec -i $DOCKER_POSTGRES_CONTAINER psql -U $DB_USER -d $DB_NAME"
    echo "📦 Using Docker container: $DOCKER_POSTGRES_CONTAINER"
else
    PSQL_CMD="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    echo "🔗 Connecting to PostgreSQL at $DB_HOST:$DB_PORT"
fi

# Apply core schema
echo "📋 Applying core database schema..."
$PSQL_CMD < database/init.sql
echo "✅ Core schema applied successfully"

# Verify deployment
echo "🔍 Verifying core deployment..."
CORE_TABLE_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name NOT LIKE 'landing_page%' AND table_name NOT LIKE 'conversion_%' AND table_name NOT LIKE 'heatmap_%' AND table_name NOT LIKE 'realtime_%' AND table_name NOT LIKE 'peak_time_%' AND table_name NOT LIKE 'analytics_%';")

echo "📈 Core Deployment Summary:"
echo "   - Core tables created: $CORE_TABLE_COUNT"
echo "   - Features: Users, QR codes, categories, scan analytics"
echo "   - Components: Subscriptions, file uploads, notifications"

echo "🎉 Core schema deployment completed successfully!"