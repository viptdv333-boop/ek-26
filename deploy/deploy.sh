#!/usr/bin/env bash
set -euo pipefail

VPS="root@85.198.82.136"
REMOTE_DIR="/opt/ek26"
DOMAIN="chat.fomo.broker"

echo "=== ЭК-26 Deploy ==="

# 1. Sync project to VPS
echo "📦 Syncing files..."
rsync -avz --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude .turbo \
  --exclude mobile \
  "$(dirname "$0")/../" \
  "$VPS:$REMOTE_DIR/"

# 2. Install nginx config (first time only)
echo "🔧 Checking nginx config..."
ssh "$VPS" "
  if [ ! -f /etc/nginx/sites-available/$DOMAIN ]; then
    cp $REMOTE_DIR/deploy/chat.fomo.broker.conf /etc/nginx/sites-available/$DOMAIN
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
    echo '✅ Nginx config installed'
    echo '⚠️  Run: certbot certonly --nginx -d $DOMAIN'
  else
    echo '✅ Nginx config already exists'
  fi
"

# 3. Build and start containers
echo "🐳 Building and starting containers..."
ssh "$VPS" "
  cd $REMOTE_DIR/deploy
  docker compose build
  docker compose up -d
  docker compose ps
"

# 4. Reload nginx
echo "🔄 Reloading nginx..."
ssh "$VPS" "nginx -t && systemctl reload nginx"

echo ""
echo "=== Deploy complete ==="
echo "🌐 https://$DOMAIN"
echo "❤️  Health: curl https://$DOMAIN/api/health"
