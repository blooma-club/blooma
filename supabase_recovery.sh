#!/bin/bash

# Supabase Database Recovery Script
# Make sure to set your credentials first:
# export PROJECT_REF="your-project-ref"
# export SUPABASE_ACCESS_TOKEN="your-access-token"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required environment variables are set
check_credentials() {
    if [ -z "$PROJECT_REF" ] || [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        echo -e "${RED}Error: Missing required environment variables${NC}"
        echo "Please set:"
        echo "  export PROJECT_REF=\"your-project-ref\""
        echo "  export SUPABASE_ACCESS_TOKEN=\"your-access-token\""
        echo ""
        echo "Get these from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/general"
        exit 1
    fi
}

# Function to list available backups
list_backups() {
    echo -e "${YELLOW}📋 Listing available backups...${NC}"
    
    curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups" | \
        jq '.' || echo "Failed to fetch backups or jq not installed"
}

# Function to convert date to Unix timestamp
date_to_unix() {
    local date_input="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        date -j -f "%Y-%m-%d %H:%M:%S" "$date_input" +%s
    else
        # Linux
        date -d "$date_input" +%s
    fi
}

# Function to perform PITR restore
restore_pitr() {
    local recovery_time="$1"
    
    if [ -z "$recovery_time" ]; then
        echo -e "${RED}Error: Recovery time required${NC}"
        echo "Usage: restore_pitr \"YYYY-MM-DD HH:MM:SS\""
        echo "Example: restore_pitr \"2024-01-01 12:00:00\""
        return 1
    fi
    
    # Convert to Unix timestamp
    local unix_time
    unix_time=$(date_to_unix "$recovery_time")
    
    echo -e "${YELLOW}🔄 Starting Point-in-Time Recovery...${NC}"
    echo "Recovery time: $recovery_time (Unix: $unix_time)"
    echo -e "${RED}⚠️  WARNING: This will replace your current database!${NC}"
    read -p "Are you sure? (yes/no): " -r
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups/restore-pitr" \
            -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"recovery_time_target_unix\": \"$unix_time\"}" | \
            jq '.' || echo "Restore request failed"
        
        echo -e "${GREEN}✅ Restore request submitted! Check your Supabase dashboard for progress.${NC}"
    else
        echo "Restore cancelled."
    fi
}

# Main script logic
case "${1:-help}" in
    "check")
        check_credentials
        echo -e "${GREEN}✅ Credentials are set correctly${NC}"
        ;;
    "list")
        check_credentials
        list_backups
        ;;
    "restore")
        check_credentials
        restore_pitr "$2"
        ;;
    "help"|*)
        echo "Supabase Recovery Tool"
        echo ""
        echo "Usage:"
        echo "  ./supabase_recovery.sh check                     - Check credentials"
        echo "  ./supabase_recovery.sh list                      - List available backups"
        echo "  ./supabase_recovery.sh restore \"YYYY-MM-DD HH:MM:SS\" - Restore to specific time"
        echo ""
        echo "Examples:"
        echo "  ./supabase_recovery.sh list"
        echo "  ./supabase_recovery.sh restore \"2024-01-01 10:30:00\""
        echo ""
        echo "Setup:"
        echo "  1. Get PROJECT_REF from: Supabase Dashboard > Settings > General"
        echo "  2. Get ACCESS_TOKEN from: Supabase Dashboard > Settings > Access Tokens"
        echo "  3. export PROJECT_REF=\"your-ref\""
        echo "  4. export SUPABASE_ACCESS_TOKEN=\"your-token\""
        ;;
esac
