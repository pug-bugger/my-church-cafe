#!/usr/bin/env bash
#
# ONE-TIME server provisioning for church-cafe on the iv.lt VPS.
#
#   sudo DOMAIN=cafe.example.com \
#        DEPLOY_PUBKEY="ssh-ed25519 AAAA... github-actions-church-cafe" \
#        bash deploy/server-setup.sh
#
# This box already runs furniture-shop, so the script is deliberately ADDITIVE:
# it installs only what is missing, appends to authorized_keys rather than
# overwriting it, and never touches the furniture-shop nginx site, PM2 app or
# release directories. Every step is idempotent - safe to re-run.
#
# It provisions BOTH church-cafe processes (Next.js frontend + Express backend)
# because a single nginx site fronts them; see deploy/nginx.conf.

set -euo pipefail

DOMAIN="${DOMAIN:?set DOMAIN=cafe.example.com}"
DEPLOY_PUBKEY="${DEPLOY_PUBKEY:?set DEPLOY_PUBKEY to the PUBLIC half of the deploy key}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
FRONTEND_DIR="${FRONTEND_DIR:-/var/www/church-cafe-frontend}"
BACKEND_DIR="${BACKEND_DIR:-/var/www/church-cafe-backend}"
NODE_MAJOR="${NODE_MAJOR:-22}"
DB_NAME="${DB_NAME:-church_cafe_db}"
DB_USER="${DB_USER:-church_cafe}"

[ "$(id -u)" -eq 0 ] || { echo "run this as root (sudo)" >&2; exit 1; }
log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

log "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git nginx ufw openssl

log "Installing Node.js $NODE_MAJOR"
# Must match the Node major used by both GitHub Actions builds: the workflows
# ship a prebuilt node_modules / standalone bundle, so the runtime has to agree.
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
node -v

log "Installing PM2"
command -v pm2 >/dev/null || npm install -g pm2@latest

log "Installing MySQL"
if command -v mysqld >/dev/null || command -v mariadbd >/dev/null; then
  echo "    a MySQL/MariaDB server is already installed - leaving it alone"
else
  # mysql-server on Ubuntu; Debian ships MariaDB under this virtual package.
  apt-get install -y -qq mysql-server || apt-get install -y -qq default-mysql-server
fi
systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb 2>/dev/null || true

log "Creating $DEPLOY_USER user"
id -u "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"

log "Authorising the deploy key"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
AUTH="/home/$DEPLOY_USER/.ssh/authorized_keys"
touch "$AUTH"
# Append-only: furniture-shop's key is already in here and must keep working.
grep -qxF "$DEPLOY_PUBKEY" "$AUTH" || echo "$DEPLOY_PUBKEY" >> "$AUTH"
chmod 600 "$AUTH"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"

log "Creating the release directory layout"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" \
  "$FRONTEND_DIR" "$FRONTEND_DIR/releases" "$FRONTEND_DIR/logs" \
  "$BACKEND_DIR"  "$BACKEND_DIR/releases"  "$BACKEND_DIR/logs" \
  "$BACKEND_DIR/shared" \
  "$BACKEND_DIR/shared/uploads" \
  "$BACKEND_DIR/shared/uploads/products" \
  "$BACKEND_DIR/shared/uploads/users"

# ---------------------------------------------------------------------------
# Backend .env. Lives in shared/ and is symlinked into every release, so
# secrets never travel through git or the build artifact. Written once; a
# re-run leaves an existing file (and its JWT secret) untouched, because
# rotating JWT_SECRET would sign every logged-in user out.
# ---------------------------------------------------------------------------
log "Ensuring the database exists"
# Unconditional and idempotent, so a re-run still fixes a missing database even
# when .env is already in place. The credentials below are only touched when
# .env is written, since rewriting the password would invalidate the one the
# running app is using.
mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

ENV_FILE="$BACKEND_DIR/shared/.env"
DB_PASS_NOTE="(unchanged - .env already existed)"
if [ -f "$ENV_FILE" ]; then
  log "Backend .env already exists - leaving it and the DB user alone"
else
  log "Creating the database user and writing backend .env"
  DB_PASSWORD="$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-24)"
  JWT_SECRET="$(openssl rand -hex 48)"

  mysql --protocol=socket -uroot <<SQL
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

  cat > "$ENV_FILE" <<ENV
PORT=4000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# Both processes are served from one origin, so this is the only allowed one.
CORS_ORIGIN=https://$DOMAIN

UPLOAD_MAX_IMAGE_MB=15

# Network receipt printer (MUNBYN ITPP047P), raw TCP/IP on port 9100.
# Left unset on purpose: the printer sits on the church LAN and a public VPS
# cannot reach a 192.168.x.x address. Printing degrades gracefully - orders are
# still created and staff get a printer:unavailable socket event. To restore
# printing you need a tunnel/VPN back to the church network, then set the host.
PRINTER_HOST=
PRINTER_PORT=9100
ENV
  chmod 600 "$ENV_FILE"
  DB_PASS_NOTE="$DB_PASSWORD"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$BACKEND_DIR/shared"

log "Registering PM2 with systemd so the apps survive reboots"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER"

log "Installing the nginx site"
SITE=/etc/nginx/sites-available/church-cafe
if [ -f "$SITE" ]; then
  echo "    $SITE already exists - leaving it alone (certbot may have edited it)"
else
  sed "s/example\.com/$DOMAIN/g" "$(dirname "$0")/nginx.conf" > "$SITE"
  ln -sfn "$SITE" /etc/nginx/sites-enabled/church-cafe
fi
nginx -t && systemctl reload nginx

log "Configuring the firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
ufw status | sed 's/^/    /'

cat <<EOF

======================================================================
Server is ready for church-cafe. furniture-shop was not touched.

Database password for '$DB_USER'@'localhost':

    $DB_PASS_NOTE

It is already written into $ENV_FILE (mode 600). Copy it somewhere safe
now if you want it; it is not printed again.

Three things left:

1. Load the schema. From your Mac, in my-church-cafe-backend/:

     scp -r scripts $DEPLOY_USER@$DOMAIN:/tmp/cafe-sql

   then on this server, in order (see DEPLOY.md):

     mysql -u $DB_USER -p $DB_NAME < /tmp/cafe-sql/schema.sql
     ...and each migration_*.sql after it.

2. Point $DOMAIN's DNS A record at this server, then issue a
   certificate (this also sets up the HTTPS redirect and auto-renewal):

     sudo apt-get install -y certbot python3-certbot-nginx
     sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

   If www.$DOMAIN has no DNS record, drop that second -d (certbot fails
   the whole run if any name doesn't resolve) and remove www.$DOMAIN
   from server_name in /etc/nginx/sites-available/church-cafe.

3. Push to prod in both repos. GitHub Actions builds each app and runs
   its deploy/release.sh here.

Until the first deploy lands, current/ does not exist and nginx returns
502. That is expected.
======================================================================
EOF
