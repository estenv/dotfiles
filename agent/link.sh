#!/usr/bin/env bash
set -euo pipefail

AGENT="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$AGENT" in
  pi)
    PROMPT_NAME="prompts"
    SKILL_NAME="skills"
    AGENT_DIR="$HOME/.pi/agent"
    ;;
  opencode)
    PROMPT_NAME="commands"
    SKILL_NAME="skills"
    AGENT_DIR="$HOME/.config/opencode"
    ;;
  *)
    echo "Usage: $0 {pi|opencode}" >&2
    exit 1
    ;;
esac

build_targets() {
  echo "$SCRIPT_DIR/prompts:$AGENT_DIR/$PROMPT_NAME"
  echo "$SCRIPT_DIR/skills:$AGENT_DIR/$SKILL_NAME"
  case "$AGENT" in
    pi) echo "$SCRIPT_DIR/pi-extensions:$AGENT_DIR/extensions" ;;
    opencode)
      echo "$SCRIPT_DIR/opencode-tools:$AGENT_DIR/tools"
      echo "$SCRIPT_DIR/opencode-plugins:$AGENT_DIR/plugins"
      ;;
  esac
}

# Pre-check: abort if any non-symlink target already exists
while IFS=: read -r src target; do
  if [[ -e "$target" && ! -L "$target" ]]; then
    echo "Error: $target already exists and is not a symlink, aborting" >&2
    exit 1
  fi
done < <(build_targets)

link_dir() {
  local src="$1"
  local target="$2"
  local parent
  parent="$(dirname "$target")"

  if [[ ! -d "$src" ]]; then
    echo "Error: source directory not found: $src" >&2
    return 1
  fi

  mkdir -p "$parent"

  if [[ -L "$target" ]]; then
    rm "$target"
  fi

  ln -s "$src" "$target"
  echo "Linked: $(basename "$src") -> $target"
}

while IFS=: read -r src target; do
  link_dir "$src" "$target"
done < <(build_targets)

echo "Done."
