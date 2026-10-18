#!/bin/sh
# Certbot controller for DNS-01 issuance (Cloudflare) + renewal, with graceful
# degradation: issuance is always attempted when no real cert exists, and any
# failure (missing/empty token, API error, network) leaves nginx serving its
# first-boot self-signed pair while the loop retries every 12 h — HTTPS is
# never left without a certificate.
#   1. Writes /etc/cloudflare/cloudflare.ini from CF_DNS_API_TOKEN (chmod 600).
#   2. Issues via `certbot certonly --dns-cloudflare` when no real cert exists
#      (clearing the first-boot dummy pair first), then reloads nginx.
#   3. Loops: `certbot renew` every 12h; a successful renewal triggers the
#      deploy hook, which reloads nginx.
# POSIX sh on purpose: the certbot image is Alpine and ships no bash.
# Env: DOMAIN, CF_DNS_API_TOKEN, ACME_EMAIL, NGINX_CONTAINER (default nginx),
#      STAGING=1 (optional — Let's Encrypt staging CA for dry runs).
set -eu

DOMAIN="${DOMAIN:?DOMAIN is required}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx}"

# Fixed cert name → fixed paths (/etc/letsencrypt/live/app), so the nginx
# config and the dummy-cert script never depend on the domain. Certs persist in
# the bind-mounted ./certbot/letsencrypt between container runs.
CERT_NAME="app"
LIVE_DIR="/etc/letsencrypt/live/${CERT_NAME}"
RENEW_HOOKS="/etc/letsencrypt/renewal-hooks/deploy"
mkdir -p "$RENEW_HOOKS"

reload_nginx() {
  docker exec "$NGINX_CONTAINER" nginx -t && docker exec "$NGINX_CONTAINER" nginx -s reload
}

cat > "$RENEW_HOOKS/reload-nginx.sh" <<EOF
#!/bin/sh
docker exec $NGINX_CONTAINER nginx -t && docker exec $NGINX_CONTAINER nginx -s reload
EOF
chmod +x "$RENEW_HOOKS/reload-nginx.sh"

# Always attempt issuance if no real cert exists; any failure (missing/empty
# token, API/auth error, network) leaves nginx's self-signed pair in place and
# the loop retries every 12 h. Set the token and recreate this container to get
# a real certificate.
CRED_DIR="/etc/cloudflare"
mkdir -p "$CRED_DIR"
printf 'dns_cloudflare_api_token = %s\n' "${CF_DNS_API_TOKEN:-}" > "$CRED_DIR/cloudflare.ini"
chmod 600 "$CRED_DIR/cloudflare.ini"
[ -n "${CF_DNS_API_TOKEN:-}" ] || echo "certbot: CF_DNS_API_TOKEN is empty — issuance will fail; serving the self-signed pair until it is set."

# Recognize-and-clear the first-boot dummy pair so certbot can issue cleanly.
if [ -f "${LIVE_DIR}/.dummy" ]; then
  echo "certbot: clearing first-boot dummy certificate"
  rm -rf "$LIVE_DIR" "/etc/letsencrypt/archive/${CERT_NAME}" "/etc/letsencrypt/renewal/${CERT_NAME}.conf"
fi

# Domain args are plain names (no spaces), so a POSIX-expanded string is safe.
DOMAIN_ARGS="-d ${DOMAIN}"
for extra in ${ADDITIONAL_DOMAINS:-}; do DOMAIN_ARGS="$DOMAIN_ARGS -d $extra"; done
STAGING_FLAG=""
[ "${STAGING:-0}" = "1" ] && STAGING_FLAG="--staging"

echo "certbot: entering 12h loop (issue if missing, then renew)"
while :; do
  if [ ! -f "${LIVE_DIR}/fullchain.pem" ]; then
    echo "certbot: issuing certificate for ${DOMAIN} (DNS-01)…"
    if certbot certonly --non-interactive --agree-tos --email "${ACME_EMAIL:-ops@example.invalid}" \
        --cert-name "$CERT_NAME" $STAGING_FLAG \
        --dns-cloudflare --dns-cloudflare-credentials "$CRED_DIR/cloudflare.ini" \
        --dns-cloudflare-propagation-seconds 30 $DOMAIN_ARGS; then
      reload_nginx
      echo "certbot: certificate issued for ${DOMAIN}"
    else
      echo "certbot: issuance failed — HTTPS keeps serving the self-signed pair; retrying in 12 h"
    fi
  else
    certbot renew --non-interactive || echo "certbot: renewal attempt failed; will retry"
  fi
  sleep 43200 &
  wait $! || true
done
