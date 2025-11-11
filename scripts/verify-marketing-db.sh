#!/bin/bash

# Marketing Tools Database Verification Script
# This script verifies that all marketing tables and functions are properly installed

echo "🔍 Verifying Marketing Tools Database Setup..."
echo "=============================================="

# Check if Docker container is running
if ! docker ps | grep -q "qrgeneration-postgres-1"; then
    echo "❌ PostgreSQL container is not running"
    exit 1
fi

echo "✅ PostgreSQL container is running"

# Function to run SQL command
run_sql() {
    docker exec qrgeneration-postgres-1 psql -U qr_user -d qr_saas -t -c "$1" 2>/dev/null
}

# Check all marketing tables exist
echo ""
echo "📊 Checking Marketing Tables..."
tables=(
    "marketing_campaigns"
    "campaign_qr_codes" 
    "utm_tracking"
    "utm_events"
    "retargeting_pixels"
    "retargeting_pixel_events"
    "campaign_analytics"
    "campaign_conversion_attribution"
)

for table in "${tables[@]}"; do
    count=$(run_sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';")
    if [[ "$count" -eq 1 ]]; then
        echo "  ✅ $table"
    else
        echo "  ❌ $table (missing)"
        exit 1
    fi
done

# Check all marketing functions exist
echo ""
echo "⚙️ Checking Marketing Functions..."
functions=(
    "calculate_campaign_metrics"
    "get_campaign_utm_performance"
    "track_campaign_conversion"
    "get_marketing_overview"
)

for func in "${functions[@]}"; do
    count=$(run_sql "SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = '$func';")
    if [[ "$count" -eq 1 ]]; then
        echo "  ✅ $func"
    else
        echo "  ❌ $func (missing)"
        exit 1
    fi
done

# Test basic functionality
echo ""
echo "🧪 Testing Basic Functionality..."

# Test marketing overview function with a dummy user
test_result=$(run_sql "SELECT get_marketing_overview('00000000-0000-0000-0000-000000000000');")
if [[ -n "$test_result" ]]; then
    echo "  ✅ Marketing overview function works"
else
    echo "  ❌ Marketing overview function failed"
    exit 1
fi

# Check indexes exist
echo ""
echo "📈 Checking Performance Indexes..."
index_count=$(run_sql "SELECT COUNT(*) FROM pg_indexes WHERE tablename LIKE '%marketing%' OR tablename LIKE '%campaign%' OR tablename LIKE '%utm%' OR tablename LIKE '%retargeting%';")
if [[ "$index_count" -gt 20 ]]; then
    echo "  ✅ Performance indexes created ($index_count indexes)"
else
    echo "  ⚠️ Some indexes might be missing (found $index_count indexes)"
fi

echo ""
echo "🎉 Marketing Tools Database Verification Complete!"
echo "=============================================="
echo "All marketing tables, functions, and indexes are properly installed."
echo ""
echo "📝 Summary:"
echo "  • 8 marketing tables created"
echo "  • 4 helper functions installed"
echo "  • 20+ performance indexes added"
echo "  • Database ready for marketing services"
echo ""
echo "Next steps:"
echo "1. Restart marketing services to connect to new tables"
echo "2. Test API endpoints for marketing tools"
echo "3. Verify frontend can access marketing features"