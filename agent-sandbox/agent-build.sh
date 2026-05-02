#!/usr/bin/env bash
set -euo pipefail
IMAGE_NAME="${IMAGE_NAME:-agent-sandbox-runner}"
docker build -t "$IMAGE_NAME" -f Dockerfile .
