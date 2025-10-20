#!/bin/bash

# Quran Apps Directory - Development Starter Script
# This script sets up and starts the full development environment (Frontend + Backend + Database)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check Node.js
check_node() {
    if ! command_exists node; then
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

# Check npm
check_npm() {
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    print_status "npm version $(npm --version) detected ✓"
}

# Check Python
check_python() {
    if ! command_exists python3; then
        print_error "Python 3 is not installed. Please install Python 3.11 or higher."
        exit 1
    fi

    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    print_status "Python $PYTHON_VERSION detected ✓"
}

# Check Docker
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker Desktop."
        print_error "Visit: https://www.docker.com/products/docker-desktop/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi

    print_status "Docker is running ✓"
}

# Check Docker Compose
check_docker_compose() {
    if ! command_exists docker-compose && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose."
        exit 1
    fi

    if command_exists docker-compose; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi

    print_status "Docker Compose available ✓"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    if [ ! -d "node_modules" ]; then
        print_status "node_modules not found. Running npm install with legacy peer deps..."
        npm install --legacy-peer-deps
    else
        print_status "node_modules found. Checking for updates..."
        npm install --legacy-peer-deps
    fi
    print_status "Frontend dependencies installed ✓"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."

    # Check if backend directory exists
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found. Please ensure the backend has been created."
        exit 1
    fi

    cd backend

    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    # Activate virtual environment
    print_status "Activating virtual environment..."
    source venv/bin/activate

    # Install requirements
    print_status "Installing backend dependencies..."
    pip install -r requirements.txt

    cd ..
    print_status "Backend setup complete ✓"
}

# Start PostgreSQL in Docker
start_database() {
    print_status "Starting PostgreSQL in Docker..."

    cd backend

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.example .env
    fi

    # Start database
    if command_exists docker-compose; then
        docker-compose up -d db
    else
        docker compose up -d db
    fi

    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 5

    # Run migrations
    print_status "Running database migrations..."
    source venv/bin/activate
    python manage.py migrate

    # Check if sample data exists
    if ! python manage.py shell -c "from apps.models import App; print(App.objects.count())" 2>/dev/null | grep -q "0"; then
        print_status "Loading sample data..."
        python manage.py create_sample_data
    else
        print_status "Sample data already exists ✓"
    fi

    cd ..
    print_status "Database is ready ✓"
}

# Kill processes on ports
kill_ports() {
    # Kill process on port 4200 (Angular)
    print_status "Checking for processes on port 4200..."
    if command_exists lsof; then
        PIDS=$(lsof -ti:4200 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            print_warning "Found processes using port 4200. Terminating them..."
            echo "$PIDS" | xargs kill -9 2>/dev/null || true
            sleep 2
            print_status "Port 4200 cleared ✓"
        else
            print_status "Port 4200 is available ✓"
        fi
    fi

    # Kill process on port 8000 (Django)
    print_status "Checking for processes on port 8000..."
    if command_exists lsof; then
        PIDS=$(lsof -ti:8000 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            print_warning "Found processes using port 8000. Terminating them..."
            echo "$PIDS" | xargs kill -9 2>/dev/null || true
            sleep 2
            print_status "Port 8000 cleared ✓"
        else
            print_status "Port 8000 is available ✓"
        fi
    fi
}

# Start development servers
start_dev_servers() {
    # Clear ports first
    kill_ports

    echo -e "\n${CYAN}Starting all development servers...${NC}"
    echo ""

    # Start Django backend
    print_status "Starting Django backend server..."
    cd backend
    source venv/bin/activate
    python manage.py runserver 8000 &
    DJANGO_PID=$!
    cd ..

    # Wait a moment for Django to start
    sleep 3

    # Start Angular frontend
    print_status "Starting Angular frontend server..."
    npm start &
    ANGULAR_PID=$!

    # Wait a moment for Angular to start
    sleep 5

    echo ""
    echo -e "${GREEN}=== Servers are running! ===${NC}"
    echo -e "${CYAN}• Frontend (Angular):${NC} http://localhost:4200"
    echo -e "${CYAN}• Backend (Django API):${NC} http://localhost:8000/api/v1/"
    echo -e "${CYAN}• API Documentation:${NC} http://localhost:8000/api/docs/"
    echo ""
    print_status "Press Ctrl+C to stop all servers"
    echo ""

    # Open browser
    print_status "Opening browser in 3 seconds..."
    sleep 3
    if command_exists open; then
        # macOS
        open http://localhost:4200
    elif command_exists xdg-open; then
        # Linux
        xdg-open http://localhost:4200
    elif command_exists start; then
        # Windows
        start http://localhost:4200
    else
        print_warning "Could not auto-open browser. Please navigate to http://localhost:4200"
    fi

    # Wait for processes
    trap 'echo -e "\n${YELLOW}Stopping all servers...${NC}"; kill $DJANGO_PID $ANGULAR_PID 2>/dev/null; cd backend && source venv/bin/activate && docker-compose down; exit 0' INT

    # Wait for any process to exit
    wait
}

# Clean installation
clean_install() {
    print_warning "Cleaning previous installation..."

    # Clean frontend
    rm -rf node_modules package-lock.json
    npm cache clean --force

    # Clean backend
    if [ -d "backend/venv" ]; then
        rm -rf backend/venv
    fi

    # Stop and remove Docker containers
    if [ -d "backend" ]; then
        cd backend
        if command_exists docker-compose; then
            docker-compose down -v
        else
            docker compose down -v
        fi
        cd ..
    fi

    print_status "Clean complete ✓"
}

# Main execution
main() {
    print_header
    echo ""

    print_status "Starting full development environment setup..."
    echo ""

    # Run checks
    check_node
    check_npm
    check_python
    check_docker
    check_docker_compose
    echo ""

    # Handle command line arguments
    if [ "$1" = "--clean" ] || [ "$1" = "-c" ]; then
        clean_install
        echo ""
    fi

    # Install dependencies
    install_frontend_deps
    echo ""

    # Setup backend
    setup_backend
    echo ""

    # Start database
    start_database
    echo ""

    # Start servers
    start_dev_servers
}

# Show help
show_help() {
    echo "Quran Apps Directory - Full Stack Development Starter"
    echo ""
    echo "Usage: ./dev-start.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -c, --clean    Clean install (removes all dependencies and containers)"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Features:"
    echo "  • Starts PostgreSQL in Docker container"
    echo "  • Sets up Python virtual environment for backend"
    echo "  • Installs all dependencies (frontend + backend)"
    echo "  • Runs database migrations"
    echo "  • Loads sample data"
    echo "  • Starts both Angular (port 4200) and Django (port 8000) servers"
    echo "  • Opens browser automatically"
    echo "  • Handles port conflicts automatically"
    echo ""
    echo "Services Started:"
    echo "  • Frontend: http://localhost:4200"
    echo "  • Backend API: http://localhost:8000/api/v1/"
    echo "  • API Docs: http://localhost:8000/api/docs/"
    echo ""
    echo "Examples:"
    echo "  ./dev-start.sh           # Normal start"
    echo "  ./dev-start.sh --clean   # Clean install and start"
}

# Handle arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main "$1"