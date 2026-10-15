#!/bin/sh
set -eu

ROOT="${CUSTOM_DOMAIN_HOST_DIR:-./custom-domains}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx}"
REQUEST="${ROOT}/reload.request"
STAMP="${ROOT}/.reloaded"

[ -f "$REQUEST" ] || exit 0

if [ ! -f "$STAMP" ] || [ "$REQUEST" -nt "$STAMP" ]; then
  docker exec "$NGINX_CONTAINER" nginx -t
  docker exec "$NGINX_CONTAINER" nginx -s reload
  touch "$STAMP"
fi
