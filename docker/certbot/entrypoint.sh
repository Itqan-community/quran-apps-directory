#!/bin/bash
# Certbot controller for DNS-01 issuance (Cloudflare) + renewal.
#   1. Writes /etc/cloudflare/cloudflare.ini from CF_DNS_API_TOKEN (chmod 600).
#   2. If no real cert exists for $DOMAIN (or only the nginx first-boot dummy
#      pair), clears it and issues via `certbot certonly --dns-cloudflare`.
#   3. Reloads nginx (docker exec) and then loops: `certbot renew` every 12h;
#      renewal success triggers the deploy hook, which reloads nginx.
# Env: DOMAIN, CF_DNS_API_TOKEN, ACME_EMAIL, NGINX_CONTAINER (default nginx),
#      STAGING=1 (optional — Let's Encrypt staging CA for dry runs).
set -eu

DOMAIN="${DOMAIN:?DOMAIN is required}"
CF_DNS_API_TOKEN="${CF_DNS_API_TOKEN:?CF_DNS_API_TOKEN is required}"
ACME_EMAIL="${ACME_EMAIL:?ACME_EMAIL is required}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx}"

CRED_DIR="/etc/cloudflare"
mkdir -p "$CRED_DIR"
printf 'dns_cloudflare_api_token = %s\n' "$CF_DNS_API_TOKEN" > "$CRED_DIR/cloudflare.ini"
chmod 600 "$CRED_DIR/cloudflare.ini"

LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"
RENEW_HOOKS="/etc/letsencrypt/renewal-hooks/deploy"
mkdir -p "$RENEW_HOOKS"

reload_nginx() {
  docker exec "$NGINX_CONTAINER" nginx -t && docker exec "$NGINX_CONTAINER" nginx -s reload
}

cat > "$RENEW_HOOKS/reload-nginx.sh" <<EOF
#!/bin/bash
docker exec $NGINX_CONTAINER nginx -t && docker exec $NGINX_CONTAINER nginx -s reload
EOF
chmod +x "$RENEW_HOOKS/reload-nginx.sh"

CERT_FLAGS=(--non-interactive --agree-tos --email "$ACME_EMAIL" \
  --dns-cloudflare --dns-cloudflare-credentials "$CRED_DIR/cloudflare.ini" \
  --dns-cloudflare-propagation-seconds 30)
[ "${STAGING:-0}" = "1" ] && CERT_FLAGS+=(--staging)

# Recognize-and-clear the first-boot dummy pair so certbot can issue cleanly.
if [ -f "${LIVE_DIR}/.dummy" ]; then
  echo "certbot: clearing first-boot dummy certificate for ${DOMAIN}"
  rm -rf "$LIVE_DIR" "/etc/letsencrypt/archive/${DOMAIN}" "/etc/letsencrypt/renewal/${DOMAIN}.conf"
fi

if [ ! -f "${LIVE_DIR}/fullchain.pem" ]; then
  DOMAINS=(-d "$DOMAIN")
  for extra in ${ADDITIONAL_DOMAINS:-}; do DOMAINS+=(-d "$extra"); done
  echo "certbot: issuing certificate for ${DOMAIN} (DNS-01)…"
  certbot certonly "${CERT_FLAGS[@]}" "${DOMAINS[@]}"
  reload_nginx
else
  echo "certbot: certificate already present for ${DOMAIN}"
fi

echo "certbot: entering renewal loop (every 12h)"
while :; do
  sleep 43200 &
  wait $! || true
  certbot renew --non-interactive || echo "certbot: renewal attempt failed; will retry"
done
