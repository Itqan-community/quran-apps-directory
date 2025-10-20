# Quran Apps Directory - Backend API

A comprehensive bilingual (Arabic/English) REST API for the Quran Apps Directory, built with Django 5.2 and Django REST Framework.

## Technology Stack

- **Backend Framework:** Django 5.2 with Django REST Framework
- **Database:** PostgreSQL 15 (Docker for local development)
- **API Documentation:** drf-spectacular (OpenAPI/Swagger)
- **Authentication:** Django session authentication (JWT planned)
- **CORS:** django-cors-headers
- **File Storage:** Local file storage (S3 planned for production)

## Prerequisites

- Python 3.9+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd quran-apps-directory/backend
```

### 2. Set Up Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Start PostgreSQL with Docker

```bash
# Start PostgreSQL container in background
docker-compose up -d db

# Verify PostgreSQL is running
docker-compose ps
```

### 5. Set Up Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env file if needed (default values should work for local development)
```

### 6. Run Database Migrations

```bash
python manage.py migrate
```

### 7. Load Sample Data (Optional)

```bash
# Load sample data from frontend applicationsData.ts
python manage.py load_sample_data

# OR create minimal sample data
python manage.py create_sample_data
```

### 8. Start the Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:

- **Swagger UI:** `http://localhost:8000/api/docs/`
- **ReDoc:** `http://localhost:8000/api/redoc/`
- **OpenAPI Schema:** `http://localhost:8000/api/schema/`

## Docker Setup

### Docker Compose Services

The `docker-compose.yml` file includes:

- **PostgreSQL 15:** Database server running on port 5432
- **Optional Redis:** Uncomment in docker-compose.yml if caching is needed

### Database Configuration

The PostgreSQL container is configured with:
- **Database name:** `quran_apps_db`
- **Username:** `postgres`
- **Password:** `postgres123`
- **Port:** `5432` (mapped to host)

### Managing Docker Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f db

# Restart services
docker-compose restart
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Core Django settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL in Docker)
DB_NAME=quran_apps_db
DB_USER=postgres
DB_PASSWORD=postgres123
DB_HOST=localhost
DB_PORT=5432
USE_SQLITE=False
```

## Database Management

### Migrations

```bash
# Create migration files
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations
```

### Database Reset

```bash
# Reset database (WARNING: This deletes all data)
docker-compose down -v  # Remove database volume
docker-compose up -d db  # Start fresh database
python manage.py migrate  # Apply migrations
python manage.py load_sample_data  # Reload sample data
```

### Superuser Account

```bash
# Create admin user
python manage.py createsuperuser

# Access admin panel: http://localhost:8000/admin/
```

## Sample Data

### Load from Frontend Data

```bash
# Load comprehensive data from frontend applicationsData.ts
python manage.py load_sample_data
```

This command:
- Reads data from `../src/app/services/applicationsData.ts`
- Creates categories, developers, and applications
- Processes 100+ apps with bilingual data

### Create Minimal Sample Data

```bash
# Create minimal sample data for testing
python manage.py create_sample_data
```

This creates:
- 5 categories (Mushaf, Tafsir, Audio, Prayer Times, Azkar)
- 3 developers (Tafsir Center, Muslim Pro, Quran.com)
- 5 sample applications

## API Endpoints

### Applications
- `GET /api/v1/apps/` - List all applications
- `GET /api/v1/apps/{slug}/` - Get application details
- `GET /api/v1/apps/featured/` - Get featured applications

### Categories
- `GET /api/v1/categories/` - List all categories
- `GET /api/v1/categories/{slug}/` - Get category details
- `GET /api/v1/categories/{slug}/apps/` - Get apps in category

### Developers
- `GET /api/v1/developers/` - List all developers
- `GET /api/v1/developers/{slug}/` - Get developer details
- `GET /api/v1/developers/{slug}/apps/` - Get developer's apps

### Health Check
- `GET /api/v1/health/` - API health status

## Development Workflow

### 1. Before Starting Work

```bash
# Ensure Docker is running
docker --version
docker-compose --version

# Start database
docker-compose up -d db

# Activate virtual environment
source venv/bin/activate
```

### 2. Making Changes

```bash
# After model changes
python manage.py makemigrations
python manage.py migrate

# After adding new API endpoints
python manage.py test  # Run tests
python manage.py runserver  # Test manually
```

### 3. Cleaning Up

```bash
# Stop database
docker-compose down

# Deactivate virtual environment
deactivate
```

## Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps
python manage.py test categories
python manage.py test developers

# Run with verbose output
python manage.py test --verbosity=2
```

## Production Deployment

### Environment Setup

1. Set `DEBUG=False` in production
2. Configure production database
3. Set proper `SECRET_KEY`
4. Configure CORS origins
5. Set up static files serving

### Database Migration

```bash
# Production migrations
python manage.py migrate --settings=quran_apps.settings.production
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check database logs
docker-compose logs db

# Test database connection
python manage.py dbshell
```

### Migration Issues

```bash
# Check migration status
python manage.py showmigrations

# Reset migrations (last resort)
python manage.py migrate apps zero
python manage.py migrate
```

### Port Conflicts

If port 5432 is already in use:

1. Stop the conflicting service
2. Or modify the port mapping in `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Use port 5433 on host
   ```

3. Update `DB_PORT` in `.env` file accordingly

### Docker Issues

```bash
# Rebuild Docker containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Clean up Docker resources
docker system prune -a
```

## Development Tools

### Django Debug Toolbar

Install and configure for enhanced debugging:

```bash
# Install
pip install django-debug-toolbar

# Add to INSTALLED_APPS in local.py settings
# (Already configured to auto-detect if installed)
```

### Django Extensions

Useful management commands:

```bash
# Generate project diagram
python manage.py graph_models -a -o project_models.png

# Database shell
python manage.py dbshell

# Run server with enhanced debugging
python manage.py runserver_plus
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Email: connect@itqan.dev
- Website: https://quran-apps.itqan.dev