#!/bin/bash
# Sourced by the official nginx image's entrypoint (scripts in
# /docker-entrypoint.d/*.sh are executed on container start).
# First-boot chicken-and-egg fix: if no Letsencrypt cert exists for the fixed
# cert name "app" yet, drop a 7-day self-signed pair at the exact paths the
# site config references, so nginx can bind 443 before certbot has ever run.
# A `.dummy` marker lets the certbot entrypoint recognize and clear the pair
# before its first real issuance. If a real cert is already present, this is a
# no-op (certs persist in ./certbot/letsencrypt between runs).
set -eu

LIVE_DIR="/etc/letsencrypt/live/app"
FULLCHAIN="${LIVE_DIR}/fullchain.pem"
PRIVKEY="${LIVE_DIR}/privkey.pem"

if [ -f "$FULLCHAIN" ] && [ ! -f "${LIVE_DIR}/.dummy" ]; then
  echo "self-signed-cert.sh: real certificate present, nothing to do"
  exit 0
fi

mkdir -p "$LIVE_DIR"
openssl req -x509 -nodes -newkey rsa:2048 -days 7 \
  -keyout "$PRIVKEY" -out "$FULLCHAIN" \
  -subj "/CN=${DOMAIN:-localhost}" >/dev/null 2>&1
touch "${LIVE_DIR}/.dummy"
echo "self-signed-cert.sh: temporary self-signed certificate written"
