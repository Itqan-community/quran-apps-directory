#!/bin/bash

# Configure Netlify sites for branch-based deployments
# This script sets up automatic deployments based on Git branches

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Netlify configuration
NETLIFY_AUTH_TOKEN="nfp_4MyYc8AM4ctKbSmHYbsft4ejDanFtuSv6f95"
PROD_SITE_ID="7ceb3341-c3a5-49fc-b154-518c6884262a"
STAGING_SITE_ID="a5cb2dc3-7a98-4a91-b71e-d9d3d0c67a03"
DEV_SITE_ID="a4a10bc3-2550-4369-a944-200ed4c7ee27"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Branch Deployment Configuration${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Configure branch deployment for a site
configure_site_branches() {
    local site_id=$1
    local site_name=$2
    local branch=$3
    local config_file=$4
    
    print_status "Configuring $site_name for branch '$branch'..."
    
    # Set branch deploy configuration
    curl -X PATCH "https://api.netlify.com/api/v1/sites/${site_id}" \
        -H "Authorization: Bearer ${NETLIFY_AUTH_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"repo\": {
                \"branch\": \"${branch}\"
            },
            \"build_settings\": {
                \"cmd\": \"ng build --configuration=${site_name}\",
                \"dir\": \"dist/browser\"
            }
        }" \
        --silent --show-error > /dev/null
    
    echo "✅ $site_name configured for branch '$branch'"
}

# Main execution
main() {
    print_header
    echo ""
    
    print_status "Setting up branch-based deployments..."
    echo ""
    
    # Configure each site with its respective branch
    print_status "Configuring production site (main branch)..."
    configure_site_branches "$PROD_SITE_ID" "production" "main" "netlify.toml"
    
    print_status "Configuring staging site (staging branch)..."
    configure_site_branches "$STAGING_SITE_ID" "staging" "staging" "netlify-staging.toml"
    
    print_status "Configuring development site (develop branch)..."
    configure_site_branches "$DEV_SITE_ID" "development" "develop" "netlify-dev.toml"
    
    echo ""
    print_status "🎉 Branch deployment configuration completed!"
    echo ""
    print_warning "📋 Branch Deployment Strategy:"
    echo "  • main branch    → https://quran-apps.itqan.dev (Production)"
    echo "  • staging branch → https://staging.quran-apps.itqan.dev (Staging)"
    echo "  • develop branch → https://dev.quran-apps.itqan.dev (Development)"
    echo ""
    print_status "🚀 Automatic deployments are now enabled!"
    echo "Any push to these branches will trigger automatic deployment."
}

main "$@"
