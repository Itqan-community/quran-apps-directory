#!/bin/bash

# GitHub Actions Secrets Setup Script
# This script helps you add the required secrets to your GitHub repository

echo "🔐 GitHub Actions Secrets Setup"
echo "================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if we're authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Please run: gh auth login"
    exit 1
fi

echo "📝 This script will help you set up GitHub secrets for the migration workflows."
echo ""

# Get the repository from current directory or user input
REPO=$(gh repo view --json nameWithOwner -q 2>/dev/null)
if [ -z "$REPO" ]; then
    read -p "Enter your GitHub repository (owner/repo): " REPO
fi

echo "🔗 Using repository: $REPO"
echo ""

# Function to add a secret
add_secret() {
    local name=$1
    local prompt=$2

    read -sp "$prompt (input hidden): " value
    echo ""

    if [ -n "$value" ]; then
        echo "gh secret set $name --repo $REPO"
        echo "$value" | gh secret set "$name" --repo "$REPO" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Secret '$name' added successfully"
        else
            echo "❌ Failed to add secret '$name'"
        fi
    else
        echo "⏭️  Skipped '$name' (empty value)"
    fi
    echo ""
}

# Development Environment
echo "═══════════════════════════════════════"
echo "🔧 Development Environment Secrets"
echo "═══════════════════════════════════════"
echo ""
read -p "Do you want to add development secrets? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    add_secret "SSH_HOST_DEV" "Development server hostname:"
    add_secret "SSH_USER_DEV" "Development SSH user (e.g., ubuntu):"
    add_secret "SSH_PRIVATE_KEY_DEV" "Development SSH private key (paste full key):"
fi

# Staging Environment
echo "═══════════════════════════════════════"
echo "🔧 Staging Environment Secrets"
echo "═══════════════════════════════════════"
echo ""
read -p "Do you want to add staging secrets? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    add_secret "SSH_HOST_STAGING" "Staging server hostname:"
    add_secret "SSH_USER_STAGING" "Staging SSH user (e.g., ubuntu):"
    add_secret "SSH_PRIVATE_KEY_STAGING" "Staging SSH private key (paste full key):"
fi

# Production Environment
echo "═══════════════════════════════════════"
echo "🔧 Production Environment Secrets"
echo "═══════════════════════════════════════"
echo ""
read -p "Do you want to add production secrets? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    add_secret "SSH_HOST_PROD" "Production server hostname:"
    add_secret "SSH_USER_PROD" "Production SSH user (e.g., ubuntu):"
    add_secret "SSH_PRIVATE_KEY_PROD" "Production SSH private key (paste full key):"
    add_secret "DB_HOST_PROD" "Production database host (for backups):"
    add_secret "DB_USER_PROD" "Production database user (for backups):"
fi

echo ""
echo "✅ Secrets setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify secrets are set: gh secret list --repo $REPO"
echo "2. Update server paths in workflows if needed"
echo "3. Push code to GitHub: git push origin develop"
echo "4. Monitor workflow: https://github.com/$REPO/actions"
echo ""
