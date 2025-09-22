#!/bin/bash

# Quran Apps Directory - Development Starter Script
# This script sets up and starts the development environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
    echo -e "${BLUE}  Quran Apps Directory - Dev Setup${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js version 20 or higher."
        print_error "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_warning "Node.js version $NODE_VERSION detected. Recommended version is 20 or higher."
    else
        print_status "Node.js version $(node --version) detected ✓"
    fi
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    print_status "npm version $(npm --version) detected ✓"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    if [ ! -d "node_modules" ]; then
        print_status "node_modules not found. Running npm install with legacy peer deps..."
        npm install --legacy-peer-deps
    else
        print_status "node_modules found. Checking for updates..."
        npm install --legacy-peer-deps
    fi
    print_status "Dependencies installed ✓"
}

# Clean install if needed
clean_install() {
    print_warning "Cleaning previous installation..."
    rm -rf node_modules package-lock.json
    npm cache clean --force
    print_status "Installing fresh dependencies..."
    npm install --legacy-peer-deps
}

# Check Angular CLI
check_angular_cli() {
    if ! npx ng version &> /dev/null; then
        print_warning "Angular CLI not found locally. Using npx..."
    else
        print_status "Angular CLI available ✓"
    fi
}

# Kill processes on port 4200
kill_port_4200() {
    print_status "Checking for processes on port 4200..."
    
    # Find and kill processes using port 4200
    if command -v lsof &> /dev/null; then
        # Use lsof (available on macOS and Linux)
        PIDS=$(lsof -ti:4200 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            print_warning "Found processes using port 4200. Terminating them..."
            echo "$PIDS" | xargs kill -9 2>/dev/null || true
            sleep 2
            print_status "Port 4200 cleared ✓"
        else
            print_status "Port 4200 is available ✓"
        fi
    elif command -v netstat &> /dev/null; then
        # Fallback using netstat
        PID=$(netstat -tlnp 2>/dev/null | grep :4200 | awk '{print $7}' | cut -d'/' -f1 2>/dev/null || true)
        if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
            print_warning "Found process $PID using port 4200. Terminating..."
            kill -9 "$PID" 2>/dev/null || true
            sleep 2
            print_status "Port 4200 cleared ✓"
        else
            print_status "Port 4200 is available ✓"
        fi
    else
        print_warning "Cannot check port usage (lsof/netstat not available)"
    fi
}

# Start development server
start_dev_server() {
    # Clear port 4200 first
    kill_port_4200
    
    print_status "Starting development server..."
    print_status "The application will be available at: http://localhost:4200"
    print_status "Press Ctrl+C to stop the server"
    echo ""
    print_status "Opening browser in 3 seconds..."
    
    # Start the server in the background
    npm start &
    DEV_SERVER_PID=$!
    
    # Wait a moment and try to open browser
    sleep 3
    if command -v open &> /dev/null; then
        # macOS
        open http://localhost:4200
    elif command -v xdg-open &> /dev/null; then
        # Linux
        xdg-open http://localhost:4200
    elif command -v start &> /dev/null; then
        # Windows
        start http://localhost:4200
    else
        print_warning "Could not auto-open browser. Please navigate to http://localhost:4200"
    fi
    
    # Wait for the background process
    wait $DEV_SERVER_PID
}

# Main execution
main() {
    print_header
    echo ""
    
    print_status "Starting development environment setup..."
    echo ""
    
    # Run checks
    check_node
    check_npm
    check_angular_cli
    echo ""
    
    # Handle command line arguments
    if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
        clean_install
    else
        # Try normal install first
        if ! install_dependencies; then
            print_warning "Standard installation failed. Trying clean install..."
            clean_install
        fi
    fi
    echo ""
    
    # Start development server
    start_dev_server
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Development server stopped.${NC}"; exit 0' INT

# Show help
show_help() {
    echo "Quran Apps Directory - Development Starter"
    echo ""
    echo "Usage: ./dev-start.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -c, --clean    Clean install (removes node_modules and reinstalls)"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Features:"
    echo "  • Automatically kills any processes using port 4200"
    echo "  • Installs dependencies with legacy peer deps (Angular compatibility)"
    echo "  • Opens browser automatically when server is ready"
    echo "  • Handles dependency conflicts gracefully"
    echo ""
    echo "Examples:"
    echo "  ./dev-start.sh           # Normal development start"
    echo "  ./dev-start.sh --clean   # Clean install and start"
}

# Handle arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main "$1"
