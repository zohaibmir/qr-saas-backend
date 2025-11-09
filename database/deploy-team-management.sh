#!/bin/bash

# Deploy Team Management Schema
# Phase 4A: Multi-user Organizations

echo "🚀 Deploying Team Management Schema..."

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-qr_saas}
DB_USER=${DB_USER:-qr_user}

# Deploy schema
echo "📋 Creating team management tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" -f team-management-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Team management schema deployed successfully!"
    echo ""
    echo "📊 Schema includes:"
    echo "   - organizations table"
    echo "   - organization_members table"
    echo "   - organization_invitations table"
    echo "   - QR codes team sharing extensions"
    echo "   - Performance indexes"
    echo "   - Helper functions for team management"
    echo ""
    echo "🎯 Ready for Phase 4A implementation!"
else
    echo "❌ Failed to deploy team management schema"
    exit 1
fi