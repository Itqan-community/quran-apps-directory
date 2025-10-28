#!/bin/bash
set -e

# Set non-interactive mode for apt
export DEBIAN_FRONTEND=noninteractive

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js 20.x from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install required packages
apt-get install -y \
    nodejs \
    nginx \
    curl \
    git \
    ufw \
    fail2ban \
    certbot \
    python3-certbot-nginx

# Install Angular CLI globally
npm install -g @angular/cli

# Create application user
useradd -m -s /bin/bash quranapp
usermod -aG www-data quranapp

# Create application directory
mkdir -p /var/www/quran-apps-frontend
chown quranapp:quranapp /var/www/quran-apps-frontend

# Switch to application user and set up the application
su - quranapp -c "
cd /var/www/quran-apps-frontend

# Clone the repository
git clone https://github.com/Itqan-community/quran-apps-directory.git .
git checkout develop

# Install Node.js dependencies
npm ci

# Build the Angular application
export NODE_OPTIONS=--max-old-space-size=4096
export NG_APP_API_BASE_URL=https://dev.api.quran-apps.itqan.dev/api
export NG_APP_SITE_DOMAIN=dev.quran-apps.itqan.dev
export NG_APP_ENABLE_DARK_MODE=true
export NG_APP_ENABLE_ANALYTICS=false
export NG_APP_FORCE_HTTPS=true
export NG_APP_ENABLE_SERVICE_WORKER=false

npm run build:prod
"

# Configure Nginx
cat > /etc/nginx/sites-available/quran-frontend << EOF
server {
    listen 80;
    server_name dev.quran-apps.itqan.dev;

    root /var/www/quran-apps-frontend/dist/browser;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Handle client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Enable Nginx site
ln -s /etc/nginx/sites-available/quran-frontend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Start services
systemctl enable nginx
systemctl start nginx

echo "Frontend Droplet setup complete!"
