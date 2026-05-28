#!/usr/bin/env bash
set -euo pipefail

AGENT="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$AGENT" in
  pi)
    PROMPT_TARGET="$HOME/.pi/agent/prompts"
    SKILL_TARGET="$HOME/.pi/agent/skills"
    ;;
  opencode)
    PROMPT_TARGET="$HOME/.config/opencode/commands"
    SKILL_TARGET="$HOME/.config/opencode/skills"
    ;;
  *)
    echo "Usage: $0 {pi|opencode}" >&2
    exit 1
    ;;
esac

link_dir() {
  local src_dir="$1"
  local target_dir="$2"

  if [[ ! -d "$src_dir" ]]; then
    echo "Error: source directory not found: $src_dir" >&2
    return 1
  fi

  mkdir -p "$target_dir"

  local count=0
  for file in "$src_dir"/*; do
    [[ -f "$file" ]] || continue
    local basename
    basename="$(basename "$file")"
    local link="$target_dir/$basename"

    if [[ -L "$link" ]]; then
      rm "$link"
    elif [[ -e "$link" ]]; then
      echo "Warning: $link exists and is not a symlink, skipping" >&2
      continue
    fi

    ln -s "$file" "$link"
    echo "Linked: $link -> $file"
    count=$((count + 1))
  done

  if [[ "$count" -eq 0 ]]; then
    echo "No files to link in $src_dir"
  else
    echo "Linked $count file(s) to $target_dir"
  fi
}

link_dir "$SCRIPT_DIR/prompts" "$PROMPT_TARGET"
link_dir "$SCRIPT_DIR/skills" "$SKILL_TARGET"

echo "Done."
