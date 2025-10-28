#!/bin/bash
# Run this script on the frontend Droplet (64.226.85.110)

# Install certbot if not already installed
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate for dev.quran-apps.itqan.dev
certbot --nginx -d dev.quran-apps.itqan.dev --email a.abduraghman@itqan.dev --agree-tos --non-interactive

# The certbot --nginx plugin should automatically update the Nginx configuration
# But let's verify and enhance the SSL configuration

# Update Nginx configuration with additional SSL settings
cat > /etc/nginx/sites-available/quran-frontend << EOF
server {
    listen 80;
    server_name dev.quran-apps.itqan.dev;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev.quran-apps.itqan.dev;

    ssl_certificate /etc/letsencrypt/live/dev.quran-apps.itqan.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.quran-apps.itqan.dev/privkey.pem;

    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/quran-apps-frontend/dist/browser;
    index index.html;

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

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Set up automatic certificate renewal
(crontab -l ; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "SSL setup complete for frontend!"
echo "Domain: https://dev.quran-apps.itqan.dev"
