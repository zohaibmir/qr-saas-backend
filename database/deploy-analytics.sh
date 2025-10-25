#!/bin/bash

# Advanced Analytics Service Database Schema Deployment
# This script deploys only the advanced analytics schema

set -e  # Exit on any error

echo "📊 Starting Advanced Analytics Schema Deployment..."

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

# Apply advanced analytics schema
echo "📊 Applying advanced analytics schema..."
$PSQL_CMD < database/advanced-analytics-schema.sql
echo "✅ Advanced analytics schema applied successfully"

# Verify deployment
echo "🔍 Verifying advanced analytics deployment..."
ANALYTICS_TABLE_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE 'conversion_%' OR table_name LIKE 'heatmap_%' OR table_name LIKE 'realtime_%' OR table_name LIKE 'peak_time_%' OR table_name LIKE 'analytics_%');")
VIEW_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';")

echo "📈 Advanced Analytics Deployment Summary:"
echo "   - Analytics tables created: $ANALYTICS_TABLE_COUNT"
echo "   - Materialized views created: $VIEW_COUNT"
echo "   - Features: Conversion tracking, heatmaps, real-time metrics"
echo "   - Components: Export jobs, alerts, WebSocket connections"

echo "🎉 Advanced Analytics schema deployment completed successfully!"