#!/usr/bin/env bash
set -euo pipefail
docker compose -f proxy-compose.yml up -d egress-proxy
