#!/bin/bash

# Setup Netlify domains using API
# This script configures custom domains for staging and development environments

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Netlify configuration
NETLIFY_AUTH_TOKEN="nfp_4MyYc8AM4ctKbSmHYbsft4ejDanFtuSv6f95"
STAGING_SITE_ID="a5cb2dc3-7a98-4a91-b71e-d9d3d0c67a03"
DEV_SITE_ID="a4a10bc3-2550-4369-a944-200ed4c7ee27"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Add domain using Netlify API
add_domain() {
    local site_id=$1
    local domain=$2
    local site_name=$3
    
    print_status "Adding domain $domain to $site_name..."
    
    curl -X POST "https://api.netlify.com/api/v1/sites/${site_id}/domains" \
        -H "Authorization: Bearer ${NETLIFY_AUTH_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"${domain}\"}" \
        --silent --show-error
    
    echo ""
    print_status "✅ Domain $domain added to $site_name"
}

# Main execution
main() {
    echo "🌐 Setting up Netlify domains..."
    echo ""
    
    # Add staging domain
    add_domain "$STAGING_SITE_ID" "staging.quran-apps.itqan.dev" "staging site"
    echo ""
    
    # Add development domain
    add_domain "$DEV_SITE_ID" "dev.quran-apps.itqan.dev" "development site"
    echo ""
    
    print_status "🎉 Domain setup completed!"
    echo ""
    print_warning "⚠️  DNS Configuration Required:"
    echo "Please add the following DNS records to your domain provider:"
    echo ""
    echo "CNAME staging.quran-apps.itqan.dev → quran-apps-staging.netlify.app"
    echo "CNAME dev.quran-apps.itqan.dev → quran-apps-dev.netlify.app"
    echo ""
    echo "You can manage DNS at: https://app.netlify.com/teams/itqan/dns/quran-apps.itqan.dev"
}

main "$@"
