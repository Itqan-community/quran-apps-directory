#!/bin/bash
# Run this script on the backend Droplet (164.92.135.218)

# Install certbot if not already installed
apt-get update
apt-get install -y certbot python3-certbot-nginx

# Stop Nginx temporarily for certificate issuance
systemctl stop nginx

# Get SSL certificate for dev.api.quran-apps.itqan.dev
certbot certonly --standalone -d dev.api.quran-apps.itqan.dev --email a.abduraghman@itqan.dev --agree-tos --non-interactive

# Start Nginx again
systemctl start nginx

# Configure Nginx to use SSL
cat > /etc/nginx/sites-available/quran-backend << EOF
server {
    listen 80;
    server_name dev.api.quran-apps.itqan.dev;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev.api.quran-apps.itqan.dev;

    ssl_certificate /etc/letsencrypt/live/dev.api.quran-apps.itqan.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.api.quran-apps.itqan.dev/privkey.pem;

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

    location = /favicon.ico { access_log off; log_not_found off; }

    location / {
        include proxy_params;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /static/ {
        alias /var/www/quran-apps-backend/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /health/ {
        include proxy_params;
        proxy_pass http://127.0.0.1:8000;
        access_log off;
    }
}
EOF

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

# Set up automatic certificate renewal
(crontab -l ; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "SSL setup complete for backend!"
echo "Domain: https://dev.api.quran-apps.itqan.dev"
