#!/bin/bash

# Netlify Deployment Script for Quran Apps Directory
# Usage: ./deploy-netlify.sh [staging|production|dev]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Netlify PAT
NETLIFY_AUTH_TOKEN="nfp_4MyYc8AM4ctKbSmHYbsft4ejDanFtuSv6f95"

# Site configurations
PROD_SITE_ID="7ceb3341-c3a5-49fc-b154-518c6884262a"  # Existing production site
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

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Netlify Multi-Environment Deploy${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if Netlify CLI is installed
check_netlify_cli() {
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    print_status "Netlify CLI available ✓"
}

# Set up Netlify authentication
setup_auth() {
    print_status "Setting up Netlify authentication..."
    export NETLIFY_AUTH_TOKEN="$NETLIFY_AUTH_TOKEN"
    netlify status || netlify login --auth "$NETLIFY_AUTH_TOKEN"
}

# Create Netlify sites
create_sites() {
    print_status "Creating Netlify sites..."
    
    # Create staging site
    print_status "Creating staging site..."
    netlify sites:create --name "quran-apps-staging" --account-slug "itqan" || true
    
    # Create development site
    print_status "Creating development site..."
    netlify sites:create --name "quran-apps-dev" --account-slug "itqan" || true
    
    print_status "Sites created. Please update the site IDs in this script."
}

# Deploy to specific environment
deploy_environment() {
    local env=$1
    local config_file=""
    local build_command=""
    local site_id=""
    
    case $env in
        "production"|"prod")
            config_file="netlify.toml"
            build_command="npm run build:prod"
            site_id="$PROD_SITE_ID"
            print_status "Deploying to PRODUCTION (quran-apps.itqan.dev)..."
            ;;
        "staging"|"stage")
            config_file="netlify-staging.toml"
            build_command="npm run build:staging"
            site_id="$STAGING_SITE_ID"
            print_status "Deploying to STAGING (staging.quran-apps.itqan.dev)..."
            ;;
        "development"|"dev")
            config_file="netlify-dev.toml"
            build_command="npm run build:dev"
            site_id="$DEV_SITE_ID"
            print_status "Deploying to DEVELOPMENT (dev.quran-apps.itqan.dev)..."
            ;;
        *)
            print_error "Invalid environment. Use: production, staging, or development"
            exit 1
            ;;
    esac
    
    # Build the project
    print_status "Building project for $env environment..."
    $build_command
    
    # Deploy to Netlify
    if [ ! -z "$site_id" ]; then
        print_status "Deploying to Netlify..."
        netlify deploy --prod --dir=dist/browser --site="$site_id"
    else
        print_warning "Site ID not set. Using config file deployment..."
        cp "$config_file" "netlify.toml.bak"
        cp "$config_file" "netlify.toml"
        netlify deploy --prod --dir=dist/browser
        mv "netlify.toml.bak" "netlify.toml" 2>/dev/null || true
    fi
    
    print_status "✅ Deployment to $env completed!"
}

# Show help
show_help() {
    echo "Netlify Multi-Environment Deployment Script"
    echo ""
    echo "Usage: ./deploy-netlify.sh [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  deploy ENVIRONMENT    Deploy to specified environment"
    echo "  create-sites          Create Netlify sites"
    echo "  setup                 Initial setup (install CLI, auth, create sites)"
    echo "  help                  Show this help"
    echo ""
    echo "Environments:"
    echo "  production, prod      Deploy to quran-apps.itqan.dev"
    echo "  staging, stage        Deploy to staging.quran-apps.itqan.dev"
    echo "  development, dev      Deploy to dev.quran-apps.itqan.dev"
    echo ""
    echo "Examples:"
    echo "  ./deploy-netlify.sh setup"
    echo "  ./deploy-netlify.sh deploy staging"
    echo "  ./deploy-netlify.sh deploy production"
}

# Main execution
main() {
    print_header
    echo ""
    
    case $1 in
        "deploy")
            check_netlify_cli
            setup_auth
            deploy_environment "$2"
            ;;
        "create-sites")
            check_netlify_cli
            setup_auth
            create_sites
            ;;
        "setup")
            check_netlify_cli
            setup_auth
            create_sites
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
