# certbot/dns-cloudflare plus the docker CLI, so the renewal deploy hook can
# `docker exec` into the nginx container to reload certificates without any
# host cron job. Only this service mounts the docker socket.

FROM certbot/dns-cloudflare

# Alpine-based official certbot image → apk; docker-cli enables the deploy
# hook to `docker exec` into nginx for the reload.
RUN apk add --no-cache docker-cli

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
