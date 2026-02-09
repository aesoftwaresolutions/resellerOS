#!/bin/bash
# ==============================================
# Hostinger VPS Setup Script
# Reseller Platform Backend
# Run as root on a fresh Ubuntu 22.04 VPS
# ==============================================

set -e

echo "=========================================="
echo "  Reseller Platform - VPS Setup"
echo "=========================================="

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw htop

# ---- Node.js 20 LTS ----
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js $(node -v) installed"

# ---- PM2 Process Manager ----
npm install -g pm2
pm2 install pm2-logrotate

# ---- PostgreSQL 16 ----
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16 postgresql-client-16

# Configure PostgreSQL
sudo -u postgres psql -c "CREATE USER reseller_admin WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE reseller_platform OWNER reseller_admin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reseller_platform TO reseller_admin;"
echo "PostgreSQL configured"

# ---- Redis ----
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
echo "Redis installed and running"

# ---- Firewall ----
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo "Firewall configured"

# ---- Nginx Reverse Proxy ----
cat > /etc/nginx/sites-available/reseller-api <<'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Increase upload size for images
    client_max_body_size 20M;
}
EOF

ln -sf /etc/nginx/sites-available/reseller-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "Nginx configured"

# ---- SSL (run after DNS is pointed) ----
echo ""
echo "After pointing DNS to this server, run:"
echo "  certbot --nginx -d api.yourdomain.com"

# ---- App Directory ----
mkdir -p /var/www/reseller-platform
chown -R $USER:$USER /var/www/reseller-platform

# ---- PM2 Ecosystem Config ----
cat > /var/www/reseller-platform/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [
    {
      name: 'reseller-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '500M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
EOF

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Update /var/www/reseller-platform/.env with your credentials"
echo "  2. Change the PostgreSQL password in this script and the .env"
echo "  3. cd /var/www/reseller-platform && npm install"
echo "  4. npm run migrate"
echo "  5. npm run seed"
echo "  6. pm2 start ecosystem.config.js"
echo "  7. pm2 save && pm2 startup"
echo "  8. Point DNS and run: certbot --nginx -d api.yourdomain.com"
echo ""
