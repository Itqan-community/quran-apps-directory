# Quran Apps Directory

A comprehensive directory of Islamic applications, featuring app listings, reviews, and user favorites.

## 🏗️ Architecture

**Backend:** Django 5.2 + Django REST Framework
**Database:** PostgreSQL 15+
**Frontend:** Angular 19 (existing)
**Deployment:** Railway/Digital Ocean

## 📚 Documentation

- [**Architecture Overview**](ARCHITECTURE.md) - System design and tech stack
- [**Development Guide**](DEVELOPMENT.md) - Setup and development instructions
- [**Deployment Guide**](DEPLOYMENT.md) - Production deployment instructions
- [**Development Backlog**](BACKLOG.md) - User stories and development roadmap

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Git

### Setup Development Environment

```bash
# 1. Clone repository
git clone <repository-url>
cd quran-apps-directory

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment
cp .env.example .env
# Edit .env with your database and other settings

# 5. Setup database
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser

# 7. Run development server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/v1/`

## 📊 API Endpoints

### Public (No Authentication Required)
```
GET    /api/v1/apps              # List all apps
GET    /api/v1/apps/{id}         # Get app details
GET    /api/v1/apps/{id}/reviews # Get app reviews
GET    /api/v1/categories        # List categories
GET    /api/v1/developers        # List developers
GET    /api/v1/health            # Health check
```

### Authentication
```
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login
POST   /api/v1/auth/logout       # Logout
```

### User Features (Authentication Required)
```
GET    /api/v1/users/me          # Get user profile
GET    /api/v1/favorites         # Get user favorites
POST   /api/v1/favorites/{id}    # Add to favorites
```

## 🏛️ Project Structure

```
backend/
├── manage.py                    # Django management script
├── requirements.txt             # Python dependencies
├── .env.example                # Environment variables template
├── config/                     # Django configuration
│   ├── settings/               # Environment-specific settings
│   ├── urls.py                 # URL routing
│   └── wsgi.py                 # WSGI application
├── apps/                       # Django applications
│   ├── apps/                   # App management
│   ├── users/                  # User management
│   ├── categories/             # Category management
│   └── reviews/                # Review system
├── static/                     # Static files
├── media/                      # User uploads
└── tests/                      # Test files
```

## 🔧 Development

### Common Commands

```bash
# Development server
python manage.py runserver

# Database operations
python manage.py makemigrations     # Create migrations
python manage.py migrate           # Apply migrations
python manage.py dbshell           # Database shell

# Testing
python manage.py test              # Run tests
pytest                            # Run tests with pytest

# User management
python manage.py createsuperuser   # Create admin user
python manage.py changepassword   # Change password

# Static files
python manage.py collectstatic    # Collect static files
```

### Code Style

This project uses:
- **Black** for code formatting
- **flake8** for linting
- **pytest** for testing

### Testing

```bash
# Run all tests
python manage.py test

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

## 🚀 Deployment

### Railway (Recommended)
1. Push code to GitHub
2. Connect repository to Railway
3. Configure environment variables
4. Deploy automatically

### Digital Ocean (Droplet)
1. Create Ubuntu 22.04 droplet
2. Follow [Deployment Guide](DEPLOYMENT.md)
3. Use Docker Compose for easy deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] Static files collected
- [ ] SSL certificate installed
- [ ] Health check endpoint working
- [ ] Backup strategy implemented

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📋 Current Status

### ✅ Completed
- Frontend (Angular 19) - Hosted on Netlify
- Backend architecture designed
- Database schema defined
- API endpoints planned

### 🔄 In Progress
- Backend implementation (Django)
- User authentication system
- Core API endpoints
- Review system

### 📅 Planned
- Developer dashboard
- Collections feature
- Analytics system
- Advanced features

## 📞 Support

For questions or support:
- Create an issue on GitHub
- Review the [documentation](ARCHITECTURE.md)
- Check the [development guide](DEVELOPMENT.md)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Ready to start development?** Check out the [Development Guide](DEVELOPMENT.md) and [Backlog](BACKLOG.md) to get started!