#!/bin/bash

# QR SaaS Database Deployment Script
# This script initializes the complete database schema

set -e  # Exit on any error

echo "🚀 Starting QR SaaS Database Deployment..."

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

# Apply landing pages schema
echo "🎯 Applying landing pages schema..."
$PSQL_CMD < database/landing-pages-schema.sql
echo "✅ Landing pages schema applied successfully"

# Apply advanced analytics schema
echo "📊 Applying advanced analytics schema..."
$PSQL_CMD < database/advanced-analytics-schema.sql
echo "✅ Advanced analytics schema applied successfully"

# Verify deployment
echo "🔍 Verifying deployment..."
TABLE_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
VIEW_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';")

echo "📈 Deployment Summary:"
echo "   - Tables created: $TABLE_COUNT"
echo "   - Materialized views created: $VIEW_COUNT"
echo "   - Core features: QR codes, users, categories, basic analytics"
echo "   - Landing pages: Templates, A/B testing, forms, page analytics"
echo "   - Advanced analytics: Conversion tracking, heatmaps, real-time metrics"

echo "🎉 Database deployment completed successfully!"