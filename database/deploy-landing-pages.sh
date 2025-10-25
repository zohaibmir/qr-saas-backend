#!/bin/bash

# Landing Pages Service Database Schema Deployment
# This script deploys only the landing pages schema

set -e  # Exit on any error

echo "🎯 Starting Landing Pages Service Schema Deployment..."

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

# Apply landing pages schema
echo "🎯 Applying landing pages schema..."
$PSQL_CMD < database/landing-pages-schema.sql
echo "✅ Landing pages schema applied successfully"

# Verify deployment
echo "🔍 Verifying landing pages deployment..."
LANDING_TABLE_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'landing_page%';")

echo "📈 Landing Pages Deployment Summary:"
echo "   - Landing page tables created: $LANDING_TABLE_COUNT"
echo "   - Features: Page templates, A/B testing, forms, analytics"
echo "   - Components: Social sharing, custom domains, visitor tracking"

echo "🎉 Landing Pages Service schema deployment completed successfully!"