#!/bin/bash
# Sourced by the official nginx image's entrypoint (scripts in
# /docker-entrypoint.d/*.sh are executed on container start).
# First-boot chicken-and-egg fix: if no Letsencrypt cert exists for $DOMAIN
# yet, drop a 7-day self-signed pair at the exact paths the site config
# references, so nginx can bind 443 before certbot has ever run. A `.dummy`
# marker lets the certbot entrypoint recognize and clear the pair before its
# first real issuance.
set -eu

[ -n "${DOMAIN:-}" ] || { echo "10-dummy-cert.sh: DOMAIN not set, skipping"; exit 0; }

LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"
FULLCHAIN="${LIVE_DIR}/fullchain.pem"
PRIVKEY="${LIVE_DIR}/privkey.pem"

if [ -f "$FULLCHAIN" ] && [ ! -f "${LIVE_DIR}/.dummy" ]; then
  echo "10-dummy-cert.sh: real certificate present for ${DOMAIN}, nothing to do"
  exit 0
fi

mkdir -p "$LIVE_DIR"
openssl req -x509 -nodes -newkey rsa:2048 -days 7 \
  -keyout "$PRIVKEY" -out "$FULLCHAIN" \
  -subj "/CN=${DOMAIN}" >/dev/null 2>&1
touch "${LIVE_DIR}/.dummy"
echo "10-dummy-cert.sh: temporary self-signed certificate written for ${DOMAIN}"
