#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-agent-sandbox-runner}"
NETWORK_NAME="${NETWORK_NAME:-agent-sandbox-internal}"
REPOS_ROOT="${REPOS_ROOT:-$HOME/repos}"
STATE_ROOT="${STATE_ROOT:-$HOME/.agent-sessions}"
PROXY_URL="${PROXY_URL:-http://agent-egress-proxy:3128}"

HOST_CWD="$(pwd -P)"
REPOS_ROOT_ABS="$(cd "$REPOS_ROOT" && pwd -P)"

case "$HOST_CWD" in
  "$REPOS_ROOT_ABS"/*) ;;
  "$REPOS_ROOT_ABS") ;;
  *)
    echo "Current directory must be inside REPOS_ROOT: $REPOS_ROOT_ABS" >&2
    exit 1
    ;;
esac

REL_PATH="${HOST_CWD#"$REPOS_ROOT_ABS"}"
REL_PATH="${REL_PATH#/}"
CONTAINER_CWD="/repos"
if [[ -n "$REL_PATH" ]]; then
  CONTAINER_CWD="/repos/$REL_PATH"
fi

HOME_DIR="$STATE_ROOT/home"

mkdir -p \
  "$HOME_DIR" \
  "$STATE_ROOT/cache/yarn" \
  "$STATE_ROOT/cache/npm" \
  "$STATE_ROOT/cache/pip" \
  "$STATE_ROOT/cache/nuget" \
  "$STATE_ROOT/cache/dotnet" \
  "$STATE_ROOT/cache/uv"

CMD=(pi)
if [[ $# -gt 0 ]]; then
  CMD=("$@")
fi

docker run --rm -it \
  --user "$(id -u):$(id -g)" \
  --network "$NETWORK_NAME" \
  --security-opt no-new-privileges:true \
  --cap-drop ALL \
  --pids-limit 512 \
  --memory 8g \
  --cpus 6 \
  -e HOME=/home/agent \
  -e HTTP_PROXY="$PROXY_URL" \
  -e HTTPS_PROXY="$PROXY_URL" \
  -e ALL_PROXY="$PROXY_URL" \
  -e http_proxy="$PROXY_URL" \
  -e https_proxy="$PROXY_URL" \
  -e all_proxy="$PROXY_URL" \
  -e NO_PROXY="localhost,127.0.0.1,::1,agent-egress-proxy" \
  -e no_proxy="localhost,127.0.0.1,::1,agent-egress-proxy" \
  -e YARN_CACHE_FOLDER=/cache/yarn \
  -e npm_config_cache=/cache/npm \
  -e PIP_CACHE_DIR=/cache/pip \
  -e NUGET_PACKAGES=/cache/nuget \
  -e DOTNET_CLI_HOME=/cache/dotnet \
  -e UV_CACHE_DIR=/cache/uv \
  -e DOTNET_CLI_TELEMETRY_OPTOUT=1 \
  -e DOTNET_NOLOGO=1 \
  -v "$REPOS_ROOT_ABS:/repos:rw" \
  -v "$HOME_DIR:/home/agent:rw" \
  -v "$STATE_ROOT/cache/yarn:/cache/yarn:rw" \
  -v "$STATE_ROOT/cache/npm:/cache/npm:rw" \
  -v "$STATE_ROOT/cache/pip:/cache/pip:rw" \
  -v "$STATE_ROOT/cache/nuget:/cache/nuget:rw" \
  -v "$STATE_ROOT/cache/dotnet:/cache/dotnet:rw" \
  -v "$STATE_ROOT/cache/uv:/cache/uv:rw" \
  -w "$CONTAINER_CWD" \
  "$IMAGE_NAME" \
  "${CMD[@]}"
