#!/usr/bin/env bash
set -euo pipefail

# deploy.sh - one-shot helper to configure Docker Mongo, install deps and restart pm2
# Edit the variables below or export them before running the script.

# CONFIGURE THESE
DOMAIN=${DOMAIN:-bvoxpro.tech}
MONGO_USER=${MONGO_USER:-admin}
MONGO_PASS=${MONGO_PASS:-StrongP@ssw0rd}
APP_DIR=${APP_DIR:-/var/www/bvoxpro.tech}

# Run from server as root or a sudoer
echo "Using APP_DIR=$APP_DIR, DOMAIN=$DOMAIN"

# Install Docker if missing
if ! command -v docker >/dev/null 2>&1; then
  apt update
  apt install -y docker.io docker-compose
  systemctl enable --now docker
fi

# Ensure app dir exists
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Pull latest code
git pull origin main || true

# Write .env (backup existing)
if [ -f .env ]; then mv .env .env.bak.$(date +%s); fi
cat > .env <<EOF
MONGO_URI=mongodb://${MONGO_USER}:${MONGO_PASS}@127.0.0.1:27017/bvoxpro?authSource=admin
PORT=3000
NODE_ENV=production
EOF

# Start Mongo via docker-compose
cp -n deploy/docker-compose.yml ./docker-compose.yml
export MONGO_INITDB_ROOT_USERNAME="$MONGO_USER"
export MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS"
docker compose up -d

# Install node deps
if [ -f package-lock.json ]; then
  npm ci --production
else
  npm install --production
fi

# Ensure pm2 installed and start app
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi
pm2 start app-server.js --name bvoxpro --update-env || pm2 restart bvoxpro --update-env
pm2 save

# nginx reload (assumes config already in /etc/nginx/sites-enabled)
if nginx -t >/dev/null 2>&1; then
  systemctl reload nginx || true
fi

echo "Deploy script finished. Check: pm2 status, pm2 logs bvoxpro, docker ps, and nginx error log if issues."